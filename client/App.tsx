import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from './src/hooks/SessionContext';
import { LandingScreen } from './src/screens/LandingScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { GameBoardScreen } from './src/screens/GameBoardScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';

type Screen = 'landing' | 'dashboard' | 'gameboard' | 'leaderboard';

export const NavigationContext = React.createContext<{
  navigate: (screen: Screen) => void;
  goBack: () => void;
}>({
  navigate: () => {},
  goBack: () => {},
});

function Router() {
  const { isConnected } = useSession();
  const [history, setHistory] = useState<Screen[]>(['landing']);
  const currentScreen = history[history.length - 1];

  const navigate = (screen: Screen) => {
    setHistory((prev) => [...prev, screen]);
  };

  const goBack = () => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  // If not connected, always show landing
  if (!isConnected && currentScreen !== 'landing') {
    setHistory(['landing']);
  }

  return (
    <NavigationContext.Provider value={{ navigate, goBack }}>
      {currentScreen === 'landing' && <LandingScreen />}
      {currentScreen === 'dashboard' && <DashboardScreen />}
      {currentScreen === 'gameboard' && <GameBoardScreen />}
      {currentScreen === 'leaderboard' && <LeaderboardScreen />}
    </NavigationContext.Provider>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <SessionProvider>
        <Router />
      </SessionProvider>
    </>
  );
}
