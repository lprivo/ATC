import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRight } from '../ui/icons';
import { RadarBackdrop } from '../ui/RadarBackdrop';

interface Props {
  onPlay: () => void;
  /** Screens that arrive with later issues are shown but inert until wired. */
  onChooseAirport?: () => void;
  onHowToPlay?: () => void;
  onBestScores?: () => void;
  onSettings?: () => void;
  /** e.g. "Best · 1,240 at LHBP, Steady, 30 min"; omitted until there is one. */
  bestLine?: string;
}

/** The menu is laid out for a phone; on a wide (web) window it stays phone-width and centred. */
const MAX_CONTENT_WIDTH = 480;

/**
 * Design S2: wordmark top-left with the best-score line; actions in the bottom
 * half: PLAY (primary, 72 high, blueprint corner marks, chevron), Choose
 * airport, an inert "Replay a real day" (COMING SOON), and How to play /
 * Best scores / Settings. Labels sit left with a chevron on the right.
 */
export function MainMenu({ onPlay, onChooseAirport, onHowToPlay, onBestScores, onSettings, bestLine }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]} testID="main-menu">
      {/* Design: rings centred 300 pt down an 844 pt screen, 9 pt/nm, at 70% opacity. */}
      <RadarBackdrop centreY={300 / 844} scale={9} opacity={0.7} />
      <View style={[styles.column, { paddingTop: insets.top + 49, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.head}>
          <Text style={[t.menuWordmark, { color: c.text }]} accessibilityRole="header">
            PRIVO ATC
          </Text>
          <BestLine text={bestLine} />
        </View>

        <View style={styles.actions}>
          <Pressable
            testID="btn-play"
            accessibilityRole="button"
            accessibilityLabel="Play. Random session at LHBP, steady traffic"
            onPress={onPlay}
            style={({ pressed }) => [styles.play, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]}
          >
            <CornerMarks color={c.textDim} />
            <View>
              <Text style={[t.menuPrimary, { color: c.background }]}>PLAY</Text>
              <Text style={[t.small, styles.playSub, { color: c.background }]}>Random session · LHBP · Steady</Text>
            </View>
            <ChevronRight color={c.background} size={28} />
          </Pressable>

          <MenuButton label="Choose airport" onPress={onChooseAirport} testID="btn-airports" chevron />

          <View style={[styles.wide, styles.replay, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} accessible accessibilityLabel="Replay a real day. Coming soon">
            <Text style={[t.menuButton, { color: c.textDim }]}>Replay a real day</Text>
            <Text style={[t.caps, styles.soon, { color: c.textDim, borderColor: c.textDim, borderWidth: theme.hairline }]}>COMING SOON</Text>
          </View>

          <View style={styles.row}>
            <MenuButton label="How to play" onPress={onHowToPlay} testID="btn-how" small />
            <MenuButton label="Best scores" onPress={onBestScores} testID="btn-best" small />
            <MenuButton label="Settings" onPress={onSettings} testID="btn-settings" small />
          </View>
        </View>
      </View>
    </View>
  );
}

/** "Best · 1,240 at LHBP, Steady, 30 min" with the score picked out, as in the design. */
function BestLine({ text }: { text?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const style = [theme.type.bodyStrong, styles.best, { color: c.textDim }];
  const m = text ? /^(Best · )([\d,]+)(.*)$/.exec(text) : null;
  if (!text) return <Text style={style}>No best score yet: play a session to set one.</Text>;
  if (!m) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {m[1]}
      <Text style={[theme.type.bodyEmphasis, { color: c.text }]}>{m[2]}</Text>
      {m[3]}
    </Text>
  );
}

/**
 * A boxed menu button: full width with the label left and a chevron, or a
 * centred label in the bottom row. Dimmed and disabled while its screen
 * isn't there yet (no onPress).
 */
function MenuButton({ label, onPress, testID, chevron, small }: { label: string; onPress?: () => void; testID: string; chevron?: boolean; small?: boolean }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const disabled = !onPress;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        small ? styles.cell : styles.wide,
        { borderColor: c.panelBorder, borderWidth: theme.hairline, backgroundColor: pressed ? c.buttonPressed : c.panel, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <Text style={[small ? theme.type.menuButtonSmall : theme.type.menuButton, { color: c.buttonText }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
      {chevron && <ChevronRight color={c.buttonText} size={22} />}
    </Pressable>
  );
}

/** Blueprint "+" registration marks, sitting just outside the four corners of a primary object. */
function CornerMarks({ color }: { color: string }) {
  const { theme } = useTheme();
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
        <Text
          key={k}
          style={[
            theme.type.mark,
            styles.mark,
            { color },
            k[0] === 't' ? { top: -9 } : { bottom: -9 },
            k[1] === 'l' ? { left: -5 } : { right: -5 },
          ]}
        >
          +
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: 20 },
  head: { gap: 6, paddingHorizontal: 4 },
  best: { lineHeight: 18 },
  actions: { marginTop: 'auto', gap: 10 },
  play: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  playSub: { marginTop: 4 },
  mark: { position: 'absolute' },
  wide: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  cell: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  replay: { borderStyle: 'dashed' },
  soon: { paddingVertical: 4, paddingHorizontal: 7 },
  row: { flexDirection: 'row', gap: 10 },
});
