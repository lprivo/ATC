import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bestList } from '../game/bestScores';
import { useResults } from '../game/ResultsContext';
import { lengthLabel, TRAFFIC_LABEL, type SessionLength, type Traffic } from '../game/session';
import { useTheme } from '../theme/ThemeContext';
import { BackIcon } from '../ui/icons';

/** Best scores kept on this device, one per airport + traffic + length, highest first. */
export function BestScoresScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();
  const { bests } = useResults();
  const list = bestList(bests);
  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top + 8 }]} testID="best-scores">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={[styles.icon, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} testID="btn-back">
          <BackIcon color={c.text} />
        </Pressable>
        <Text style={[t.title, { color: c.text }]} accessibilityRole="header">
          Best scores
        </Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(b) => b.key}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={<Text style={[t.body, { color: c.textDim, paddingVertical: 16 }]}>No scores yet. Finish a session to set one.</Text>}
        renderItem={({ item: b }) => {
          const len = b.length === 'endless' ? 'endless' : (Number(b.length) as SessionLength);
          return (
            <View style={[styles.row, { borderBottomColor: c.panelBorder, borderBottomWidth: theme.hairline }]}>
              <Text style={[t.barTitle, styles.icao, { color: c.text }]}>{b.icao}</Text>
              <Text style={[t.small, styles.what, { color: c.textDim }]}>
                {TRAFFIC_LABEL[b.traffic as Traffic] ?? b.traffic} · {lengthLabel(len)}
              </Text>
              <Text style={[t.barTitle, { color: c.text }]}>{b.score.toLocaleString('en-GB')}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icao: { width: 56 },
  what: { flex: 1 },
});
