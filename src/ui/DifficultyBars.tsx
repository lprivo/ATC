import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Three-step difficulty bars (1 easy … 3 hard). */
export function DifficultyBars({ level }: { level: 1 | 2 | 3 }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const names = ['easy', 'medium', 'hard'];
  return (
    <View style={styles.row} accessible accessibilityLabel={`Difficulty ${names[level - 1]}`}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.bar, { height: 4 + i * 3, backgroundColor: i <= level ? c.text : c.panelBorder }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4 },
});
