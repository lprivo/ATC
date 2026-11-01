import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/game/GameScreen';
import { useAppFonts } from './src/theme/fonts';
import { ThemeProvider } from './src/theme/ThemeContext';
import { themes } from './src/theme/themes';

// Keep the native splash up until the bundled fonts are in, so text never flashes in a system font.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const fontsReady = useAppFonts();
  useEffect(() => {
    if (fontsReady) SplashScreen.hide();
  }, [fontsReady]);
  if (!fontsReady) {
    // Native keeps the splash up; the web has no splash, so show the default theme's background instead of a blank page.
    return Platform.OS === 'web' ? <View style={{ flex: 1, backgroundColor: themes[0].colors.background }} /> : null;
  }
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GameScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
