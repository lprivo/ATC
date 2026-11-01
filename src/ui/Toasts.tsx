import { StyleSheet, Text, View } from 'react-native';
import type { Toast } from '../game/hud';
import { useTheme } from '../theme/ThemeContext';

/** Event toasts, stacked top-left (newest first, at most two). */
export function Toasts({ toasts }: { toasts: readonly Toast[] }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const tone = { good: c.good, danger: c.danger, dim: c.textDim };
  return (
    <View style={styles.stack} pointerEvents="none" testID="toasts">
      {toasts.map((t) => (
        <View key={t.seq} style={[styles.toast, { backgroundColor: c.panel, borderColor: c.panelBorder, borderWidth: theme.hairline }]}>
          <Text style={[theme.type.chip, styles.chip, { color: tone[t.tone], borderColor: tone[t.tone], borderWidth: theme.hairline }]}>{t.chip}</Text>
          <Text style={[theme.type.bodyStrong, { color: c.text }]} numberOfLines={1}>
            {t.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 6, alignItems: 'flex-start' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 10, maxWidth: '100%' },
  chip: { paddingVertical: 2, paddingHorizontal: 4 },
});
