import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface SegmentOption<T> {
  value: T;
  label: string;
  /** Screen-reader label, if the visible one is terse (e.g. "×2"). */
  a11y?: string;
  testID?: string;
}

/**
 * Design segmented control: hairline box, hairline dividers, the active
 * segment filled with `accent` (text in `background`); 44 pt tall. A radio group.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  segmentWidth,
  label,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Fixed segment width (e.g. 46 for the sim speed); otherwise sized to the label. */
  segmentWidth?: number;
  /** What the group is, for screen readers (e.g. "Altitude unit"). */
  label?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.row, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            testID={o.testID}
            accessibilityRole="radio"
            accessibilityLabel={o.a11y ?? o.label}
            accessibilityState={{ checked: active }}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              segmentWidth ? { width: segmentWidth } : styles.auto,
              i > 0 && { borderLeftColor: c.panelBorder, borderLeftWidth: theme.hairline },
              active && { backgroundColor: c.accent },
            ]}
          >
            <Text style={[theme.type.barCount, { color: active ? c.background : c.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'flex-start' },
  segment: { height: 44, alignItems: 'center', justifyContent: 'center' },
  auto: { minWidth: 88, paddingHorizontal: 12 },
});
