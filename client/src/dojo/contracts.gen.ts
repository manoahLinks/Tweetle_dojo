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
  // ── actions ──

  const actions_startGame = async () => {
    try {
      return sessionAccount.executeFromOutside([
        { contractAddress: ACTIONS_CONTRACT, entrypoint: 'start_game', calldata: [] },
      ]);
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  const actions_submitGuess = async (
    gameId: BigNumberish,
    word: BigNumberish
  ) => {
    try {
      return sessionAccount.executeFromOutside([
        {
          contractAddress: ACTIONS_CONTRACT,
          entrypoint: 'submit_guess',
          calldata: [toFelt(gameId), toFelt(word)],
        },
      ]);
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  // ── daily_game ──

  const dailyGame_getOrCreate = async () => {
    try {
      return sessionAccount.executeFromOutside([
        {
          contractAddress: DAILY_GAME_CONTRACT,
          entrypoint: 'get_or_create_daily_game',
          calldata: [],
        },
      ]);
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  const dailyGame_join = async (gameId: BigNumberish) => {
    try {
      return sessionAccount.executeFromOutside([
        {
          contractAddress: DAILY_GAME_CONTRACT,
          entrypoint: 'join_daily_game',
          calldata: [toFelt(gameId)],
        },
      ]);
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  const dailyGame_submitGuess = async (
    gameId: BigNumberish,
    word: BigNumberish
  ) => {
    try {
      return sessionAccount.executeFromOutside([
        {
          contractAddress: DAILY_GAME_CONTRACT,
          entrypoint: 'submit_daily_guess',
          calldata: [toFelt(gameId), toFelt(word)],
        },
      ]);
    } catch (error) {
      throw new Error(parseContractError(error));
    }
  };

  // ── player_system ──

  const playerSystem_register = async (
    username: BigNumberish,
    referrer: BigNumberish
  ) => {
    try {
      return sessionAccount.executeFromOutside([
        {
          contractAddress: PLAYER_SYSTEM_CONTRACT,
          entrypoint: 'register_player',
          calldata: [toFelt(username), toFelt(referrer)],
        },
      ]);
    } catch (error) {
      throw new Error(parseContractError(error));
    }
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
