import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TIME_SCALES } from '../game/useSim';
import { useTheme } from '../theme/ThemeContext';

/** Sim speed segmented control: ×1 ×2 ×4 ×8, each 46×44; the active one is filled with `accent`. */
export function SpeedControl({ value, onChange }: { value: number; onChange: (s: number) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.row, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} accessibilityRole="radiogroup">
      {TIME_SCALES.map((s, i) => {
        const active = s === value;
        return (
          <Pressable
            key={s}
            testID={`speed-${s}`}
            accessibilityRole="radio"
            accessibilityLabel={`Sim speed times ${s}`}
            accessibilityState={{ checked: active }}
            onPress={() => onChange(s)}
            style={[
              styles.segment,
              i > 0 && { borderLeftColor: c.panelBorder, borderLeftWidth: theme.hairline },
              active && { backgroundColor: c.accent },
            ]}
          >
            <Text style={[theme.type.barCount, { color: active ? c.background : c.text }]}>×{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'flex-start' },
  segment: { width: 46, height: 44, alignItems: 'center', justifyContent: 'center' },
});
