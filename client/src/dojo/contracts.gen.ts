import { DojoProvider, type DojoCall } from '@dojoengine/core';
import type { Account, AccountInterface, BigNumberish } from 'starknet';

const NAMESPACE = 'tweetle_dojo';

// Extract human-readable revert reason from Katana/starknet errors.
// Contract failures contain felt252-encoded strings like 0x506c61796572...
function parseContractError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // Match felt252 hex values in failure reason arrays: [0x..., 0x...]
  const feltMatch = raw.match(/failure reason:\s*\[([^\]]+)\]/i)
    ?? raw.match(/Failure reason:\s*"?([^"}\]]+)"?/i);

  if (feltMatch) {
    const hexValues = feltMatch[1].match(/0x[0-9a-fA-F]+/g);
    if (hexValues) {
      const decoded = hexValues
        .map((hex) => {
          try {
            let n = BigInt(hex);
            const bytes: number[] = [];
            while (n > 0n) {
              bytes.unshift(Number(n % 256n));
              n = n / 256n;
            }
            const str = String.fromCharCode(...bytes);
            // Only return if it looks like readable text
            if (/^[\x20-\x7E]+$/.test(str)) return str;
          } catch {}
          return null;
        })
        .filter(Boolean)
        .join(' ');
      if (decoded.length > 0) return decoded.trim();
    }
  }

  // Fallback: look for a quoted error message
  const quotedMatch = raw.match(/Error message:\s*"([^"]+)"/i)
    ?? raw.match(/execution_error"?:\s*"([^"]+)"/i)
    ?? raw.match(/revert_error"?:\s*"([^"]+)"/i);
  if (quotedMatch) return quotedMatch[1];

  // Last resort: truncate the raw message
  return raw.length > 120 ? raw.slice(0, 120) + '...' : raw;
}

// Skip tip + fee estimation on Katana
const TX_OPTIONS = {
  tip: 0,
  resourceBounds: {
    l1_gas: { max_amount: 100000n, max_price_per_unit: 1000000000n },
    l2_gas: { max_amount: 0n, max_price_per_unit: 0n },
    l1_data_gas: { max_amount: 0n, max_price_per_unit: 0n },
  },
};

export function setupWorld(provider: DojoProvider) {
  // ── actions ──

  const build_actions_startGameCalldata = (): DojoCall => ({
    contractName: 'actions',
    entrypoint: 'start_game',
    calldata: [],
  });

  const actions_startGame = async (account: Account | AccountInterface) => {
    try {
      return await provider.execute(
        account,
        build_actions_startGameCalldata(),
        NAMESPACE,
        TX_OPTIONS
      );
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  const build_actions_submitGuessCalldata = (
    gameId: BigNumberish,
    word: BigNumberish
  ): DojoCall => ({
    contractName: 'actions',
    entrypoint: 'submit_guess',
    calldata: [gameId, word],
  });

  const actions_submitGuess = async (
    account: Account | AccountInterface,
    gameId: BigNumberish,
    word: BigNumberish
  ) => {
    try {
      return await provider.execute(
        account,
        build_actions_submitGuessCalldata(gameId, word),
        NAMESPACE,
        TX_OPTIONS
      );
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  // ── daily_game ──

  const build_dailyGame_getOrCreateCalldata = (): DojoCall => ({
    contractName: 'daily_game',
    entrypoint: 'get_or_create_daily_game',
    calldata: [],
  });

  const dailyGame_getOrCreate = async (account: Account | AccountInterface) => {
    try {
      return await provider.execute(
        account,
        build_dailyGame_getOrCreateCalldata(),
        NAMESPACE,
        TX_OPTIONS
      );
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  const build_dailyGame_joinCalldata = (gameId: BigNumberish): DojoCall => ({
    contractName: 'daily_game',
    entrypoint: 'join_daily_game',
    calldata: [gameId],
  });

  const dailyGame_join = async (
    account: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        account,
        build_dailyGame_joinCalldata(gameId),
        NAMESPACE,
        TX_OPTIONS
      );
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  const build_dailyGame_submitGuessCalldata = (
    gameId: BigNumberish,
    word: BigNumberish
  ): DojoCall => ({
    contractName: 'daily_game',
    entrypoint: 'submit_daily_guess',
    calldata: [gameId, word],
  });

  const dailyGame_submitGuess = async (
    account: Account | AccountInterface,
    gameId: BigNumberish,
    word: BigNumberish
  ) => {
    try {
      return await provider.execute(
        account,
        build_dailyGame_submitGuessCalldata(gameId, word),
        NAMESPACE,
        TX_OPTIONS
      );
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  // ── player_system ──

  const build_playerSystem_registerCalldata = (
    username: BigNumberish,
    referrer: BigNumberish
  ): DojoCall => ({
    contractName: 'player_system',
    entrypoint: 'register_player',
    calldata: [username, referrer],
  });

  const playerSystem_register = async (
    account: Account | AccountInterface,
    username: BigNumberish,
    referrer: BigNumberish
  ) => {
    try {
      return await provider.execute(
        account,
        build_playerSystem_registerCalldata(username, referrer),
        NAMESPACE,
        TX_OPTIONS
      );
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  return {
    actions: {
      startGame: actions_startGame,
      submitGuess: actions_submitGuess,
      buildStartGameCalldata: build_actions_startGameCalldata,
      buildSubmitGuessCalldata: build_actions_submitGuessCalldata,
    },
    dailyGame: {
      getOrCreate: dailyGame_getOrCreate,
      join: dailyGame_join,
      submitGuess: dailyGame_submitGuess,
      buildGetOrCreateCalldata: build_dailyGame_getOrCreateCalldata,
      buildJoinCalldata: build_dailyGame_joinCalldata,
      buildSubmitGuessCalldata: build_dailyGame_submitGuessCalldata,
    },
    playerSystem: {
      register: playerSystem_register,
      buildRegisterCalldata: build_playerSystem_registerCalldata,
    },
  };
}
