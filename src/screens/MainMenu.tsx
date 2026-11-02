import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BestLine as BestLineParts } from '../game/bestScores';
import { useTheme } from '../theme/ThemeContext';
import { ComingSoonTag } from '../ui/ComingSoonTag';
import { ChevronRight } from '../ui/icons';
import { MenuDemo } from '../ui/MenuDemo';
import { RadarBackdrop } from '../ui/RadarBackdrop';
import { shellColumn } from '../ui/shellLayout';

/** Design S2: the radar is centred 300 pt down an 844 pt screen, at 9 pt/nm. */
const MENU_RADAR_Y = 300 / 844;
const MENU_RADAR_SCALE = 9;

interface Props {
  onPlay: () => void;
  /** Screens that arrive with later issues are shown but inert until wired. */
  onChooseAirport?: () => void;
  onHowToPlay?: () => void;
  onBestScores?: () => void;
  onSettings?: () => void;
  /** The best score so far ("Best · 1,240 at LHBP, Steady, 30 min"), or null until there is one. */
  best: BestLineParts | null;
  /** Whether the menu is the screen showing; its animations pause when not (default on). */
  active?: boolean;
  /** Fixed seed for the background demo (stories); random by default. */
  demoSeed?: number;
}

/**
 * Design S2: wordmark top-left with the best-score line; actions in the bottom
 * half: PLAY (primary, 72 high, blueprint corner marks, chevron), Choose
 * airport, an inert "Replay a real day" (COMING SOON), and How to play /
 * Best scores / Settings. Labels sit left with a chevron on the right.
 */
export function MainMenu({ onPlay, onChooseAirport, onHowToPlay, onBestScores, onSettings, best, active = true, demoSeed }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]} testID="main-menu">
      {/* A dimmed, self-running demo of the game (#40) under the design's sweep: rings centred 300 pt down an 844 pt screen, 9 pt/nm. */}
      <MenuDemo centreY={MENU_RADAR_Y} scale={MENU_RADAR_SCALE} active={active} seed={demoSeed} />
      <RadarBackdrop centreY={MENU_RADAR_Y} scale={MENU_RADAR_SCALE} opacity={0.7} rings={false} active={active} />
      <View style={[styles.column, { paddingTop: insets.top + 49, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.head}>
          <Text style={[t.menuWordmark, { color: c.text }]} accessibilityRole="header">
            PRIVO ATC
          </Text>
          <BestLine best={best} />
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
              <Text style={[t.menuSub, styles.playSub, { color: c.background }]}>Random session · LHBP · Steady</Text>
            </View>
            <ChevronRight color={c.background} size={28} strokeWidth={1.5} />
          </Pressable>

          <MenuButton label="Choose airport" onPress={onChooseAirport} testID="btn-airports" chevron />

          <View style={[styles.wide, styles.replay, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} accessible accessibilityLabel="Replay a real day. Coming soon">
            <Text style={[t.menuButton, { color: c.textDim }]}>Replay a real day</Text>
            <ComingSoonTag />
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
function BestLine({ best }: { best: BestLineParts | null }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const style = [theme.type.bodyStrong, styles.best, { color: c.textDim }];
  if (!best) return <Text style={style}>No best score yet: play a session to set one.</Text>;
  return (
    <Text style={style}>
      Best · <Text style={[theme.type.bodyEmphasis, { color: c.text }]}>{best.score}</Text>
      {best.where}
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
      {chevron && <ChevronRight color={c.buttonText} size={22} strokeWidth={1.5} />}
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
            k[0] === 't' ? { top: -8 } : { bottom: -8 },
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
  column: { ...shellColumn, flex: 1, paddingHorizontal: 20 },
  head: { gap: 6, paddingHorizontal: 4 },
  best: { lineHeight: 18 },
  actions: { marginTop: 'auto', gap: 10 },
  play: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  playSub: { marginTop: 4 },
  mark: { position: 'absolute' },
  wide: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  cell: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  replay: { borderStyle: 'dashed' },
  row: { flexDirection: 'row', gap: 10 },
});
