import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Sim } from '../engine/sim';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  sim: Sim;
  paused: boolean;
  onTogglePause: () => void;
  timeScale: number;
  onCycleTimeScale: () => void;
  onRestart: () => void;
}

const clock = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function TopBar({ sim, paused, onTogglePause, timeScale, onCycleTimeScale, onRestart }: Props) {
  const { theme, cycleTheme } = useTheme();
  const c = theme.colors;
  const s = sim.stats;

  return (
    <View style={[styles.bar, { backgroundColor: c.panel, borderColor: c.panelBorder, borderBottomWidth: theme.hairline }]}>
      <View style={styles.row}>
        <Text style={[theme.type.barTitle, { color: c.text }]}>
          {sim.airport.icao} <Text style={[theme.type.barValue, { color: c.textDim }]}>{clock(sim.time)}</Text>
        </Text>
        <View style={styles.buttons}>
          <Btn testID="btn-pause" label={paused ? '▶' : '❚❚'} onPress={onTogglePause} />
          <Btn testID="btn-speed" label={`×${timeScale}`} onPress={onCycleTimeScale} />
          <Btn testID="btn-theme" label={theme.name} onPress={cycleTheme} />
          <Btn testID="btn-restart" label="↺" onPress={onRestart} />
        </View>
      </View>
      <Text style={[theme.type.smallTight, { color: c.textDim }]} testID="stats">
        <Text style={{ color: c.good }}>Landed {s.landed}</Text>
        {'  '}
        <Text style={{ color: s.separationViolations ? c.danger : c.textDim }}>Sep {s.separationViolations}</Text>
        {'  '}Go-arounds {s.goArounds}{'  '}Exits {s.exited}{'  '}Airborne {sim.planes.length}
      </Text>
    </View>
  );
}

function Btn({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { borderColor: c.panelBorder, borderWidth: theme.hairline, backgroundColor: pressed ? c.buttonPressed : c.button }]}
    >
      <Text style={[theme.type.barCount, { color: c.buttonText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttons: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 10, height: 36, alignItems: 'center', justifyContent: 'center', minWidth: 36 },
});
