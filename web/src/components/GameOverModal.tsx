import type { TileData, TileState } from '../dojo/models';

const TILE_BG: Record<TileState, string> = {
  empty: 'bg-tile-empty',
  filled: 'bg-tile-empty',
  correct: 'bg-tile-correct',
  present: 'bg-tile-present',
  absent: 'bg-tile-absent',
};

interface GameOverModalProps {
  isOpen: boolean;
  result: 'won' | 'lost';
  attempts: number;
  lastRow?: TileData[];
  onClose: () => void;
  onBack: () => void;
  onPlayNext?: () => void;
  playNextLabel?: string;
}

export function GameOverModal({
  isOpen,
  result,
  attempts,
  lastRow,
  onClose,
  onBack,
  onPlayNext,
  playNextLabel,
}: GameOverModalProps) {
  if (!isOpen) return null;

  const pointsEarned = result === 'won'
    ? attempts <= 2 ? 100 : attempts <= 4 ? 75 : 50
    : 0;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-8">
      <div className="w-full max-w-sm bg-bg-primary rounded-2xl py-10 px-6 border border-tile-border relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary text-lg font-bold hover:text-text-primary cursor-pointer bg-transparent border-none"
        >
          ✕
        </button>

        <div className="bg-gradient-to-r from-accent to-[#D4941A] px-8 py-3 rounded-lg mb-5">
          <span className="font-display text-2xl text-text-primary tracking-wider">
            {result === 'won' ? "YOU'RE A PRO!" : 'TRY AGAIN'}
          </span>
        </div>

        {lastRow && (
          <div className="flex gap-1.5 mb-3">
            {lastRow.map((tile, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded flex items-center justify-center ${TILE_BG[tile.state]}`}
              >
                <span className="text-text-onTile font-display text-lg">
                  {tile.letter}
                </span>
              </div>
            ))}
          </div>
        )}

        {result === 'won' && pointsEarned > 0 && (
          <p className="text-accent text-xl font-heading mb-1">+{pointsEarned} points</p>
        )}

        <p className="text-text-secondary text-base mb-8 text-center">
          {result === 'won'
            ? `Solved in ${attempts} attempt${attempts !== 1 ? 's' : ''}!`
            : 'Better luck next time!'}
        </p>

        {onPlayNext && (
          <button
            onClick={onPlayNext}
            className="w-full bg-brand text-secondary py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity cursor-pointer border-none mb-3"
          >
            {playNextLabel || 'Play Next'}
          </button>
        )}

        <button
          onClick={onBack}
          className={`w-full py-3 rounded-lg font-semibold text-lg transition-opacity cursor-pointer border ${
            onPlayNext
              ? 'bg-transparent border-tile-border text-text-secondary hover:text-text-primary'
              : 'bg-brand text-secondary border-none hover:opacity-90'
          }`}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
