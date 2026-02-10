import React, { createContext, useContext, useMemo } from 'react';
import { setupWorld } from './contracts.gen';
import { useSession } from '../hooks/SessionContext';

type Client = ReturnType<typeof setupWorld>;

interface DojoContextValue {
  client: Client;
}

const DojoContext = createContext<DojoContextValue | null>(null);

export function DojoContextProvider({ children }: { children: React.ReactNode }) {
  const { sessionAccount } = useSession();

  const value = useMemo<DojoContextValue | null>(() => {
    if (!sessionAccount) return null;
    const client = setupWorld(sessionAccount);
    return { client };
  }, [sessionAccount]);

  // Always render children — screens gate on isConnected
  // DojoContext will be null until session is connected
  return (
    <DojoContext.Provider value={value}>{children}</DojoContext.Provider>
  );
}

export function useDojo(): DojoContextValue {
  const ctx = useContext(DojoContext);
  if (!ctx) {
    throw new Error('useDojo must be used within DojoContextProvider with an active session');
  }
  return ctx;
}
