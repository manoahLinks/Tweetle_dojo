import { useCallback } from 'react';
import { useDojo } from '../dojo/DojoContext';
import { MASTER_ADDRESS } from '../dojo/dojoConfig';
import { stringToFelt, feltToString, decodeHints, WINNING_HINT } from '../dojo/models';
import {
  pollPlayerRegistered,
  fetchLatestClassicGame,
  pollNewClassicGame,
  pollNewAttempt,
} from '../dojo/torii';
import {
  apolloClient,
  GET_LATEST_CLASSIC_GAME,
  GET_GAME_ATTEMPTS,
  type GetLatestClassicGameResponse,
  type GetGameAttemptsResponse,
} from '../dojo/apollo';
import type { TileState, TileData } from '../screens/GameBoardScreen';

const ZERO_ADDRESS = '0x0';

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

export function useGameActions() {
  const { account, client } = useDojo();
  const playerAddress = MASTER_ADDRESS;

  const registerPlayer = useCallback(
    async (username: string) => {
      const usernameFelt = stringToFelt(username);
      await client.playerSystem.register(account, usernameFelt, ZERO_ADDRESS);
      // Poll Torii until player is indexed
      await pollPlayerRegistered(playerAddress);
    },
    [account, client, playerAddress]
  );

  const startGame = useCallback(async (): Promise<number> => {
    // Get current game count so we know what to poll for
    const currentGame = await fetchLatestClassicGame(playerAddress);
    const currentGameId = currentGame?.game_id ?? 0;

    // Fire tx
    await client.actions.startGame(account);

    // Poll Torii for the new game
    const newGame = await pollNewClassicGame(playerAddress, currentGameId);
    return newGame.game_id;
  }, [account, client, playerAddress]);

  const submitGuess = useCallback(
    async (gameId: number, word: string, currentAttemptCount: number): Promise<GuessResult> => {
      const wordFelt = stringToFelt(word.toLowerCase());

      // Fire tx
      await client.actions.submitGuess(account, gameId, wordFelt);

      // Poll Torii for the new attempt
      const attempt = await pollNewAttempt(playerAddress, gameId, currentAttemptCount);

      const hintPacked = Number(attempt.hint_packed);
      const attemptNumber = Number(attempt.attempt_number);
      const isWin = hintPacked === WINNING_HINT;
      const isLoss = attemptNumber >= 6 && !isWin;

      return {
        hintPacked,
        tileStates: decodeHints(hintPacked),
        isWin,
        isLoss,
        attemptNumber,
      };
    },
    [account, client, playerAddress]
  );

  const resumeOrStartGame = useCallback(async (): Promise<ResumedGameState> => {
    // Check Torii for an active (non-ended) game
    const { data } = await apolloClient.query<GetLatestClassicGameResponse>({
      query: GET_LATEST_CLASSIC_GAME,
      variables: { player: playerAddress },
      fetchPolicy: 'network-only',
    });

    const latestGame = data?.tweetleDojoClassicGameModels?.edges?.[0]?.node;

    // If there's an active game, restore its attempts
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

    // No active game — start a new one
    const newGameId = await startGame();
    return { gameId: newGameId, guesses: [], gameOver: null };
  }, [playerAddress, startGame]);

  return { registerPlayer, startGame, submitGuess, resumeOrStartGame };
}
