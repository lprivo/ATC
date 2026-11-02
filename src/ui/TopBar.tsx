import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Sim } from '../engine/sim';
import { useTheme } from '../theme/ThemeContext';
import { sessionClock } from '../game/hud';
import { TOP_BAR_HEIGHT } from './hudLayout';
import { CheckIcon, PauseIcon, PlayIcon, WarningIcon } from './icons';

interface Props {
  sim: Sim;
  paused: boolean;
  onTogglePause: () => void;
  /** Session length in sim seconds (the clock counts down to it), or null for endless (it counts up). */
  sessionSec?: number | null;
}

/**
 * Design top bar: airport, sim clock (time left in a timed session), landed and separation-loss counts, and a
 * pause button. Everything else (theme, restart, other stats) lives in the
 * pause menu. The separation cell inverts to `danger` once there is a loss.
 */
export function TopBar({ sim, paused, onTogglePause, sessionSec = null }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const s = sim.stats;
  const lost = s.separationViolations > 0;
  const time = sessionClock(sim.time, sessionSec);
  const box = { backgroundColor: c.panel, borderColor: c.panelBorder, borderWidth: theme.hairline };

  return (
    <View style={styles.row} testID="top-bar" pointerEvents="box-none">
      <View style={[styles.info, box]}>
        <Text style={[t.barTitle, { color: c.text }]}>{sim.airport.icao}</Text>
        <View style={styles.clock} accessible accessibilityLabel={time.a11y} testID="session-clock">
          <Text style={[t.barValue, { color: time.lastMinute ? c.text : c.textDim }]}>{time.text}</Text>
          {time.label && <Text style={[t.capsSmall, { color: c.textDim }]}>{time.label}</Text>}
        </View>
        <View style={styles.counts}>
          <View style={styles.count} accessible accessibilityLabel={`${s.landed} landed`} testID="stat-landed">
            <CheckIcon color={c.good} />
            <Text style={[t.barCount, { color: c.good }]}>{s.landed}</Text>
          </View>
          <View
            style={[styles.count, styles.sepCell, lost && { backgroundColor: c.danger }]}
            accessible
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
  clock: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  counts: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, height: 28 },
  sepCell: { paddingHorizontal: 6 },
  pause: { width: TOP_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
