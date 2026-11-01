import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppFonts } from '../theme/fonts';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/themes';

// Keep the native splash up until the bundled fonts are in, so text never flashes in a system font.
SplashScreen.preventAutoHideAsync();

/** Root layout: fonts, safe area, theme, and a header-less stack (splash → menu → game). */
export default function RootLayout() {
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
        <ThemedStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStack() {
  const { theme } = useTheme();
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.colors.background } }} />;
}
