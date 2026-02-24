import { useCallback } from 'react';
import { useDojo } from '../providers/DojoProvider';
import { stringToFelt, feltToString, decodeHints, WINNING_HINT } from '../dojo/models';
import type { TileState, TileData } from '../dojo/models';
import {
  apolloClient,
  pollPlayerRegistered,
  fetchLatestClassicGame,
  pollNewClassicGame,
  pollNewAttempt,
  pollDailyGame,
  pollDailyJoined,
  pollNewDailyAttempt,
  fetchDailyAttempts,
  GET_LATEST_CLASSIC_GAME,
  GET_GAME_ATTEMPTS,
  GET_DAILY_ATTEMPT_COUNT,
  type ClassicAttemptNode,
  type DailyAttemptNode,
} from '../dojo/apollo';

const ZERO_ADDRESS = '0x0';
const SECONDS_PER_DAY = 86400;

export interface GuessResult {
  hintPacked: number;
  tileStates: TileState[];
  isWin: boolean;
  isLoss: boolean;
  attemptNumber: number;
}

export interface ResumedGameState {
  gameId: number;
  guesses: TileData[][];
  gameOver: 'won' | 'lost' | null;
}

export interface DailyStatus {
  gameId: number;
  hasFinished: boolean;
  hasJoined: boolean;
  expiresAt: number;
  guesses: TileData[][];
  gameOver: 'won' | 'lost' | null;
  attemptCount: number;
}

function attemptsToGuesses(attempts: (ClassicAttemptNode | DailyAttemptNode)[]): TileData[][] {
  return attempts.map((attempt) => {
    const word = feltToString(attempt.word).toUpperCase();
    const tileStates = decodeHints(Number(attempt.hint_packed));
    return word.split('').map((letter, i) => ({
      letter,
      state: tileStates[i],
    }));
  });
}

export function useGameActions() {
  const { client, account, address: playerAddress } = useDojo();

  const registerPlayer = useCallback(
    async (username: string) => {
      if (!client || !account || !playerAddress) return;
      const usernameFelt = stringToFelt(username);
      await client.player_system.registerPlayer(account, usernameFelt, ZERO_ADDRESS);
      await pollPlayerRegistered(playerAddress);
    },
    [client, account, playerAddress],
  );

  // ── Classic Mode ──

  const startGame = useCallback(async (): Promise<number> => {
    if (!client || !account || !playerAddress) throw new Error('Dojo not initialized');
    const currentGame = await fetchLatestClassicGame(playerAddress);
    const currentGameId = currentGame?.game_id ?? 0;
    await client.actions.startGame(account);
    const newGame = await pollNewClassicGame(playerAddress, currentGameId);
    return newGame.game_id;
  }, [client, account, playerAddress]);

  const submitGuess = useCallback(
    async (gameId: number, word: string, currentAttemptCount: number): Promise<GuessResult> => {
      if (!client || !account || !playerAddress) throw new Error('Dojo not initialized');
      const wordFelt = stringToFelt(word.toLowerCase());
      await client.actions.submitGuess(account, gameId, wordFelt);
      const attempt = await pollNewAttempt(playerAddress, gameId, currentAttemptCount);

      const hintPacked = Number(attempt.hint_packed);
      const attemptNumber = Number(attempt.attempt_number);
      const isWin = hintPacked === WINNING_HINT;
      const isLoss = attemptNumber >= 6 && !isWin;

      return { hintPacked, tileStates: decodeHints(hintPacked), isWin, isLoss, attemptNumber };
    },
    [client, account, playerAddress],
  );

  const resumeOrStartGame = useCallback(async (): Promise<ResumedGameState> => {
    if (!playerAddress) throw new Error('Dojo not initialized');
    const { data } = await apolloClient.query<any>({
      query: GET_LATEST_CLASSIC_GAME,
      variables: { player: playerAddress },
      fetchPolicy: 'network-only',
    });

    const latestGame = data?.tweetleDojoClassicGameModels?.edges?.[0]?.node;

    if (latestGame && !latestGame.has_ended) {
      const { data: attemptsData } = await apolloClient.query<any>({
        query: GET_GAME_ATTEMPTS,
        variables: { player: playerAddress, gameId: latestGame.game_id },
        fetchPolicy: 'network-only',
      });

      const attemptNodes: ClassicAttemptNode[] =
        attemptsData?.tweetleDojoClassicAttemptModels?.edges?.map((e: any) => e.node) ?? [];

      return { gameId: Number(latestGame.game_id), guesses: attemptsToGuesses(attemptNodes), gameOver: null };
    }

    const newGameId = await startGame();
    return { gameId: newGameId, guesses: [], gameOver: null };
  }, [playerAddress, startGame]);

  // ── Daily Mode ──

  const getTodayGameId = useCallback((): number => {
    return Math.floor(Date.now() / 1000 / SECONDS_PER_DAY);
  }, []);

  const checkDailyStatus = useCallback(async (): Promise<DailyStatus> => {
    if (!playerAddress) throw new Error('Dojo not initialized');
    const gameId = getTodayGameId();
    const gameIdHex = '0x' + gameId.toString(16);
    const expiresAt = (gameId + 1) * SECONDS_PER_DAY;

    const { data: acData } = await apolloClient.query<any>({
      query: GET_DAILY_ATTEMPT_COUNT,
      variables: { player: playerAddress, gameId: gameIdHex },
      fetchPolicy: 'network-only',
    });

    const attemptCount = acData?.tweetleDojoDailyAttemptCountModels?.edges?.[0]?.node;

    if (!attemptCount || !attemptCount.has_joined) {
      return {
        gameId,
        hasFinished: false,
        hasJoined: false,
        expiresAt,
        guesses: [],
        gameOver: null,
        attemptCount: 0,
      };
    }

    const attemptNodes = await fetchDailyAttempts(playerAddress, gameId);
    const guesses = attemptsToGuesses(attemptNodes);

    const count = Number(attemptCount.count);
    const lastAttempt = attemptNodes[attemptNodes.length - 1];
    const won = lastAttempt && Number(lastAttempt.hint_packed) === WINNING_HINT;
    const lost = count >= 6 && !won;
    const hasFinished = won || lost;

    return {
      gameId,
      hasFinished: hasFinished || false,
      hasJoined: true,
      expiresAt,
      guesses,
      gameOver: won ? 'won' : lost ? 'lost' : null,
      attemptCount: count,
    };
  }, [playerAddress, getTodayGameId]);

  const startDailyGame = useCallback(async (): Promise<number> => {
    if (!client || !account || !playerAddress) throw new Error('Dojo not initialized');
    const gameId = getTodayGameId();

    await client.daily_game.getOrCreateDailyGame(account);
    await pollDailyGame(gameId);

    await client.daily_game.joinDailyGame(account, gameId);
    await pollDailyJoined(playerAddress, gameId);

    return gameId;
  }, [client, account, playerAddress, getTodayGameId]);

  const submitDailyGuess = useCallback(
    async (gameId: number, word: string, currentAttemptCount: number): Promise<GuessResult> => {
      if (!client || !account || !playerAddress) throw new Error('Dojo not initialized');
      const wordFelt = stringToFelt(word.toLowerCase());
      await client.daily_game.submitDailyGuess(account, gameId, wordFelt);
      const attempt = await pollNewDailyAttempt(playerAddress, gameId, currentAttemptCount);

      const hintPacked = Number(attempt.hint_packed);
      const attemptNumber = Number(attempt.attempt_number);
      const isWin = hintPacked === WINNING_HINT;
      const isLoss = attemptNumber >= 6 && !isWin;

      return { hintPacked, tileStates: decodeHints(hintPacked), isWin, isLoss, attemptNumber };
    },
    [client, account, playerAddress],
  );

  return {
    registerPlayer,
    startGame,
    submitGuess,
    resumeOrStartGame,
    checkDailyStatus,
    startDailyGame,
    submitDailyGuess,
  };
}
