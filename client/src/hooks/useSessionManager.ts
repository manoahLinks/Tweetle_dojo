import { useState, useCallback } from 'react';

export interface SessionMetadata {
  username?: string;
  address?: string;
  ownerGuid?: string;
  expiresAt?: number;
  sessionId?: string;
  appId?: string;
  isRevoked: boolean;
}

// Mock session manager — swap with real controller integration after native build
export const useSessionManager = () => {
  const [sessionAccount, setSessionAccount] = useState<any>(null);
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata>({
    isRevoked: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!sessionAccount;

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSessionAccount({ mock: true });
    setSessionMetadata({
      username: 'TweetlePlayer',
      address: '0x04a1d67bE42C9B6E7E1F3cBd3FBe6e5c8A9E3D7C1B4A0F2E6D8C0B3A5F7E9D',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      isRevoked: false,
    });
    setIsLoading(false);
  }, []);

  const disconnect = useCallback(() => {
    setSessionAccount(null);
    setSessionMetadata({ isRevoked: false });
    setError(null);
  }, []);

  const executeTransaction = useCallback(
    async (
      contractAddress: string,
      entrypoint: string,
      calldata: string[]
    ): Promise<string | undefined> => {
      if (!sessionAccount) {
        setError('No session. Connect first.');
        return;
      }
      // TODO: replace with real controller executeFromOutside
      return '0xmocktxhash';
    },
    [sessionAccount]
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
