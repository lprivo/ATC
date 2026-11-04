import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setMusicTrack } from '../game/audio';
import { EntitlementProvider } from '../game/EntitlementContext';
import { ResultsProvider } from '../game/ResultsContext';
import { SettingsProvider, useSettings } from '../game/SettingsContext';
import { musicForRoute } from '../game/sound';
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
      <SettingsProvider>
        <ThemeProvider>
          <EntitlementProvider>
            <ResultsProvider>
              <ThemedStack />
            </ResultsProvider>
          </EntitlementProvider>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function ThemedStack() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.statusBar} />
      <MusicDirector />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.colors.background } }}>
        {/* No swipe-back out of a live game: leaving goes through the pause menu's confirmed Quit. */}
        <Stack.Screen name="game" options={{ gestureEnabled: false }} />
        {/* The summary replaces the game; back goes to the menu, not into the finished session. */}
        <Stack.Screen name="summary" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}

/** The music follows the screen: the menu track, or in a game the Zen loop or the radio room (see `musicForRoute`). */
function MusicDirector() {
  const path = usePathname();
  const { settings } = useSettings();
  useEffect(() => setMusicTrack(musicForRoute(path, settings.inGameAudio)), [path, settings.inGameAudio]);
  return null;
}
