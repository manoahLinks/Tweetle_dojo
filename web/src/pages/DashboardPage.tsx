import { useNavigate } from 'react-router-dom';
import { useWallet } from '../providers/WalletProvider';

const PREVIEW_TILES = [
  { letter: 'T', state: 'correct' },
  { letter: 'W', state: 'present' },
  { letter: 'E', state: 'absent' },
  { letter: 'E', state: 'correct' },
  { letter: 'T', state: 'absent' },
] as const;

const TILE_COLORS: Record<string, string> = {
  correct: 'bg-tile-correct',
  present: 'bg-tile-present',
  absent: 'bg-tile-absent',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { account, username, address } = useWallet();

  const displayName = username || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl text-brand tracking-[4px] mb-1">TWEETLE</h1>
        <p className="text-text-muted text-xs font-semibold tracking-widest">
          GUESS THE WORD. PROVE YOUR SKILL.
        </p>
        {account && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full border border-brand bg-brand/10">
            <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center">
              <span className="text-secondary text-[11px] font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-text-primary text-sm font-semibold">{displayName}</span>
          </div>
        )}
      </div>

      {/* Daily Challenge Card */}
      <div className="relative bg-bg-surface rounded-xl p-5 border border-tile-border mb-4 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand" />
        <h2 className="font-heading text-lg text-text-primary mb-2 mt-1">Today's Daily Challenge</h2>
        <p className="text-text-secondary text-sm mb-4">
          Solve today's puzzle and earn up to <span className="text-brand font-bold">50 Points!</span>
        </p>

        <div className="flex justify-center gap-1.5 mb-4">
          {PREVIEW_TILES.map((tile, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-md flex items-center justify-center ${TILE_COLORS[tile.state]}`}
            >
              <span className="font-display text-lg text-text-onTile">{tile.letter}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/daily')}
          className="w-full py-3.5 rounded-lg bg-brand text-secondary font-semibold tracking-widest text-sm hover:opacity-90 transition-opacity cursor-pointer border-none"
        >
          PLAY
        </button>
      </div>

      {/* Game Modes */}
      <h2 className="font-heading text-lg text-text-primary mb-3">Choose Your Mode</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => navigate('/classic')}
          className="bg-bg-surface rounded-xl p-5 border border-tile-border text-center cursor-pointer hover:border-brand/50 transition-colors"
        >
          <span className="text-3xl block mb-2">🎯</span>
          <span className="font-heading text-lg text-text-primary block mb-1">Classic</span>
          <span className="text-text-secondary text-xs block mb-3">6 attempts{'\n'}Unlimited games</span>
          <span className="inline-block bg-bg-surfaceLight px-5 py-1.5 rounded-full text-text-primary text-sm font-semibold">
            Play
          </span>
        </button>

        <button
          onClick={() => navigate('/daily')}
          className="bg-bg-surface rounded-xl p-5 border border-brand text-center cursor-pointer hover:opacity-90 transition-opacity"
        >
          <span className="text-3xl block mb-2">📅</span>
          <span className="font-heading text-lg text-text-primary block mb-1">Daily</span>
          <span className="text-text-secondary text-xs block mb-3">1 word/day{'\n'}Max 50pts</span>
          <span className="inline-block bg-brand px-5 py-1.5 rounded-full text-secondary text-sm font-semibold">
            Play
          </span>
        </button>
      </div>

      {/* Tournament Card */}
      <button
        onClick={() => navigate('/tournaments')}
        className="w-full relative bg-bg-surface rounded-xl border border-brand overflow-hidden cursor-pointer hover:opacity-90 transition-opacity text-left"
      >
        <div className="h-[3px] bg-brand" />
        <div className="flex items-center p-4 gap-3">
          <span className="text-3xl">🏆</span>
          <div className="flex-1">
            <span className="font-heading text-base text-text-primary block">Tournament Mode</span>
            <span className="text-text-secondary text-xs">Compete with ZK-verified guesses</span>
          </div>
          <span className="inline-block bg-brand px-4 py-1.5 rounded-full text-secondary text-sm font-semibold">
            View
          </span>
        </div>
      </button>
    </div>
  );
}
