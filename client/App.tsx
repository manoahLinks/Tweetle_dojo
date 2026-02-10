import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from './src/hooks/SessionContext';
import { DojoContextProvider } from './src/dojo/DojoContext';
import { LandingScreen } from './src/screens/LandingScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { GameBoardScreen } from './src/screens/GameBoardScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

type Screen = 'landing' | 'dashboard' | 'gameboard' | 'leaderboard' | 'profile';
export type GameMode = 'classic' | 'daily';

export const NavigationContext = React.createContext<{
  navigate: (screen: Screen, params?: Record<string, any>) => void;
  goBack: () => void;
  params: Record<string, any>;
}>({
  navigate: () => {},
  goBack: () => {},
  params: {},
});

function Router() {
  const { isConnected } = useSession();
  const [history, setHistory] = useState<Screen[]>(['landing']);
  const [paramsStack, setParamsStack] = useState<Record<string, any>[]>([{}]);
  const currentScreen = history[history.length - 1];
  const currentParams = paramsStack[paramsStack.length - 1] || {};

  const navigate = useCallback((screen: Screen, params?: Record<string, any>) => {
    setHistory((prev) => [...prev, screen]);
    setParamsStack((prev) => [...prev, params || {}]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setParamsStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // If disconnected, reset to landing
  useEffect(() => {
    if (!isConnected) {
      setHistory(['landing']);
      setParamsStack([{}]);
    }
  }, [isConnected]);

  return (
    <NavigationContext.Provider value={{ navigate, goBack, params: currentParams }}>
      {currentScreen === 'landing' && <LandingScreen />}
      {currentScreen === 'dashboard' && <DashboardScreen />}
      {currentScreen === 'gameboard' && <GameBoardScreen />}
      {currentScreen === 'leaderboard' && <LeaderboardScreen />}
      {currentScreen === 'profile' && <ProfileScreen />}
    </NavigationContext.Provider>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <SessionProvider>
        <DojoContextProvider>
          <Router />
        </DojoContextProvider>
      </SessionProvider>
    </>
  );
}
