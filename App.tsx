import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/game/GameScreen';
import { ThemeProvider } from './src/theme/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GameScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
