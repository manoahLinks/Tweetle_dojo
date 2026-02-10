import { useCallback } from 'react';
import { useDojo } from '../dojo/DojoContext';
import { useSession } from './SessionContext';
import { stringToFelt, feltToString, decodeHints, WINNING_HINT } from '../dojo/models';
import {
  pollPlayerRegistered,
  fetchLatestClassicGame,
  pollNewClassicGame,
  pollNewAttempt,
  pollDailyGame,
  pollDailyJoined,
  pollNewDailyAttempt,
} from '../dojo/torii';
import {
  apolloClient,
  GET_LATEST_CLASSIC_GAME,
  GET_GAME_ATTEMPTS,
  GET_DAILY_ATTEMPT_COUNT,
  GET_DAILY_ATTEMPTS,
  type GetLatestClassicGameResponse,
  type GetGameAttemptsResponse,
  type GetDailyAttemptCountResponse,
  type GetDailyAttemptsResponse,
} from '../dojo/apollo';
import type { TileState, TileData } from '../screens/GameBoardScreen';

const ZERO_ADDRESS = '0x0';
const SECONDS_PER_DAY = 86400;

interface GuessResult {
  hintPacked: number;
  tileStates: TileState[];
  isWin: boolean;
  isLoss: boolean;
  attemptNumber: number;
}

interface ResumedGameState {
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
}

export function useGameActions() {
  const { client } = useDojo();
  const { sessionMetadata } = useSession();
  const playerAddress = sessionMetadata.address!;

  const registerPlayer = useCallback(
    async (username: string) => {
      const usernameFelt = stringToFelt(username);
      await client.playerSystem.register(usernameFelt, ZERO_ADDRESS);
      await pollPlayerRegistered(playerAddress);
    },
    [client, playerAddress]
  );

  // ── Classic Mode ──

  const startGame = useCallback(async (): Promise<number> => {
    const currentGame = await fetchLatestClassicGame(playerAddress);
    const currentGameId = currentGame?.game_id ?? 0;
    await client.actions.startGame();
    const newGame = await pollNewClassicGame(playerAddress, currentGameId);
    return newGame.game_id;
  }, [client, playerAddress]);

  const submitGuess = useCallback(
    async (gameId: number, word: string, currentAttemptCount: number): Promise<GuessResult> => {
      const wordFelt = stringToFelt(word.toLowerCase());
      await client.actions.submitGuess(gameId, wordFelt);
      const attempt = await pollNewAttempt(playerAddress, gameId, currentAttemptCount);

      const hintPacked = Number(attempt.hint_packed);
      const attemptNumber = Number(attempt.attempt_number);
      const isWin = hintPacked === WINNING_HINT;
      const isLoss = attemptNumber >= 6 && !isWin;

      return { hintPacked, tileStates: decodeHints(hintPacked), isWin, isLoss, attemptNumber };
    },
    [client, playerAddress]
  );

  const resumeOrStartGame = useCallback(async (): Promise<ResumedGameState> => {
    const { data } = await apolloClient.query<GetLatestClassicGameResponse>({
      query: GET_LATEST_CLASSIC_GAME,
      variables: { player: playerAddress },
      fetchPolicy: 'network-only',
    });

    const latestGame = data?.tweetleDojoClassicGameModels?.edges?.[0]?.node;

    if (latestGame && !latestGame.has_ended) {
      const { data: attemptsData } = await apolloClient.query<GetGameAttemptsResponse>({
        query: GET_GAME_ATTEMPTS,
        variables: { player: playerAddress, gameId: latestGame.game_id },
        fetchPolicy: 'network-only',
      });

      const attemptNodes =
        attemptsData?.tweetleDojoClassicAttemptModels?.edges?.map((e) => e.node) ?? [];

      const guesses: TileData[][] = attemptNodes.map((attempt) => {
        const word = feltToString(attempt.word).toUpperCase();
        const tileStates = decodeHints(Number(attempt.hint_packed));
        return word.split('').map((letter, i) => ({
          letter,
          state: tileStates[i],
        }));
      });

      return { gameId: Number(latestGame.game_id), guesses, gameOver: null };
    }

    const newGameId = await startGame();
    return { gameId: newGameId, guesses: [], gameOver: null };
  }, [playerAddress, startGame]);

  // ── Daily Mode ──

  const getTodayGameId = useCallback((): number => {
    return Math.floor(Date.now() / 1000 / SECONDS_PER_DAY);
  }, []);

  const checkDailyStatus = useCallback(async (): Promise<DailyStatus> => {
    const gameId = getTodayGameId();
    const gameIdHex = '0x' + gameId.toString(16);
    const expiresAt = (gameId + 1) * SECONDS_PER_DAY;

    const { data: acData } = await apolloClient.query<GetDailyAttemptCountResponse>({
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
      };
    }

    const { data: attData } = await apolloClient.query<GetDailyAttemptsResponse>({
      query: GET_DAILY_ATTEMPTS,
      variables: { player: playerAddress, gameId: gameIdHex },
      fetchPolicy: 'network-only',
    });
    const attemptNodes = attData?.tweetleDojoDailyAttemptModels?.edges?.map((e) => e.node) ?? [];

    const guesses: TileData[][] = attemptNodes.map((attempt) => {
      const word = feltToString(attempt.word).toUpperCase();
      const tileStates = decodeHints(Number(attempt.hint_packed));
      return word.split('').map((letter, i) => ({ letter, state: tileStates[i] }));
    });

    const count = Number(attemptCount.count);
    const lastAttempt = attemptNodes[attemptNodes.length - 1];
    const won = lastAttempt && Number(lastAttempt.hint_packed) === WINNING_HINT;
    const lost = count >= 6 && !won;
    const hasFinished = won || lost;

    return {
      gameId,
      hasFinished,
      hasJoined: true,
      expiresAt,
      guesses,
      gameOver: won ? 'won' : lost ? 'lost' : null,
    };
  }, [playerAddress, getTodayGameId]);

  const startDailyGame = useCallback(async (): Promise<number> => {
    const gameId = getTodayGameId();

    await client.dailyGame.getOrCreate();
    await pollDailyGame(gameId);

    await client.dailyGame.join(gameId);
    await pollDailyJoined(playerAddress, gameId);

    return gameId;
  }, [client, playerAddress, getTodayGameId]);

  const submitDailyGuess = useCallback(
    async (gameId: number, word: string, currentAttemptCount: number): Promise<GuessResult> => {
      const wordFelt = stringToFelt(word.toLowerCase());
      await client.dailyGame.submitGuess(gameId, wordFelt);
      const attempt = await pollNewDailyAttempt(playerAddress, gameId, currentAttemptCount);

      const hintPacked = Number(attempt.hint_packed);
      const attemptNumber = Number(attempt.attempt_number);
      const isWin = hintPacked === WINNING_HINT;
      const isLoss = attemptNumber >= 6 && !isWin;

      return { hintPacked, tileStates: decodeHints(hintPacked), isWin, isLoss, attemptNumber };
    },
    [client, playerAddress]
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
