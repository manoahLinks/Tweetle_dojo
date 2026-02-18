import { useEffect, useState } from 'react';
import { DojoProvider } from '@dojoengine/core';
import { Account, AccountInterface, RpcProvider } from 'starknet';
import { setupWorld } from './contracts.gen';
import {
  dojoConfig,
  KATANA_RPC_URL,
  MASTER_ADDRESS,
  MASTER_PRIVATE_KEY,
} from './dojoConfig';
import { stringToFelt } from './models';
import { fetchPlayer, pollPlayerRegistered } from './apollo';

const HARDCODED_USERNAME = 'tweetler';

export interface DojoContextValue {
  account: AccountInterface | null;
  address: string | null;
  client: ReturnType<typeof setupWorld> | null;
  isLoading: boolean;
  error: Error | null;
}

export function useDojo(): DojoContextValue {
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [client, setClient] = useState<ReturnType<typeof setupWorld> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const rpcProvider = new RpcProvider({ nodeUrl: KATANA_RPC_URL });

        const masterAccount = new Account({
          provider: rpcProvider,
          address: MASTER_ADDRESS,
          signer: MASTER_PRIVATE_KEY,
        });

        // BigInt → Number conversion is handled globally by
        // src/polyfills/bigint-number.ts (loaded in index.ts).
        //
        // Skip tip estimation — Katana has no fees and too few txs for
        // getEstimateTip to work (it scans blocks and warns on insufficient data).
        (masterAccount as any).resolveDetailsWithTip = async (details: any) => ({
          ...details,
          tip: details.tip ?? 0,
        });

        const dojoProvider = new DojoProvider(
          dojoConfig.manifest,
          KATANA_RPC_URL,
        );
        const worldClient = setupWorld(dojoProvider);

        setAccount(masterAccount);
        setClient(worldClient);

        // Auto-register player on local Katana with hardcoded username
        try {
          const existing = await fetchPlayer(masterAccount.address);
          if (!existing || !existing.is_registered) {
            console.log('[Dojo] Auto-registering player as:', HARDCODED_USERNAME);
            const usernameFelt = stringToFelt(HARDCODED_USERNAME);
            await worldClient.player_system.registerPlayer(
              masterAccount,
              usernameFelt,
              '0x0',
            );
            await pollPlayerRegistered(masterAccount.address);
            console.log('[Dojo] Player registered successfully');
          } else {
            console.log('[Dojo] Player already registered, skipping');
          }
        } catch (regErr) {
          console.warn('[Dojo] Auto-registration failed (may already be registered):', regErr);
        }
      } catch (err) {
        console.error('Failed to initialize Dojo:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  return { account, address: account?.address ?? null, client, isLoading, error };
}
