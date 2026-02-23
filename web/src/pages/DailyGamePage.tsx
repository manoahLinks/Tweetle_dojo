import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameActions, type DailyStatus } from '../hooks/useGameActions';
import { useWallet } from '../providers/WalletProvider';
import type { TileData, TileState } from '../dojo/models';
import { WordleBoard } from '../components/WordleBoard';
import { Keyboard } from '../components/Keyboard';
import { GameOverModal } from '../components/GameOverModal';

const COLS = 5;
const MAX_ATTEMPTS = 6;

const TILE_BG: Record<string, string> = {
  correct: 'bg-tile-correct',
  present: 'bg-tile-present',
  absent: 'bg-tile-absent',
};

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

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Countdown screen shown after daily is finished ──
function DailyCountdownScreen({
  dailyStatus,
  goBack,
}: {
  dailyStatus: DailyStatus;
  goBack: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, dailyStatus.expiresAt - Math.floor(Date.now() / 1000)),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, dailyStatus.expiresAt - Math.floor(Date.now() / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [dailyStatus.expiresAt]);

  const isWin = dailyStatus.gameOver === 'won';
  const attemptCount = dailyStatus.guesses.length;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isWin ? 'bg-tile-correct/30' : 'bg-bg-surfaceLight'
        }`}
      >
        <span className="text-4xl">{isWin ? '🏆' : '✋'}</span>
      </div>

      <h2
        className={`font-display text-2xl tracking-widest mb-2 ${
          isWin ? 'text-tile-correct' : 'text-brand'
        }`}
      >
        {isWin ? 'YOU WON!' : 'BETTER LUCK TOMORROW'}
      </h2>

      {isWin && (
        <p className="text-text-secondary text-base mb-6">
          Solved in {attemptCount} attempt{attemptCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Mini board */}
      <div className="flex flex-col gap-1 mb-8">
        {dailyStatus.guesses.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {row.map((tile, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`w-7 h-7 rounded-sm ${TILE_BG[tile.state] ?? 'bg-tile-empty'}`}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="text-text-secondary text-sm mb-2">Next Daily Challenge in</p>
      <p className="font-display text-4xl text-text-primary tracking-[4px] mb-8">
        {formatCountdown(secondsLeft)}
      </p>

      <button
        onClick={goBack}
        className="px-10 py-3 rounded-full bg-brand text-secondary font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity"
      >
        Back to Dashboard
      </button>
    </div>
  );
}

// ── Main Daily Game Page ──
export function DailyGamePage() {
  const navigate = useNavigate();
  const { account } = useWallet();
  const { checkDailyStatus, startDailyGame, submitDailyGuess } = useGameActions();

  const [gameId, setGameId] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<TileData[][]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameOver, setGameOver] = useState<'won' | 'lost' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [winAttempts, setWinAttempts] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyFinished, setDailyFinished] = useState<DailyStatus | null>(null);

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
        const status = await checkDailyStatus();
        if (cancelled) return;

        if (status.hasFinished) {
          setDailyFinished(status);
          return;
        }

        if (!status.hasJoined) {
          const dailyGameId = await startDailyGame();
          if (!cancelled) {
            setGameId(dailyGameId);
            setGuesses([]);
          }
        } else {
          if (!cancelled) {
            setGameId(status.gameId);
            setGuesses(status.guesses);
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [checkDailyStatus, startDailyGame, account]);

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
      const result = await submitDailyGuess(gameId, currentGuess, guesses.length);
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
  }, [currentGuess, gameId, isLoading, gameOver, account, guesses.length, submitDailyGuess]);

  const handleSeeCountdown = useCallback(async () => {
    setShowModal(false);
    const status = await checkDailyStatus();
    setDailyFinished(status);
  }, [checkDailyStatus]);

  if (dailyFinished) {
    return <DailyCountdownScreen dailyStatus={dailyFinished} goBack={() => navigate('/')} />;
  }

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
        <p className="text-text-secondary text-sm">Loading daily challenge...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-bg-surface px-4 py-3 text-center">
        <h2 className="font-heading text-base text-text-primary">Daily Challenge</h2>
        <p className="text-accent text-xs font-semibold tracking-[2px]">ONE WORD PER DAY</p>
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
          onPlayNext={handleSeeCountdown}
          playNextLabel="See Countdown"
        />
      )}
    </div>
  );
}
