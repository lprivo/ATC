import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/game/GameScreen';
import { useAppFonts } from './src/theme/fonts';
import { ThemeProvider } from './src/theme/ThemeContext';
import { radarTheme } from './src/theme/themes';

export default function App() {
  const fontsReady = useAppFonts();
  // Hold the first frame until the bundled fonts are in, so text never flashes in a system font.
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: radarTheme.colors.background }} />;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GameScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
