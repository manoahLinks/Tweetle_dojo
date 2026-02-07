import { useState, useCallback } from 'react';

// TODO: Re-enable controller native module when integrating contracts
// import Controller, {
//   SessionAccount,
//   type SessionPolicy,
//   type Call,
// } from 'controller-native';
// import * as WebBrowser from 'expo-web-browser';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import 'react-native-get-random-values';
// import {
//   RPC_URL,
//   CARTRIDGE_API_URL,
//   KEYCHAIN_URL,
//   SESSION_POLICIES,
// } from '../constants';

export interface SessionMetadata {
  username?: string;
  address?: string;
  ownerGuid?: string;
  expiresAt?: number;
  sessionId?: string;
  appId?: string;
  isRevoked: boolean;
}

// Mock session manager for UI development.
// Swap this out with the real controller integration later.
export const useSessionManager = () => {
  const [sessionAccount, setSessionAccount] = useState<any>(null);
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata>({
    isRevoked: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!sessionAccount;

  // Mock connect - simulates a successful connection
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSessionAccount({ mock: true });
    setSessionMetadata({
      username: 'TweetlePlayer',
      address:
        '0x04a1d67bE42C9B6E7E1F3cBd3FBe6e5c8A9E3D7C1B4A0F2E6D8C0B3A5F7E9D',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      isRevoked: false,
    });
    setIsLoading(false);
  }, []);

  // Mock disconnect
  const disconnect = useCallback(() => {
    setSessionAccount(null);
    setSessionMetadata({ isRevoked: false });
    setError(null);
  }, []);

  // Mock transaction execution
  const executeTransaction = useCallback(
    async (
      contractAddress: string,
      entrypoint: string,
      calldata: string[],
    ) => {
      if (!sessionAccount) {
        setError('No session. Connect first.');
        return;
      }
      // TODO: implement with real controller
      return '0xmocktxhash';
    },
    [sessionAccount],
  );

  return {
    publicKey: '',
    isConnected,
    sessionAccount,
    sessionMetadata,
    isLoading,
    error,
    connect,
    disconnect,
    executeTransaction,
  };
};
