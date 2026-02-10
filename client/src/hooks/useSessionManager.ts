import { useState, useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
const REDIRECT_URI = 'tweetledojo://session';
const REDIRECT_QUERY_NAME = 'session';
const CHAIN_ID = '0x534e5f5345504f4c4941'; // SN_SEPOLIA

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

/** Decode the base64 session response from Cartridge redirect */
function decodeSessionResponse(encoded: string): {
  username: string;
  address: string;
  ownerGuid: string;
  expiresAt: string;
} {
  // Cartridge strips trailing '=' padding for Telegram compat — re-pad
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  const json = atob(padded);
  console.log('[Session] Decoded session data:', json);
  return JSON.parse(json);
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

  // Resolve function for the deep link promise — set during connect()
  const resolveDeepLink = useRef<((url: string) => void) | null>(null);

  const isConnected = !!sessionAccount;

  // Listen for deep link redirects from the Cartridge session page
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('[Session] Deep link received:', event.url);
      if (event.url.startsWith(REDIRECT_URI) && resolveDeepLink.current) {
        resolveDeepLink.current(event.url);
        resolveDeepLink.current = null;
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, []);

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

      // Build the session URL with redirect_uri so the browser comes back
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
        redirect_query_name: REDIRECT_QUERY_NAME,
      });
      const sessionUrl = `${CARTRIDGE_SESSION_URL}?${params.toString()}`;
      console.log('[Session] Opening URL:', sessionUrl);

      // Create a promise that resolves when the deep link fires
      const deepLinkPromise = new Promise<string>((resolve) => {
        resolveDeepLink.current = resolve;
      });

      // Open in-app browser — user approves, Cartridge redirects to our
      // deep link which fires the Linking listener above.
      console.log('[Session] Opening in-app browser...');
      WebBrowser.openBrowserAsync(sessionUrl, {
        dismissButtonStyle: 'cancel',
      });

      // Wait for the deep link redirect
      console.log('[Session] Waiting for session approval via redirect...');
      const redirectUrl = await deepLinkPromise;
      console.log('[Session] Got redirect:', redirectUrl);

      // Close the in-app browser
      WebBrowser.dismissBrowser();

      // Parse session data from the redirect URL
      const url = new URL(redirectUrl);
      const sessionParam = url.searchParams.get(REDIRECT_QUERY_NAME);
      if (!sessionParam) {
        throw new Error('No session data in redirect URL');
      }

      const sessionData = decodeSessionResponse(sessionParam);
      console.log('[Session] Session data:', {
        username: sessionData.username,
        address: sessionData.address,
        expiresAt: sessionData.expiresAt,
      });

      // Construct SessionAccount directly with the redirect data
      const session = new SessionAccount(
        RPC_URL,
        privateKey,
        sessionData.address,
        sessionData.ownerGuid,
        CHAIN_ID,
        policies,
        BigInt(sessionData.expiresAt)
      );
      console.log('[Session] SessionAccount created from redirect data');

      // Auto-register player on-chain using the Cartridge username
      const username = sessionData.username ?? 'Player';
      await ensurePlayerRegistered(session, username);

      setSessionAccount(session);
      setSessionMetadata({
        username: sessionData.username ?? undefined,
        address: sessionData.address,
        ownerGuid: sessionData.ownerGuid,
        expiresAt: Number(sessionData.expiresAt),
        isRevoked: false,
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
