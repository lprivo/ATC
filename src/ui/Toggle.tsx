import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Design S4 toggle: square, 52×30; the knob slides right and fills with `accent` when on. */
export function Toggle({ value, onChange, label, disabled, testID }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; testID?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={7}
      style={[styles.track, { borderColor: value ? c.accent : c.panelBorder, borderWidth: theme.hairline, backgroundColor: value ? c.accent : c.button, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.knob, { backgroundColor: value ? c.background : c.textDim, alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 30, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22 },
});
