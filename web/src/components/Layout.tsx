import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from './ConnectButton';

const NAV_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/classic', label: 'Classic' },
  { path: '/daily', label: 'Daily' },
  { path: '/tournaments', label: 'Tournaments' },
  { path: '/admin', label: 'Admin' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <header className="bg-bg-surface border-b border-tile-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="font-display text-xl text-brand">TWEETLE</span>
          </Link>

          <nav className="flex items-center gap-3">
            {NAV_LINKS.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`text-sm no-underline transition-colors ${
                  location.pathname === path
                    ? 'text-brand'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </Link>
            ))}
            <ConnectButton />
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
