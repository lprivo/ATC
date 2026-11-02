import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATALOGUE } from '../engine/data/airports';
import { useEntitlement } from '../game/EntitlementContext';
import { allows, FREE_SESSION, LENGTHS, lengthLabel, sessionLabel, TRAFFIC_LABEL, TRAFFIC_PER_HOUR, type Session, type SessionLength, type Traffic } from '../game/session';
import { useTheme } from '../theme/ThemeContext';
import { DifficultyBars } from '../ui/DifficultyBars';
import { BackIcon, LockIcon } from '../ui/icons';
import { RunwayPreview } from '../ui/RunwayPreview';
import { UnlockOffer } from '../ui/UnlockOffer';

const TRAFFIC: readonly Traffic[] = ['light', 'steady', 'busy'];

/**
 * Design S3b: runway preview, name and runways, difficulty; TRAFFIC and LENGTH.
 * The free version is fixed at Steady and 30 min: other options are dimmed
 * with a lock and open the offer; an upsell box sits below. START begins the session.
 */
export function SessionSetup({ icao, onStart, onBack }: { icao: string; onStart: (s: Session) => void; onBack: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();
  const { entitlement } = useEntitlement();
  const ap = CATALOGUE.find((a) => a.icao === icao) ?? CATALOGUE[0];
  const [traffic, setTraffic] = useState<Traffic>(FREE_SESSION.traffic);
  const [length, setLength] = useState<SessionLength>(FREE_SESSION.length);
  const [offer, setOffer] = useState<string | null>(null);
  const session: Session = { icao: ap.icao, traffic, length };
  const box = { borderColor: c.panelBorder, borderWidth: theme.hairline };
  const free = entitlement === 'free';

  const option = <T,>(label: string, value: T, selected: boolean, allowed: boolean, pick: (v: T) => void, lockedReason: string, testID: string) => (
    <Pressable
      key={label}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !allowed }}
      accessibilityLabel={allowed ? label : `${label}, full version`}
      onPress={() => (allowed ? pick(value) : setOffer(lockedReason))}
      style={[styles.option, box, selected && { backgroundColor: c.accent, borderColor: c.accent }, !allowed && styles.locked]}
    >
      <Text style={[t.barCount, { color: selected ? c.background : c.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top + 8 }]} testID="session-setup">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={[styles.icon, box]} testID="btn-back">
          <BackIcon color={c.text} />
        </Pressable>
        <Text style={[t.title, { color: c.text }]} accessibilityRole="header">
          {ap.icao}
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 110 + insets.bottom }]}>
        <View style={styles.airport}>
          <RunwayPreview icao={ap.icao} size={110} />
          <View style={styles.airportText}>
            <Text style={[t.barTitle, { color: c.text }]}>{ap.name}</Text>
            <Text style={[t.small, { color: c.textDim }]}>{ap.runways}</Text>
            <DifficultyBars level={ap.difficulty} />
          </View>
        </View>
        <Section label="TRAFFIC" locked={free}>
          {TRAFFIC.map((tr) =>
            option(`${TRAFFIC_LABEL[tr]} ~${TRAFFIC_PER_HOUR[tr]}/hr`, tr, tr === traffic, allows.traffic(entitlement, tr), setTraffic, `${TRAFFIC_LABEL[tr]} traffic is in the full version.`, `traffic-${tr}`),
          )}
        </Section>
        <Section label="LENGTH" locked={free}>
          {LENGTHS.map((l) => option(lengthLabel(l), l, l === length, allows.length(entitlement, l), setLength, `${lengthLabel(l)} sessions are in the full version.`, `length-${l}`))}
        </Section>
        {free && (
          <View style={[styles.upsell, { borderColor: c.panelBorder }]}>
            <Text style={[t.small, { color: c.text, flex: 1 }]}>Choose traffic and session length, and fly every airport, in the full version.</Text>
            <Pressable accessibilityRole="button" onPress={() => setOffer('')} style={[styles.seeOffer, box]} testID="btn-see-offer">
              <Text style={[t.chip, { color: c.text }]}>SEE OFFER</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <View style={[styles.sticky, { backgroundColor: c.background, paddingBottom: insets.bottom + 12 }]}>
        <Pressable accessibilityRole="button" onPress={() => onStart(session)} style={({ pressed }) => [styles.start, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]} testID="btn-start">
          <Text style={[t.buttonLarge, { color: c.background }]}>START · {sessionLabel(session)}</Text>
        </Pressable>
      </View>
      {offer !== null && <UnlockOffer reason={offer || undefined} onClose={() => setOffer(null)} bottomInset={insets.bottom} />}
    </View>
  );

  function Section({ label, locked, children }: { label: string; locked: boolean; children: ReactNode }) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[t.caps, { color: c.textDim }]}>{label}</Text>
          {locked && <LockIcon color={c.textDim} size={13} />}
        </View>
        <View style={styles.options} accessibilityRole="radiogroup">
          {children}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 20 },
  airport: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  airportText: { flex: 1, gap: 6 },
  section: { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  locked: { opacity: 0.5 },
  upsell: { borderWidth: 1, borderStyle: 'dashed', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  seeOffer: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  sticky: { position: 'absolute', left: 16, right: 16, bottom: 0, paddingTop: 12 },
  start: { height: 64, alignItems: 'center', justifyContent: 'center' },
});
