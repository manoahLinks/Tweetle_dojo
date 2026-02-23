import { DojoProvider, type DojoCall } from '@dojoengine/core';

const NS = 'tweetle_dojo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAccount = any;
type BigNumberish = string | number | bigint;

export function setupWorld(provider: DojoProvider) {
  // ── actions (classic mode) ──

  const actions_startGame = async (snAccount: AnyAccount) => {
    const call: DojoCall = {
      contractName: 'actions',
      entrypoint: 'start_game',
      calldata: [],
    };
    return provider.execute(snAccount, call, NS);
  };

  const actions_submitGuess = async (
    snAccount: AnyAccount,
    gameId: BigNumberish,
    guess: BigNumberish,
  ) => {
    const call: DojoCall = {
      contractName: 'actions',
      entrypoint: 'submit_guess',
      calldata: [gameId, guess],
    };
    return provider.execute(snAccount, call, NS);
  };

  // ── daily_game ──

  const daily_game_getOrCreateDailyGame = async (snAccount: AnyAccount) => {
    const call: DojoCall = {
      contractName: 'daily_game',
      entrypoint: 'get_or_create_daily_game',
      calldata: [],
    };
    return provider.execute(snAccount, call, NS);
  };

  const daily_game_joinDailyGame = async (
    snAccount: AnyAccount,
    gameId: BigNumberish,
  ) => {
    const call: DojoCall = {
      contractName: 'daily_game',
      entrypoint: 'join_daily_game',
      calldata: [gameId],
    };
    return provider.execute(snAccount, call, NS);
  };

  const daily_game_submitDailyGuess = async (
    snAccount: AnyAccount,
    gameId: BigNumberish,
    guess: BigNumberish,
  ) => {
    const call: DojoCall = {
      contractName: 'daily_game',
      entrypoint: 'submit_daily_guess',
      calldata: [gameId, guess],
    };
    return provider.execute(snAccount, call, NS);
  };

  // ── tournament_manager ──

  const tournament_manager_joinTournament = async (
    snAccount: AnyAccount,
    tournamentId: BigNumberish,
  ) => {
    const call: DojoCall = {
      contractName: 'tournament_manager',
      entrypoint: 'join_tournament',
      calldata: [tournamentId],
    };
    return provider.execute(snAccount, call, NS);
  };

  const tournament_manager_submitGuess = async (
    snAccount: AnyAccount,
    tournamentId: BigNumberish,
    fullProofWithHints: string[],
  ) => {
    // Bypass DojoProvider.execute — it validates arg count against the ABI and
    // rejects the large proof calldata (2889 elements).
    // Use raw account.execute with the resolved contract address instead.
    const contract = provider.manifest?.contracts?.find(
      (c: any) => c.tag === `${NS}-tournament_manager` || c.name === `${NS}-tournament_manager`,
    );
    if (!contract?.address) throw new Error('tournament_manager contract not found in manifest');

    return snAccount.execute([{
      contractAddress: contract.address,
      entrypoint: 'submit_guess',
      calldata: [tournamentId, fullProofWithHints.length, ...fullProofWithHints].map(String),
    }]);
  };

  const tournament_manager_createTournament = async (
    snAccount: AnyAccount,
    commitment: BigNumberish,
    entryFee: BigNumberish,
    maxPlayers: BigNumberish,
    startTime: BigNumberish,
    endTime: BigNumberish,
  ) => {
    const call: DojoCall = {
      contractName: 'tournament_manager',
      entrypoint: 'create_tournament',
      calldata: [commitment, entryFee, maxPlayers, startTime, endTime],
    };
    return provider.execute(snAccount, call, NS);
  };

  const tournament_manager_activateTournament = async (
    snAccount: AnyAccount,
    tournamentId: BigNumberish,
  ) => {
    const call: DojoCall = {
      contractName: 'tournament_manager',
      entrypoint: 'activate_tournament',
      calldata: [tournamentId],
    };
    return provider.execute(snAccount, call, NS);
  };

  const tournament_manager_endTournament = async (
    snAccount: AnyAccount,
    tournamentId: BigNumberish,
    solutionIndex: BigNumberish,
    solutionSalt: BigNumberish,
  ) => {
    const call: DojoCall = {
      contractName: 'tournament_manager',
      entrypoint: 'end_tournament',
      calldata: [tournamentId, solutionIndex, solutionSalt],
    };
    return provider.execute(snAccount, call, NS);
  };

  // ── player_system ──

  const player_system_registerPlayer = async (
    snAccount: AnyAccount,
    username: BigNumberish,
    referrer: string,
  ) => {
    const call: DojoCall = {
      contractName: 'player_system',
      entrypoint: 'register_player',
      calldata: [username, referrer],
    };
    return provider.execute(snAccount, call, NS);
  };

  return {
    actions: {
      startGame: actions_startGame,
      submitGuess: actions_submitGuess,
    },
    daily_game: {
      getOrCreateDailyGame: daily_game_getOrCreateDailyGame,
      joinDailyGame: daily_game_joinDailyGame,
      submitDailyGuess: daily_game_submitDailyGuess,
    },
    tournament_manager: {
      joinTournament: tournament_manager_joinTournament,
      submitGuess: tournament_manager_submitGuess,
      createTournament: tournament_manager_createTournament,
      activateTournament: tournament_manager_activateTournament,
      endTournament: tournament_manager_endTournament,
    },
    player_system: {
      registerPlayer: player_system_registerPlayer,
    },
  };
}
