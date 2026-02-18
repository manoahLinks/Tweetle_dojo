import { useFonts } from 'expo-font';

export function useFontsLoaded() {
  const [fontsLoaded, fontError] = useFonts({
    Bungee: require('../assets/fonts/Bungee-Regular.ttf'),
    FredokaOne: require('../assets/fonts/FredokaOne-Regular.ttf'),
    Inter: require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  });

  return { fontsLoaded, fontError };
}
