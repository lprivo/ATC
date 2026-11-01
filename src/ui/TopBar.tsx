import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Sim } from '../engine/sim';
import { useTheme } from '../theme/ThemeContext';
import { clock } from './format';
import { CheckIcon, PauseIcon, PlayIcon, WarningIcon } from './icons';

export const TOP_BAR_HEIGHT = 44;

interface Props {
  sim: Sim;
  paused: boolean;
  onTogglePause: () => void;
}

/**
 * Design top bar: airport, sim clock, landed and separation-loss counts, and a
 * pause button. Everything else (theme, restart, other stats) lives in the
 * pause menu. The separation cell inverts to `danger` once there is a loss.
 */
export function TopBar({ sim, paused, onTogglePause }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const s = sim.stats;
  const lost = s.separationViolations > 0;
  const box = { backgroundColor: c.panel, borderColor: c.panelBorder, borderWidth: theme.hairline };

  return (
    <View style={styles.row} testID="top-bar">
      <View style={[styles.info, box]}>
        <Text style={[t.barTitle, { color: c.text }]}>{sim.airport.icao}</Text>
        <Text style={[t.barValue, { color: c.textDim }]}>{clock(sim.time)}</Text>
        <View style={styles.counts}>
          <View style={styles.count} accessibilityLabel={`${s.landed} landed`} testID="stat-landed">
            <CheckIcon color={c.good} />
            <Text style={[t.barCount, { color: c.good }]}>{s.landed}</Text>
          </View>
          <View
            style={[styles.count, styles.sepCell, lost && { backgroundColor: c.danger }]}
            accessibilityLabel={`${s.separationViolations} separation losses`}
            testID="stat-sep"
          >
            <WarningIcon color={lost ? c.onDanger : c.textDim} />
            <Text style={[t.barCount, { color: lost ? c.onDanger : c.textDim }]}>{s.separationViolations}</Text>
          </View>
        </View>
      </View>
      <Pressable
        testID="btn-pause"
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Resume' : 'Pause'}
        onPress={onTogglePause}
        style={({ pressed }) => [styles.pause, box, pressed && { backgroundColor: c.buttonPressed }]}
      >
        {paused ? <PlayIcon color={c.text} /> : <PauseIcon color={c.text} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, height: TOP_BAR_HEIGHT },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  counts: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, height: 28 },
  sepCell: { paddingHorizontal: 6 },
  pause: { width: TOP_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
