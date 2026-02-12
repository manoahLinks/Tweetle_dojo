import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import {
  SessionAccount,
  getPublicKey,
  signerToGuid,
  type SessionAccountInterface,
  type SessionPolicies,
  isNativeModuleAvailable,
} from '../../modules/controller/src';
import {
  RPC_URL,
  CARTRIDGE_API_URL,
  SESSION_POLICIES,
  PLAYER_SYSTEM_CONTRACT,
} from '../constants';
import { fetchPlayer, pollPlayerRegistered } from '../dojo/torii';

const STORAGE_KEY = '@tweetle/session_private_key';
const CARTRIDGE_SESSION_URL = 'https://x.cartridge.gg/session';
const REDIRECT_URI = 'tweetledojo://session';
const SN_SEPOLIA = '0x534e5f5345504f4c4941';

function stringToFelt(s: string): string {
  let val = BigInt(0);
  for (let i = 0; i < s.length; i++) {
    val = val * BigInt(256) + BigInt(s.charCodeAt(i));
  }
  return '0x' + val.toString(16);
}

/** Register player on-chain if not already registered. Silent no-op if already exists. */
async function ensurePlayerRegistered(
  session: SessionAccountInterface,
  username: string
): Promise<void> {
  const address = session.address();

  const existing = await fetchPlayer(address);
  if (existing?.is_registered) {
    console.log('[Session] Player already registered, skipping');
    return;
  }

  console.log('[Session] Registering player:', username);
  try {
    session.executeFromOutside([
      {
        contractAddress: PLAYER_SYSTEM_CONTRACT,
        entrypoint: 'register_player',
        calldata: [stringToFelt(username), '0x0'],
      },
    ]);
    await pollPlayerRegistered(address);
    console.log('[Session] Player registered successfully');
  } catch (e: any) {
    const msg = (e?.message || '').toLowerCase();
    if (msg.includes('session/not-registered')) throw e;
    if (msg.includes('already') || (msg.includes('player') && msg.includes('registered'))) {
      console.log('[Session] Player was already registered (caught)');
      return;
    }
    throw e;
  }
}

function buildPolicies(): SessionPolicies {
  return {
    policies: SESSION_POLICIES,
    maxFee: '0x0',
  };
}

async function getOrCreatePrivateKey(): Promise<string> {
  let key = await AsyncStorage.getItem(STORAGE_KEY);
  if (key) return key;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  key =
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  await AsyncStorage.setItem(STORAGE_KEY, key);
  return key;
}

/** Call subscribeCreateSession via JavaScript fetch (long-polls until session created). */
async function subscribeSessionFromJS(
  sessionKeyGuid: string
): Promise<{
  authorization: string[];
  address: string;
  username: string;
  chainId: string;
  expiresAt: string;
  ownerGuid: string;
}> {
  console.log('[Session] JS subscription: calling subscribeCreateSession...');
  console.log('[Session] sessionKeyGuid:', sessionKeyGuid);

  const resp = await fetch(`${CARTRIDGE_API_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query SubscribeSession($guid: Felt!) {
        subscribeCreateSession(sessionKeyGuid: $guid) {
          authorization
          expiresAt
          chainID
          controller {
            address
            constructorCalldata
            account {
              username
            }
          }
        }
      }`,
      variables: { guid: sessionKeyGuid },
    }),
  });

  const json = await resp.json();
  console.log('[Session] JS subscription response:', JSON.stringify(json));

  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const session = json.data.subscribeCreateSession;
  const address = session.controller.address;
  const username = session.controller.account?.username ?? 'Player';
  const chainId = session.chainID;
  const expiresAt = String(session.expiresAt);
  const authorization = session.authorization;

  // The ownerGuid is typically the first element of constructorCalldata
  // (it's the class_hash or owner credential stored at deployment)
  const calldata = session.controller.constructorCalldata;
  let ownerGuid = '0x0';
  if (calldata && calldata.length > 0) {
    ownerGuid = calldata[0];
  }

  console.log('[Session] JS subscription got session:');
  console.log('[Session]   address:', address);
  console.log('[Session]   username:', username);
  console.log('[Session]   chainId:', chainId);
  console.log('[Session]   expiresAt:', expiresAt);
  console.log('[Session]   authorization length:', authorization.length);
  console.log('[Session]   ownerGuid (from calldata):', ownerGuid);

  return { authorization, address, username, chainId, expiresAt, ownerGuid };
}

export interface SessionMetadata {
  username?: string;
  address?: string;
  ownerGuid?: string;
  expiresAt?: number;
  isRevoked: boolean;
}

export const useSessionManager = () => {
  const [sessionAccount, setSessionAccount] =
    useState<SessionAccountInterface | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata>({
    isRevoked: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState('');

  const isConnected = !!sessionAccount;

  const connect = useCallback(async () => {
    if (!isNativeModuleAvailable) {
      setError(
        'Controller native module not available. Run a native build first.'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const privateKey = await getOrCreatePrivateKey();
      console.log('[Session] Private key obtained');

      const pubKey = getPublicKey(privateKey);
      console.log('[Session] Public key:', pubKey);
      setPublicKey(pubKey);

      // Compute session key GUID from public key
      const sessionKeyGuid = signerToGuid(pubKey);
      console.log('[Session] Session key GUID:', sessionKeyGuid);

      const policies = buildPolicies();

      // Build session URL for the browser
      const policiesParam = JSON.stringify(
        policies.policies.map((p) => ({
          target: p.contractAddress,
          method: p.entrypoint,
        }))
      );

      const params = new URLSearchParams({
        public_key: pubKey,
        policies: policiesParam,
        rpc_url: RPC_URL,
        redirect_uri: REDIRECT_URI,
      });
      const sessionUrl = `${CARTRIDGE_SESSION_URL}?${params.toString()}`;

      // Start the JS-side GraphQL subscription (long-polls until session created).
      // This replaces the Rust createFromSubscribe which fails with connection
      // reset on Android. JavaScript's fetch uses Android's native HTTP stack
      // which handles DNS and TLS properly.
      const subscribePromise = subscribeSessionFromJS(sessionKeyGuid);

      // Open browser for the user to approve the session.
      console.log('[Session] Opening browser for session approval...');
      WebBrowser.openBrowserAsync(sessionUrl, {
        dismissButtonStyle: 'cancel',
      });

      // Wait for the JS subscription to return session data.
      const sessionData = await subscribePromise;
      console.log('[Session] Session data received from JS subscription!');

      // Close browser now that we have the session
      WebBrowser.dismissBrowser();

      // Determine ownerGuid: from GraphQL constructorCalldata or compute from redirect
      let ownerGuid = sessionData.ownerGuid;
      const chainId = sessionData.chainId || SN_SEPOLIA;
      const expiresAt = BigInt(sessionData.expiresAt);

      console.log('[Session] Creating SessionAccount...');
      console.log('[Session]   address:', sessionData.address);
      console.log('[Session]   ownerGuid:', ownerGuid);
      console.log('[Session]   chainId:', chainId);
      console.log('[Session]   expiresAt:', expiresAt.toString());

      // Create SessionAccount from the data we got.
      // If subscribeCreateSession triggered on-chain registration, executeFromOutside
      // will work because is_session_registered returns true.
      const session = new SessionAccount(
        RPC_URL,
        privateKey,
        sessionData.address,
        ownerGuid,
        chainId,
        policies,
        expiresAt
      );
      console.log('[Session] SessionAccount created!');

      const address = session.address();
      const username = sessionData.username;
      console.log('[Session] Address:', address, 'Username:', username);

      // Auto-register player on-chain
      await ensurePlayerRegistered(session, username);

      setSessionAccount(session);
      setSessionMetadata({
        username,
        address,
        ownerGuid,
        expiresAt: Number(expiresAt),
        isRevoked: false,
      });
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error('[Session] Error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setSessionAccount(null);
    setSessionMetadata({ isRevoked: false });
    setPublicKey('');
    setError(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    publicKey,
    isConnected,
    sessionAccount,
    sessionMetadata,
    isLoading,
    error,
    connect,
    disconnect,
  };
};
