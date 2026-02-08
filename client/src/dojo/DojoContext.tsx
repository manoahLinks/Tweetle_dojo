import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, RpcProvider } from 'starknet';
import { DojoProvider } from '@dojoengine/core';
import { setupWorld } from './contracts.gen';
import {
  dojoConfig,
  KATANA_RPC_URL,
  MASTER_ADDRESS,
  MASTER_PRIVATE_KEY,
} from './dojoConfig';

type Client = ReturnType<typeof setupWorld>;

interface DojoContextValue {
  account: Account;
  client: Client;
}

const DojoContext = createContext<DojoContextValue | null>(null);

export function DojoContextProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<DojoContextValue | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const rpcProvider = new RpcProvider({ nodeUrl: KATANA_RPC_URL });

      const account = new Account({
        provider: rpcProvider,
        address: MASTER_ADDRESS,
        signer: MASTER_PRIVATE_KEY,
      });

      const dojoProvider = new DojoProvider(dojoConfig.manifest, KATANA_RPC_URL);
      const client = setupWorld(dojoProvider);

      setValue({ account, client });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  if (error) {
    console.error('Dojo init error:', error);
  }

  if (!value) return null;

  return (
    <DojoContext.Provider value={value}>{children}</DojoContext.Provider>
  );
}

export function useDojo(): DojoContextValue {
  const ctx = useContext(DojoContext);
  if (!ctx) {
    throw new Error('useDojo must be used within DojoContextProvider');
  }
  return ctx;
}
