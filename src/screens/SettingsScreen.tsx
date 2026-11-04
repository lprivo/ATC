import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '../game/audio';
import { previewRadio } from '../game/radioVoice';
import { useSettings } from '../game/SettingsContext';
import type { Settings } from '../game/settings';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/themes';
import { ComingSoonTag } from '../ui/ComingSoonTag';
import { BackIcon } from '../ui/icons';
import { Segmented } from '../ui/Segmented';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { shellColumn } from '../ui/shellLayout';

/**
 * Design S4: THEME (Radar / Paper preview cards, follow system), SOUND (sound
 * effects, music and radio voice, each with a volume slider; the in-game
 * background), FEEL (haptics, controls side) and DISPLAY (units, labels,
 * label size). Every change is saved on the device straight away.
 */
export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { theme, themes } = useTheme();
  const { settings, update } = useSettings();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();
  const set = <K extends keyof Settings>(key: K) => (v: Settings[K]) => update({ [key]: v } as Partial<Settings>);

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top + 8 }]} testID="settings">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={[styles.icon, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} testID="btn-back">
          <BackIcon color={c.text} />
        </Pressable>
        <Text style={[t.title, { color: c.text }]} accessibilityRole="header">
          Settings
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Group title="THEME">
          <View style={styles.cards} accessibilityRole="radiogroup" accessibilityLabel="Theme">
            {themes.map((th) => (
              <ThemeCard
                key={th.id}
                th={th}
                selected={!settings.followSystem && settings.theme === th.id}
                onPress={() => update({ theme: th.id, followSystem: false })}
              />
            ))}
          </View>
          <Row label="Follow system light/dark" sub="Paper in light mode, Radar in dark mode">
            <Toggle value={settings.followSystem} onChange={set('followSystem')} label="Follow system light and dark mode" testID="toggle-follow" />
          </Row>
        </Group>

        <Group title="SOUND">
          <Row
            label="Sound effects"
            below={<Slider value={settings.soundVolume} onChange={set('soundVolume')} onRelease={() => playSound('select')} disabled={!settings.sound} label="Sound effects volume" testID="volume-sound" />}
          >
            <Toggle value={settings.sound} onChange={set('sound')} label="Sound effects" testID="toggle-sound" />
          </Row>
          <Row label="Music" sub="Menus, and the background in a game" below={<Slider value={settings.musicVolume} onChange={set('musicVolume')} disabled={!settings.music} label="Music volume" testID="volume-music" />}>
            <Toggle value={settings.music} onChange={set('music')} label="Music" testID="toggle-music" />
          </Row>
          <Row label="In a game" sub="Calm music, or a quiet radio room">
            <Segmented
              options={[
                { value: 'zen', label: 'Zen', testID: 'ingame-zen' },
                { value: 'radio', label: 'Radio', testID: 'ingame-radio' },
              ]}
              label="Background in a game"
              value={settings.inGameAudio}
              onChange={set('inGameAudio')}
              segmentWidth={64}
            />
          </Row>
          <Row
            label="Radio voice"
            sub="Spoken instructions + pilot readbacks"
            below={<Slider value={settings.radioVolume} onChange={set('radioVolume')} onRelease={previewRadio} disabled={!settings.radioVoice} label="Radio voice volume" testID="volume-radio" />}
          >
            <Toggle value={settings.radioVoice} onChange={set('radioVoice')} label="Radio voice" testID="toggle-radio-voice" />
          </Row>
        </Group>

        <Group title="FEEL">
          <Row label="Haptics">
            <Toggle value={settings.haptics} onChange={set('haptics')} label="Haptics" testID="toggle-haptics" />
          </Row>
          <Row label="Controls on" sub="Mirrors the sheet and re-centre for left-handed play">
            <Segmented
              options={[
                { value: 'left', label: 'Left', testID: 'hand-left' },
                { value: 'right', label: 'Right', testID: 'hand-right' },
              ]}
              label="Controls on"
              value={settings.handedness}
              onChange={set('handedness')}
            />
          </Row>
        </Group>

        <Group title="DISPLAY">
          <Row label="Altitude">
            <Segmented label="Altitude unit" options={[{ value: 'ft', label: 'ft', a11y: 'Feet' }, { value: 'm', label: 'm', a11y: 'Metres' }]} value={settings.altUnit} onChange={set('altUnit')} segmentWidth={56} />
          </Row>
          <Row label="Distance">
            <Segmented label="Distance unit" options={[{ value: 'nm', label: 'nm', a11y: 'Nautical miles' }, { value: 'km', label: 'km', a11y: 'Kilometres' }]} value={settings.distUnit} onChange={set('distUnit')} segmentWidth={56} />
          </Row>
          <Row label="Plane labels">
            <Segmented
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'full', label: 'Full' },
                { value: 'min', label: 'Min' },
              ]}
              label="Plane labels"
              value={settings.labelMode}
              onChange={set('labelMode')}
              segmentWidth={56}
            />
          </Row>
          <Row label="Label size">
            <Segmented
              options={[
                { value: 'S', label: 'S', a11y: 'Small' },
                { value: 'M', label: 'M', a11y: 'Medium' },
                { value: 'L', label: 'L', a11y: 'Large' },
              ]}
              label="Label size"
              value={settings.labelSize}
              onChange={set('labelSize')}
              segmentWidth={44}
            />
          </Row>
        </Group>
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[theme.type.caps, { color: theme.colors.textDim }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** A setting: its name (and a line about it) with the control on the right; `below` goes underneath, full width (a volume slider). */
function Row({ label, sub, soon, below, children }: { label: string; sub?: string; soon?: boolean; below?: ReactNode; children: ReactNode }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const line = (
    <>
      <View style={styles.rowText}>
        <View style={styles.rowTitle}>
          <Text style={[t.bodyStrong, { color: soon ? c.textDim : c.text }]}>{label}</Text>
          {soon && <ComingSoonTag />}
        </View>
        {sub && <Text style={[t.smallTight, { color: c.textDim }]}>{sub}</Text>}
      </View>
      {children}
    </>
  );
  const border = { borderBottomColor: c.panelBorder, borderBottomWidth: theme.hairline };
  if (!below) return <View style={[styles.row, border]}>{line}</View>;
  return (
    <View style={[styles.rowStack, border]}>
      <View style={[styles.row, styles.rowInner]}>{line}</View>
      {below}
    </View>
  );
}

/**
 * Design S4 theme card: a small scope in the theme's own colours (a ring and a
 * plane with its callsign), then the theme's name. The selected card has an
 * `accent` border and a ● after its name.
 */
function ThemeCard({ th, selected, onPress }: { th: Theme; selected: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const k = th.colors;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${th.name} theme`}
      onPress={onPress}
      testID={`theme-card-${th.id}`}
      style={({ pressed }) => [styles.card, { borderColor: selected ? c.accent : c.panelBorder, borderWidth: theme.hairline, backgroundColor: pressed ? c.buttonPressed : 'transparent' }]}
    >
      {/* Design: a preview the same colour as the screen behind it gets a hairline so it doesn't vanish; a contrasting one has none. */}
      <View style={[styles.preview, { backgroundColor: k.background }, k.background === c.background && { borderColor: k.rangeRing, borderWidth: theme.hairline }]}>
        <View style={[styles.ring, { borderColor: k.rangeRing, borderWidth: theme.hairline }]} />
        <View style={[styles.blip, { borderColor: k.plane }]} />
        <Text style={[theme.type.previewLabel, styles.callsign, { color: k.plane }]}>WZZ12</Text>
      </View>
      <View style={styles.cardFoot}>
        <Text style={[theme.type.barCount, { color: c.text }]}>{th.name}</Text>
        {selected && <Text style={[theme.type.barCount, { color: c.accent }]}>●</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { ...shellColumn, flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 24 },
  group: { gap: 8 },
  cards: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, padding: 8, gap: 8 },
  preview: { height: 70, overflow: 'hidden' },
  ring: { position: 'absolute', left: 26, top: 12, width: 44, height: 44, borderRadius: 22 },
  blip: { position: 'absolute', left: 46, top: 28, width: 8, height: 8, borderWidth: 1.5 },
  callsign: { position: 'absolute', left: 58, top: 20 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowStack: { paddingBottom: 8 },
  rowInner: { paddingBottom: 0 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
