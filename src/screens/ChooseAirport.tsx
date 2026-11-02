import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type CatalogueAirport, type Region } from '../engine/data/airports';
import { useEntitlement } from '../game/EntitlementContext';
import { allows, findAirports, regionCounts } from '../game/session';
import { useTheme } from '../theme/ThemeContext';
import { DifficultyBars } from '../ui/DifficultyBars';
import { BackIcon, LockIcon, SearchIcon } from '../ui/icons';
import { RunwayPreview } from '../ui/RunwayPreview';
import { UnlockOffer } from '../ui/UnlockOffer';

/**
 * Design S3a: search, region chips, the free airport pinned as a card, the
 * full-version list (locked rows open the offer), and a sticky unlock bar.
 */
export function ChooseAirport({ onPick, onBack }: { onPick: (icao: string) => void; onBack: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();
  const { entitlement } = useEntitlement();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Region | 'All'>('All');
  const [offer, setOffer] = useState<string | null>(null);
  const found = findAirports(query, region);
  const free = found.filter((ap) => ap.free);
  const rest = found.filter((ap) => !ap.free);
  const box = { borderColor: c.panelBorder, borderWidth: theme.hairline };

  // Full-version airports without a layout yet are "coming soon": no purchase prompt for players who own it.
  const comingSoon = (ap: CatalogueAirport) => entitlement === 'full' && !ap.playable;
  const open = (ap: CatalogueAirport) => {
    if (allows.airport(entitlement, ap)) onPick(ap.icao);
    else if (!comingSoon(ap)) setOffer(ap.playable ? `${ap.name} is in the full version.` : `${ap.name} is coming to the full version.`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top + 8 }]} testID="choose-airport">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={[styles.icon, box]} testID="btn-back">
          <BackIcon color={c.text} />
        </Pressable>
        <Text style={[t.title, { color: c.text }]} accessibilityRole="header">
          Choose airport
        </Text>
      </View>
      <View style={[styles.search, box, { backgroundColor: c.panel }]}>
        <SearchIcon color={c.textDim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search city, airport or ICAO"
          placeholderTextColor={c.textDim}
          style={[t.body, styles.input, { color: c.text }]}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search airports"
          testID="airport-search"
        />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {regionCounts().map(({ region: r, count }) => {
            const active = r === region;
            return (
              <Pressable
                key={r}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setRegion(r)}
                style={[styles.chip, box, active && { backgroundColor: c.accent, borderColor: c.accent }]}
              >
                <Text style={[t.barCount, { color: active ? c.background : c.text }]}>
                  {r} {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        data={rest}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        keyExtractor={(ap) => ap.icao}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        ListHeaderComponent={
          <View style={styles.listHead}>
            {free.map((ap) => (
              <Pressable key={ap.icao} onPress={() => open(ap)} accessibilityRole="button" accessibilityLabel={`${ap.name}, free. Play`} style={[styles.card, box, { backgroundColor: c.panel }]} testID={`airport-${ap.icao}`}>
                <RunwayPreview icao={ap.icao} size={64} />
                <View style={styles.cardText}>
                  <View style={styles.cardRow}>
                    <Text style={[t.barTitle, { color: c.text }]}>{ap.icao}</Text>
                    <Text style={[t.chip, styles.tag, { color: c.onGood, backgroundColor: c.good }]}>FREE</Text>
                  </View>
                  <Text style={[t.small, { color: c.text }]} numberOfLines={1}>
                    {ap.name}
                  </Text>
                  <DifficultyBars level={ap.difficulty} />
                </View>
              </Pressable>
            ))}
            <View style={styles.sectionHead}>
              <Text style={[t.caps, { color: c.textDim }]}>FULL VERSION · {rest.length}</Text>
              <Text style={[t.caps, { color: c.textDim }]}>SORT: DIFFICULTY ↑</Text>
            </View>
          </View>
        }
        renderItem={({ item: ap }) => (
          <Pressable
            onPress={() => open(ap)}
            accessibilityRole="button"
            accessibilityLabel={`${ap.icao}, ${ap.name}, ${ap.country}. ${allows.airport(entitlement, ap) ? 'Play' : comingSoon(ap) ? 'Coming soon' : 'Locked, full version'}`}
            style={({ pressed }) => [styles.row, { borderBottomColor: c.panelBorder, borderBottomWidth: theme.hairline }, pressed && { backgroundColor: c.buttonPressed }]}
            testID={`airport-${ap.icao}`}
          >
            <Text style={[t.barTitle, styles.icao, { color: c.text }]}>{ap.icao}</Text>
            <View style={styles.rowText}>
              <Text style={[t.bodyStrong, { color: c.text }]} numberOfLines={1}>
                {ap.name}
              </Text>
              <Text style={[t.smallTight, { color: c.textDim }]}>{ap.country}</Text>
            </View>
            <DifficultyBars level={ap.difficulty} />
            {comingSoon(ap) ? (
              <Text style={[t.chip, { color: c.textDim }]}>SOON</Text>
            ) : (
              !allows.airport(entitlement, ap) && <LockIcon color={c.textDim} />
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          found.length === 0 ? <Text style={[t.small, { color: c.textDim, paddingVertical: 12 }]}>No airport matches “{query}”.</Text> : undefined
        }
      />
      {entitlement === 'free' && (
        <View style={[styles.sticky, { backgroundColor: c.panel, borderTopColor: c.panelBorder, borderTopWidth: theme.hairline, paddingBottom: insets.bottom + 12 }]}>
          <Pressable onPress={() => setOffer('')} accessibilityRole="button" style={[styles.unlock, { backgroundColor: c.accent }]} testID="btn-unlock">
            <Text style={[t.button, { color: c.background }]}>UNLOCK FULL VERSION</Text>
            <Text style={[t.smallTight, { color: c.background }]}>All airports · custom sessions · one purchase · € —</Text>
          </Pressable>
        </View>
      )}
      {offer !== null && <UnlockOffer reason={offer || undefined} onClose={() => setOffer(null)} bottomInset={insets.bottom} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  input: { flex: 1, height: 44, paddingVertical: 0 },
  chips: { gap: 8 },
  chip: { height: 36, paddingHorizontal: 12, justifyContent: 'center' },
  listHead: { gap: 12, paddingTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  cardText: { flex: 1, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { paddingHorizontal: 6, paddingVertical: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  row: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icao: { width: 50 },
  rowText: { flex: 1 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12 },
  unlock: { height: 64, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
