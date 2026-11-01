import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Sim } from '../engine/sim';
import { TIME_SCALES } from '../game/useSim';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  sim: Sim;
  timeScale: number;
  onTimeScale: (s: number) => void;
  onResume: () => void;
  onRestart: () => void;
}

/**
 * Interim pause menu: the settings that left the top bar (theme, restart, sim
 * speed). The full pause menu with score and stats is #12; sim speed moves to
 * the bottom sheet in #9.
 */
export function PauseOverlay({ sim, timeScale, onTimeScale, onResume, onRestart }: Props) {
  const { theme, cycleTheme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const box = { borderColor: c.panelBorder, borderWidth: theme.hairline };
  const btn = (label: string, onPress: () => void, testID: string, primary = false, grow = false) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, grow && styles.grow, box, { backgroundColor: primary ? c.accent : pressed ? c.buttonPressed : c.button }]}
    >
      <Text style={[t.button, { color: primary ? c.background : c.buttonText }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: c.scrim }]} testID="pause-overlay" accessibilityViewIsModal>
      <View style={[styles.panel, box, { backgroundColor: c.panel }]}>
        <Text style={[t.caps, { color: c.textDim }]}>PAUSED</Text>
        {/* The stats that left the top bar; the full stat grid comes with the pause menu (#12). */}
        <View style={styles.stats} testID="pause-stats">
          {[
            ['LANDED', sim.stats.landed],
            ['SEP. LOST', sim.stats.separationViolations],
            ['GO-AROUND', sim.stats.goArounds],
            ['EXITS', sim.stats.exited],
            ['AIRBORNE', sim.planes.length],
          ].map(([label, n]) => (
            <View key={label} style={styles.stat} accessible accessibilityLabel={`${label}: ${n}`}>
              <Text style={[t.barTitle, { color: c.text }]}>{n}</Text>
              <Text style={[t.capsSmall, { color: c.textDim }]}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={[t.capsSmall, { color: c.textDim }]}>SIM SPEED</Text>
        <View style={[styles.segments, box]}>
          {TIME_SCALES.map((s) => (
            <Pressable
              key={s}
              testID={`speed-${s}`}
              accessibilityRole="button"
              accessibilityState={{ selected: s === timeScale }}
              onPress={() => onTimeScale(s)}
              style={[styles.segment, { backgroundColor: s === timeScale ? c.accent : 'transparent' }]}
            >
              <Text style={[t.barCount, { color: s === timeScale ? c.background : c.text }]}>×{s}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          {btn(`Theme: ${theme.name}`, cycleTheme, 'btn-theme', false, true)}
          {btn('Restart', onRestart, 'btn-restart', false, true)}
        </View>
        {btn('RESUME', onResume, 'btn-resume', true)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { justifyContent: 'flex-end' },
  panel: { padding: 16, paddingBottom: 40, gap: 12 },
  segments: { flexDirection: 'row', alignSelf: 'flex-start' },
  segment: { width: 46, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'flex-start', gap: 2 },
  button: { height: 56, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
});
