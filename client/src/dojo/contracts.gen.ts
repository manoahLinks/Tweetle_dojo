import type { BigNumberish } from 'starknet';
import type { SessionAccountInterface } from '../../modules/controller/src';
import {
  ACTIONS_CONTRACT,
  DAILY_GAME_CONTRACT,
  PLAYER_SYSTEM_CONTRACT,
} from '../constants';

// Extract human-readable revert reason from Starknet errors.
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
            if (/^[\x20-\x7E]+$/.test(str)) return str;
          } catch {}
          return null;
        })
        .filter(Boolean)
        .join(' ');
      if (decoded.length > 0) return decoded.trim();
    }
  }

  const quotedMatch = raw.match(/Error message:\s*"([^"]+)"/i)
    ?? raw.match(/execution_error"?:\s*"([^"]+)"/i)
    ?? raw.match(/revert_error"?:\s*"([^"]+)"/i);
  if (quotedMatch) return quotedMatch[1];

  return raw.length > 120 ? raw.slice(0, 120) + '...' : raw;
}

function toFelt(value: BigNumberish): string {
  if (typeof value === 'string') {
    return value.startsWith('0x') ? value : '0x' + BigInt(value).toString(16);
  }
  return '0x' + BigInt(value).toString(16);
}

export function setupWorld(sessionAccount: SessionAccountInterface) {
  // Wrap executeFromOutside with detailed error logging
  function exec(calls: Array<{ contractAddress: string; entrypoint: string; calldata: string[] }>) {
    console.log('[Contract] executeFromOutside:', JSON.stringify(calls));
    try {
      const result = sessionAccount.executeFromOutside(calls);
      console.log('[Contract] Success, tx:', result);
      return result;
    } catch (error: any) {
      console.error('[Contract] RAW ERROR:', error);
      console.error('[Contract] Error message:', error?.message);
      console.error('[Contract] Error tag:', error?.tag);
      console.error('[Contract] Error type:', error?.constructor?.name);
      throw new Error(parseContractError(error));
    }
  }

  // ── actions ──

  const actions_startGame = async () => {
    return exec([
      { contractAddress: ACTIONS_CONTRACT, entrypoint: 'start_game', calldata: [] },
    ]);
  };

  const actions_submitGuess = async (
    gameId: BigNumberish,
    word: BigNumberish
  ) => {
    return exec([
      {
        contractAddress: ACTIONS_CONTRACT,
        entrypoint: 'submit_guess',
        calldata: [toFelt(gameId), toFelt(word)],
      },
    ]);
  };

  // ── daily_game ──

  const dailyGame_getOrCreate = async () => {
    return exec([
      {
        contractAddress: DAILY_GAME_CONTRACT,
        entrypoint: 'get_or_create_daily_game',
        calldata: [],
      },
    ]);
  };

  const dailyGame_join = async (gameId: BigNumberish) => {
    return exec([
      {
        contractAddress: DAILY_GAME_CONTRACT,
        entrypoint: 'join_daily_game',
        calldata: [toFelt(gameId)],
      },
    ]);
  };

  const dailyGame_submitGuess = async (
    gameId: BigNumberish,
    word: BigNumberish
  ) => {
    return exec([
      {
        contractAddress: DAILY_GAME_CONTRACT,
        entrypoint: 'submit_daily_guess',
        calldata: [toFelt(gameId), toFelt(word)],
      },
    ]);
  };

  // ── player_system ──

  const playerSystem_register = async (
    username: BigNumberish,
    referrer: BigNumberish
  ) => {
    return exec([
      {
        contractAddress: PLAYER_SYSTEM_CONTRACT,
        entrypoint: 'register_player',
        calldata: [toFelt(username), toFelt(referrer)],
      },
    ]);
  };

  return {
    actions: {
      startGame: actions_startGame,
      submitGuess: actions_submitGuess,
    },
    dailyGame: {
      getOrCreate: dailyGame_getOrCreate,
      join: dailyGame_join,
      submitGuess: dailyGame_submitGuess,
    },
    playerSystem: {
      register: playerSystem_register,
    },
  };
}
