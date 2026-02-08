import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from './src/hooks/SessionContext';
import { DojoContextProvider } from './src/dojo/DojoContext';
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

  const navigate = useCallback((screen: Screen) => {
    setHistory((prev) => [...prev, screen]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // If disconnected, reset to landing
  useEffect(() => {
    if (!isConnected) {
      setHistory(['landing']);
    }
  }, [isConnected]);

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
      <DojoContextProvider>
        <SessionProvider>
          <Router />
        </SessionProvider>
      </DojoContextProvider>
    </>
  );
}
