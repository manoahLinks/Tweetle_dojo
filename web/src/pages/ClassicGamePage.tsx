import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameActions } from '../hooks/useGameActions';
import { useWallet } from '../providers/WalletProvider';
import type { TileData, TileState } from '../dojo/models';
import { WordleBoard } from '../components/WordleBoard';
import { Keyboard } from '../components/Keyboard';
import { GameOverModal } from '../components/GameOverModal';

const COLS = 5;
const MAX_ATTEMPTS = 6;

function getKeyboardStates(guesses: TileData[][]): Record<string, TileState> {
  const states: Record<string, TileState> = {};
  for (const row of guesses) {
    for (const tile of row) {
      const existing = states[tile.letter];
      if (tile.state === 'correct') {
        states[tile.letter] = 'correct';
      } else if (tile.state === 'present' && existing !== 'correct') {
        states[tile.letter] = 'present';
      } else if (!existing) {
        states[tile.letter] = tile.state;
      }
    }
  }
  return states;
}

export function ClassicGamePage() {
  const navigate = useNavigate();
  const { account } = useWallet();
  const { resumeOrStartGame, submitGuess, startGame } = useGameActions();

  const [gameId, setGameId] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<TileData[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameOver, setGameOver] = useState<'won' | 'lost' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [winAttempts, setWinAttempts] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentRow = guesses.length;
  const keyStates = getKeyboardStates(guesses);

  useEffect(() => {
    if (!account) {
      setInitializing(false);
      return;
    }
    let cancelled = false;
    async function init() {
      try {
        const resumed = await resumeOrStartGame();
        if (!cancelled) {
          setGameId(resumed.gameId);
          setGuesses(resumed.guesses);
          if (resumed.gameOver) setGameOver(resumed.gameOver);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [resumeOrStartGame, account]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameOver || isLoading) return;
      if (key === 'BACK') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (currentGuess.length < COLS) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [currentGuess, gameOver, isLoading],
  );

  const handleSubmit = useCallback(async () => {
    if (currentGuess.length !== COLS || !gameId || isLoading || gameOver) return;
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const result = await submitGuess(gameId, currentGuess, guesses.length);
      const submittedRow: TileData[] = currentGuess.split('').map((letter, i) => ({
        letter,
        state: result.tileStates[i] || 'absent',
      }));
      setGuesses((prev) => [...prev, submittedRow]);
      setCurrentGuess('');

      if (result.isWin) {
        setGameOver('won');
        setWinAttempts(result.attemptNumber);
        setTimeout(() => setShowModal(true), 400);
      } else if (result.isLoss) {
        setGameOver('lost');
        setTimeout(() => setShowModal(true), 400);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentGuess, gameId, isLoading, gameOver, account, guesses.length, submitGuess]);

  const handlePlayNext = useCallback(async () => {
    setShowModal(false);
    setIsLoading(true);
    try {
      const newGameId = await startGame();
      setGameId(newGameId);
      setGuesses([]);
      setCurrentGuess('');
      setGameOver(null);
      setWinAttempts(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [startGame]);

  // Build board
  const board: TileData[][] = [];
  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    if (r < guesses.length) {
      board.push(guesses[r]);
    } else if (r === currentRow) {
      const row: TileData[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          letter: currentGuess[c] || '',
          state: currentGuess[c] ? 'filled' : 'empty',
        });
      }
      board.push(row);
    } else {
      board.push(
        Array.from({ length: COLS }, (): TileData => ({ letter: '', state: 'empty' })),
      );
    }
  }

  if (initializing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-text-secondary text-sm">Starting game...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-bg-surface px-4 py-3 text-center">
        <h2 className="font-heading text-base text-text-primary">Classic Mode</h2>
        {gameId !== null && (
          <p className="text-text-muted text-xs">Game #{gameId}</p>
        )}
      </div>

      {isLoading && (
        <div className="mx-4 mt-2 px-4 py-2 rounded-lg bg-brand/10 text-brand text-sm text-center font-semibold">
          Submitting guess...
        </div>
      )}

      {error && (
        <div className="mx-4 mt-2 px-4 py-3 rounded-lg bg-error/20 text-error text-sm">
          {error}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center py-4">
        {guesses.length === 0 && currentGuess.length === 0 && (
          <p className="text-text-muted text-sm font-semibold tracking-wider mb-3">
            MAKE YOUR FIRST GUESS!
          </p>
        )}
        <WordleBoard board={board} />
      </div>

      {/* Keyboard */}
      <div className="pb-4 max-w-lg mx-auto w-full">
        <Keyboard
          keyStates={keyStates}
          onKeyPress={handleKeyPress}
          onSubmit={handleSubmit}
          disabled={isLoading || !!gameOver}
        />
      </div>

      {/* Modal */}
      {gameOver && (
        <GameOverModal
          isOpen={showModal}
          result={gameOver}
          attempts={winAttempts}
          lastRow={guesses[guesses.length - 1]}
          onClose={() => setShowModal(false)}
          onBack={() => navigate('/')}
          onPlayNext={handlePlayNext}
          playNextLabel="Play Next"
        />
      )}
    </div>
  );
}
