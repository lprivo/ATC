import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
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

/**
 * Design S2: wordmark top-left with the best-score line; actions in the bottom
 * half: PLAY (primary, 72 high, blueprint corner marks), Choose airport,
 * an inert "Replay a real day" (COMING SOON), and How to play / Best scores / Settings.
 */
export function MainMenu({ onPlay, onChooseAirport, onHowToPlay, onBestScores, onSettings, bestLine }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();
  const box = { borderColor: c.panelBorder, borderWidth: theme.hairline };

  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]} testID="main-menu">
      <RadarBackdrop centreY={0.36} scale={9} opacity={0.6} />
      <View style={styles.head}>
        <Text style={[t.wordmark, { color: c.text }]} accessibilityRole="header">
          PRIVO ATC
        </Text>
        <Text style={[t.tagline, { color: c.textDim }]}>APPROACH CONTROL</Text>
        <Text style={[t.small, styles.best, { color: c.textDim }]}>{bestLine ?? 'No best score yet: play a session to set one.'}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          testID="btn-play"
          accessibilityRole="button"
          accessibilityLabel="Play. Random session at LHBP, steady traffic"
          onPress={onPlay}
          style={({ pressed }) => [styles.play, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <CornerMarks color={c.background} />
          <Text style={[t.buttonLarge, { color: c.background }]}>PLAY</Text>
          <Text style={[t.small, { color: c.background }]}>Random session · LHBP · Steady</Text>
        </Pressable>

        <MenuButton label="Choose airport" onPress={onChooseAirport} testID="btn-airports" height={56} />

        <View style={[styles.replay, { borderColor: c.panelBorder }]} accessible accessibilityLabel="Replay a real day. Coming soon">
          <Text style={[t.button, { color: c.textDim }]}>Replay a real day</Text>
          <Text style={[t.chip, styles.soon, { color: c.textDim, borderColor: c.textDim, borderWidth: theme.hairline }]}>COMING SOON</Text>
        </View>

        <View style={styles.row}>
          <MenuButton label="How to play" onPress={onHowToPlay} testID="btn-how" height={52} grow />
          <MenuButton label="Best scores" onPress={onBestScores} testID="btn-best" height={52} grow />
          <MenuButton label="Settings" onPress={onSettings} testID="btn-settings" height={52} grow />
        </View>
      </View>
      {/* Keep the border style referenced for the boxed buttons. */}
      <View style={[box, styles.hidden]} />
    </View>
  );

  function MenuButton({ label, onPress, testID, height, grow }: { label: string; onPress?: () => void; testID: string; height: number; grow?: boolean }): ReactNode {
    const disabled = !onPress;
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.button, box, grow && styles.grow, { height, backgroundColor: pressed ? c.buttonPressed : c.button, opacity: disabled ? 0.5 : 1 }]}
      >
        <Text style={[t.button, { color: c.buttonText }]} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
      </Pressable>
    );
  }
}

/** Blueprint "+" registration marks at the four corners of a primary object. */
function CornerMarks({ color }: { color: string }) {
  const { theme } = useTheme();
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
        <Text
          key={k}
          style={[
            theme.type.body,
            styles.mark,
            { color },
            k[0] === 't' ? { top: -2 } : { bottom: -2 },
            k[1] === 'l' ? { left: 4 } : { right: 4 },
          ]}
        >
          +
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { gap: 6 },
  best: { marginTop: 10 },
  actions: { marginTop: 'auto', gap: 10 },
  play: { height: 72, alignItems: 'center', justifyContent: 'center', gap: 2 },
  mark: { position: 'absolute', fontSize: 14, lineHeight: 16, opacity: 0.7 },
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  grow: { flex: 1 },
  replay: { height: 56, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  soon: { paddingVertical: 2, paddingHorizontal: 6 },
  row: { flexDirection: 'row', gap: 8 },
  hidden: { display: 'none' },
});
