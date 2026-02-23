import { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { DojoProvider as DojoSdkProvider } from '@dojoengine/core';
import { setupWorld } from '../dojo/contracts.gen';
import { dojoConfig } from '../dojo/dojoConfig';
import { RPC_URL } from '../env';
import { useWallet } from './WalletProvider';
import { fetchPlayer, pollPlayerRegistered } from '../dojo/apollo';
import { stringToFelt } from '../dojo/models';

type WorldClient = ReturnType<typeof setupWorld>;

interface DojoContextValue {
  client: WorldClient | null;
  account: ReturnType<typeof useWallet>['account'];
  address: string | null;
}

const DojoContext = createContext<DojoContextValue | null>(null);

const ZERO_ADDRESS = '0x0';

export function DojoProvider({ children }: { children: React.ReactNode }) {
  const { account, address, username } = useWallet();
  const registering = useRef(false);

  const client = useMemo(() => {
    try {
      const provider = new DojoSdkProvider(dojoConfig.manifest, RPC_URL);
      return setupWorld(provider);
    } catch (e) {
      console.error('[DojoProvider] Failed to initialize:', e);
      return null;
    }
  }, []);

  // Auto-register player after wallet connection
  useEffect(() => {
    if (!client || !account || !address || registering.current) return;

    let cancelled = false;

    async function autoRegister() {
      registering.current = true;
      try {
        const player = await fetchPlayer(address!);
        if (player?.is_registered) return;

        // Use Cartridge username, fall back to truncated address
        const name = username || address!.slice(0, 10);
        const usernameFelt = stringToFelt(name);

        await client!.player_system.registerPlayer(account, usernameFelt, ZERO_ADDRESS);
        if (!cancelled) {
          await pollPlayerRegistered(address!);
        }
        console.log('[DojoProvider] Player auto-registered:', name);
      } catch (err: any) {
        // Silently ignore — player may already be registered or tx may fail
        console.warn('[DojoProvider] Auto-registration skipped:', err.message);
      } finally {
        registering.current = false;
      }
    }

    autoRegister();
    return () => { cancelled = true; };
  }, [client, account, address, username]);

  return (
    <DojoContext.Provider value={{ client, account, address }}>
      {children}
    </DojoContext.Provider>
  );
}

export function useDojo() {
  const ctx = useContext(DojoContext);
  if (!ctx) throw new Error('useDojo must be used within DojoProvider');
  return ctx;
}
