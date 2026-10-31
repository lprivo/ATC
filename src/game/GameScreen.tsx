import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LHBP } from '../engine/airports/lhbp';
import { useTheme } from '../theme/ThemeContext';
import { PlanePanel } from '../ui/PlanePanel';
import { Radar } from '../ui/Radar';
import { TopBar } from '../ui/TopBar';
import { useSim } from './useSim';

export function GameScreen() {
  const { theme } = useTheme();
  const { sim, paused, setPaused, timeScale, cycleTimeScale, restart, refresh } = useSim(LHBP);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.panel }} edges={['top', 'bottom']}>
      <StatusBar style={theme.statusBar} />
      <TopBar
        sim={sim}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        timeScale={timeScale}
        onCycleTimeScale={cycleTimeScale}
        onRestart={() => {
          setSelectedId(null);
          restart();
        }}
      />
      <View style={{ flex: 1 }}>
        <Radar sim={sim} selectedId={selectedId} onSelect={setSelectedId} onCommand={refresh} />
      </View>
      <PlanePanel sim={sim} selectedId={selectedId} onClose={() => setSelectedId(null)} onCommand={refresh} />
    </SafeAreaView>
  );
}
