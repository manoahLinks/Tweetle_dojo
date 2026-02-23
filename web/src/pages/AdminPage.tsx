import { useState, useCallback } from 'react';
import { useDojo } from '../providers/DojoProvider';
import { useWallet } from '../providers/WalletProvider';
import {
  createTournament as proverCreateTournament,
  registerTournament,
  revealTournament,
} from '../services/proverApi';
import { fetchTournaments } from '../dojo/apollo';

export function AdminPage() {
  const { client } = useDojo();
  const { account } = useWallet();

  // Create tournament state
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);

  // Activate tournament state
  const [activateId, setActivateId] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // End tournament state
  const [endId, setEndId] = useState('');
  const [isEnding, setIsEnding] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setCreateResult(null);
  };

  const handleCreate = useCallback(async () => {
    if (!account || !client) {
      setError('Please connect your wallet first');
      return;
    }
    clearMessages();
    setIsCreating(true);
    try {
      // 1. Get commitment from prover server
      const proverResult = await proverCreateTournament();

      // 2. Create tournament on-chain
      // create_tournament(commitment, entry_fee: u256, max_players, start_time, end_time)
      // u256 is split into (low, high) — entry_fee = 0 for free tournaments
      const now = Math.floor(Date.now() / 1000);
      await client.tournament_manager.createTournament(
        account,
        proverResult.commitment,
        0,                      // entry_fee (u256, Dojo handles split)
        Number(maxPlayers),
        now,                    // start_time (now)
        now + 86400,            // end_time (24h from now)
      );

      // 3. Poll Torii until the new tournament (matching commitment) is indexed
      // Noir computes on BN254 (254-bit) but Starknet stores as felt252.
      // The on-chain value = commitment % STARK_PRIME.
      const STARK_PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n;
      const commitmentFelt = BigInt(proverResult.commitment) % STARK_PRIME;
      let tid: number | null = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        const tournaments = await fetchTournaments(20);
        const match = tournaments.find((t) => {
          try {
            return BigInt(t.solution_commitment) === commitmentFelt;
          } catch {
            return false;
          }
        });
        if (match) {
          tid = Number(match.tournament_id);
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (tid === null) throw new Error('Tournament not found in Torii after 60s');

      // 4. Register with prover server
      await registerTournament(
        tid,
        proverResult.salt,
        proverResult.wordIndex,
        proverResult.commitment,
      );

      setCreateResult(`Tournament #${tid} created successfully!`);
      setSuccess(`Tournament #${tid} created! Now activate it when ready.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  }, [account, client, maxPlayers]);

  const handleActivate = useCallback(async () => {
    if (!account || !client) {
      setError('Please connect your wallet first');
      return;
    }
    clearMessages();
    setIsActivating(true);
    try {
      await client.tournament_manager.activateTournament(account, Number(activateId));
      setSuccess(`Tournament #${activateId} activated!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsActivating(false);
    }
  }, [account, client, activateId]);

  const handleEnd = useCallback(async () => {
    if (!account || !client) {
      setError('Please connect your wallet first');
      return;
    }
    clearMessages();
    setIsEnding(true);
    try {
      // 1. Get solution from prover server
      const reveal = await revealTournament(Number(endId));

      // 2. End tournament on-chain
      // end_tournament(tournament_id, solution_index: u32, solution_salt: felt252)
      await client.tournament_manager.endTournament(
        account,
        Number(endId),
        reveal.solutionIndex,
        reveal.salt,
      );

      setSuccess(`Tournament #${endId} ended! Solution: ${reveal.solution}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsEnding(false);
    }
  }, [account, client, endId]);

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-6">
      <h1 className="font-heading text-2xl text-text-primary mb-6">Admin Panel</h1>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-error/20 text-error text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-tile-correct/20 text-tile-correct text-sm">
          {success}
        </div>
      )}

      {/* Create Tournament */}
      <section className="bg-bg-surface rounded-xl p-5 border border-tile-border mb-4">
        <h2 className="font-heading text-lg text-text-primary mb-3">Create Tournament</h2>
        <p className="text-text-secondary text-sm mb-4">
          Creates a new tournament with a random word. The prover server generates the commitment.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-text-muted text-xs mb-1">Max Players</label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-full bg-bg-primary border border-tile-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-brand outline-none"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={isCreating || !account}
            className="px-5 py-2 rounded-lg bg-brand text-secondary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border-none"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
        {createResult && (
          <p className="mt-3 text-brand text-sm font-mono">{createResult}</p>
        )}
      </section>

      {/* Activate Tournament */}
      <section className="bg-bg-surface rounded-xl p-5 border border-tile-border mb-4">
        <h2 className="font-heading text-lg text-text-primary mb-3">Activate Tournament</h2>
        <p className="text-text-secondary text-sm mb-4">
          Activates a pending tournament so players can start submitting guesses.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-text-muted text-xs mb-1">Tournament ID</label>
            <input
              type="number"
              value={activateId}
              onChange={(e) => setActivateId(e.target.value)}
              placeholder="e.g. 1"
              className="w-full bg-bg-primary border border-tile-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-brand outline-none"
            />
          </div>
          <button
            onClick={handleActivate}
            disabled={isActivating || !activateId || !account}
            className="px-5 py-2 rounded-lg bg-accent text-secondary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border-none"
          >
            {isActivating ? 'Activating...' : 'Activate'}
          </button>
        </div>
      </section>

      {/* End Tournament */}
      <section className="bg-bg-surface rounded-xl p-5 border border-tile-border">
        <h2 className="font-heading text-lg text-text-primary mb-3">End Tournament</h2>
        <p className="text-text-secondary text-sm mb-4">
          Reveals the solution and ends the tournament. The prover server provides the salt and solution.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-text-muted text-xs mb-1">Tournament ID</label>
            <input
              type="number"
              value={endId}
              onChange={(e) => setEndId(e.target.value)}
              placeholder="e.g. 1"
              className="w-full bg-bg-primary border border-tile-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-brand outline-none"
            />
          </div>
          <button
            onClick={handleEnd}
            disabled={isEnding || !endId || !account}
            className="px-5 py-2 rounded-lg bg-error text-text-primary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border-none"
          >
            {isEnding ? 'Ending...' : 'End Tournament'}
          </button>
        </div>
      </section>

      {!account && (
        <p className="mt-6 text-center text-text-muted text-sm">
          Connect your wallet to use admin features.
        </p>
      )}
    </div>
  );
}
