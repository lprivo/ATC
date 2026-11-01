import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Banner } from '../game/hud';
import { useTheme } from '../theme/ThemeContext';
import { WarningIcon } from './icons';

export const BANNER_HEIGHT = 56;

/** Persistent `danger` banner while separation is lost, with a button that selects the first plane. */
export function ConflictBanner({ banner, onSelect }: { banner: Banner; onSelect: (id: string) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.banner, { backgroundColor: c.danger }]} testID="conflict-banner" accessibilityRole="alert">
      <WarningIcon color={c.onDanger} size={22} strokeWidth={1.75} />
      <View style={styles.text}>
        <Text style={[theme.type.barCount, styles.title, { color: c.onDanger }]}>{banner.title}</Text>
        <Text style={[theme.type.small, { color: c.onDanger }]} numberOfLines={1}>
          {banner.detail}
        </Text>
      </View>
      <Pressable
        testID="btn-conflict-select"
        accessibilityRole="button"
        accessibilityLabel="Select the first plane in conflict"
        onPress={() => onSelect(banner.selectId)}
        style={({ pressed }) => [styles.select, { borderColor: c.onDanger, borderWidth: theme.hairline, opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[theme.type.chip, { color: c.onDanger }]}>SELECT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: BANNER_HEIGHT },
  text: { flex: 1, gap: 2 },
  title: { letterSpacing: 16 * 0.04 },
  select: { paddingHorizontal: 10, height: 34, justifyContent: 'center' },
});
