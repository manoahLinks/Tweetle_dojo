import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import { DojoContextProvider, useDojo } from './src/dojo/DojoContext';
import { useFontsLoaded } from './src/fonts';
import { SplashScreen } from './src/screens/SplashScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { GameBoardScreen } from './src/screens/GameBoardScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors } from './src/theme';

type Screen = 'splash' | 'dashboard' | 'gameboard' | 'leaderboard' | 'profile';
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
  const { isLoading } = useDojo();
  const [history, setHistory] = useState<Screen[]>(['splash']);
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

  if (isLoading && currentScreen !== 'splash') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <NavigationContext.Provider value={{ navigate, goBack, params: currentParams }}>
      {currentScreen === 'splash' && <SplashScreen />}
      {currentScreen === 'dashboard' && <DashboardScreen />}
      {currentScreen === 'gameboard' && <GameBoardScreen />}
      {currentScreen === 'leaderboard' && <LeaderboardScreen />}
      {currentScreen === 'profile' && <ProfileScreen />}
    </NavigationContext.Provider>
  );
}

export default function App() {
  const { fontsLoaded, fontError } = useFontsLoaded();

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  if (fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary }}>
        <Text style={{ color: '#EF4444' }}>Font loading error: {fontError.message}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <DojoContextProvider>
        <Router />
      </DojoContextProvider>
    </>
  );
}
