import { useState, useCallback } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import {
  SessionAccount,
  getPublicKey,
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

  // Check Torii first — skip if already registered
  const existing = await fetchPlayer(address);
  if (existing?.is_registered) {
    console.log('[Session] Player already registered, skipping');
    return;
  }

  console.log('[Session] Registering player:', username);
  try {
    session.execute([
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
    // Ignore "already registered" — race condition with Torii indexing
    if (!msg.includes('already') && !msg.includes('registered')) {
      throw e;
    }
    console.log('[Session] Player was already registered (caught)');
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

export interface SessionMetadata {
  username?: string;
  address?: string;
  ownerGuid?: string;
  expiresAt?: number;
  sessionId?: string;
  appId?: string;
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

      const policies = buildPolicies();

      // Build the session URL for the Cartridge approval page
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
      });
      const sessionUrl = `${CARTRIDGE_SESSION_URL}?${params.toString()}`;
      console.log('[Session] Opening URL:', sessionUrl);

      // Open in the system browser
      console.log('[Session] Opening system browser...');
      await Linking.openURL(sessionUrl);

      console.log('[Session] Calling createFromSubscribe...');
      // This blocks until the user approves the session in the browser
      const session = SessionAccount.createFromSubscribe(
        privateKey,
        policies,
        RPC_URL,
        CARTRIDGE_API_URL
      );
      console.log('[Session] Session created successfully');

      // Auto-register player on-chain using the Cartridge username
      const username = session.username() ?? 'Player';
      await ensurePlayerRegistered(session, username);

      setSessionAccount(session);
      setSessionMetadata({
        username: session.username() ?? undefined,
        address: session.address(),
        ownerGuid: session.ownerGuid(),
        expiresAt: Number(session.expiresAt()),
        sessionId: session.sessionId() ?? undefined,
        appId: session.appId() ?? undefined,
        isRevoked: session.isRevoked(),
      });
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error('[Session] Error:', msg, e);
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
