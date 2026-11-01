import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { Banner } from '../game/hud';
import { useTheme } from '../theme/ThemeContext';
import { WarningIcon } from './icons';

/** Persistent `danger` banner while separation is lost, with a button that selects the first plane. */
export function ConflictBanner({
  banner,
  onSelect,
  onHeight,
}: {
  banner: Banner;
  onSelect: (id: string) => void;
  /** Reports the banner's height, so the toasts can stack under it. */
  onHeight: (h: number) => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  // iOS doesn't announce role="alert" by itself: announce each new conflict pair.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${banner.title}. ${banner.detail}`);
  }, [banner.title, banner.detail.split(' — ')[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View
      style={[styles.banner, { backgroundColor: c.danger }]}
      testID="conflict-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      onLayout={(e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height)}
    >
      <WarningIcon color={c.onDanger} size={22} strokeWidth={1.75} />
      <View style={styles.text}>
        <Text style={[theme.type.bannerTitle, { color: c.onDanger }]}>{banner.title}</Text>
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  text: { flex: 1, gap: 2 },
  select: { paddingHorizontal: 10, minHeight: 44, justifyContent: 'center' },
});
