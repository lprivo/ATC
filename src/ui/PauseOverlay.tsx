import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TIME_SCALES } from '../game/useSim';
import { useTheme } from '../theme/ThemeContext';

interface Props {
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
export function PauseOverlay({ timeScale, onTimeScale, onResume, onRestart }: Props) {
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
    <View style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: c.scrim }]} testID="pause-overlay">
      <View style={[styles.panel, box, { backgroundColor: c.panel }]}>
        <Text style={[t.caps, { color: c.textDim }]}>PAUSED</Text>
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
  button: { height: 56, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
});
