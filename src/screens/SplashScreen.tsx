import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { AppIcon } from '../ui/AppIcon';
import { RadarBackdrop } from '../ui/RadarBackdrop';

/**
 * How long the start-up splash shows (its progress bar fills over this). Fonts
 * have already loaded behind the native splash, so this is purely the brand moment.
 */
const SPLASH_MS = 1400;

/**
 * Design S1: app start only (no airport). Rings and the sweep, the app icon,
 * the PRIVO ATC wordmark and tagline, a 180×2 progress bar and the version.
 */
export function SplashScreen({
  onDone,
  progress: fixedProgress,
  active = true,
}: {
  onDone: () => void;
  /** Hold the progress bar at this fraction (0–1) instead of loading and calling `onDone` (stories). */
  progress?: number;
  /** Whether the splash is the screen showing; the sweep stops when not (default on). */
  active?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(fixedProgress ?? 0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (fixedProgress != null) {
      progress.setValue(fixedProgress);
      return;
    }
    const anim = Animated.timing(progress, { toValue: 1, duration: SPLASH_MS, easing: Easing.out(Easing.quad), useNativeDriver: true });
    anim.start(({ finished }) => finished && done.current());
    return () => anim.stop();
  }, [progress, fixedProgress]);
  const version = Constants.expoConfig?.version ?? '1.0';
  return (
    <View style={[styles.screen, { backgroundColor: c.background }]} testID="splash">
      <RadarBackdrop centreY={0.5} scale={7} active={active} />
      {/* Design: the icon block starts 300 pt down an 844 pt screen. */}
      <View style={styles.brand}>
        <View style={[styles.icon, { borderColor: c.panelBorder, borderWidth: theme.hairline }]}>
          <AppIcon size={104} />
        </View>
        {/* Letter-spacing also trails the last letter; padding the start by the same amount keeps each line optically centred. */}
        <View style={styles.words}>
          <Text style={[t.wordmark, styles.spaced, { color: c.text, paddingLeft: t.wordmark.letterSpacing }]} accessibilityRole="header">
            PRIVO ATC
          </Text>
          <Text style={[t.tagline, { color: c.textDim, paddingLeft: t.tagline.letterSpacing }]}>APPROACH CONTROL</Text>
        </View>
      </View>
      {/* Design: 92 pt from the bottom of the screen (58 above a 34 pt home indicator); never closer on screens without one. */}
      <View style={[styles.foot, { bottom: Math.max(92, insets.bottom + 58) }]}>
        <View style={[styles.track, { backgroundColor: c.rangeRing }]} accessibilityRole="progressbar" accessibilityLabel="Loading">
          <Animated.View style={[styles.fill, { backgroundColor: c.snapHalo, transform: [{ scaleX: progress }] }]} />
        </View>
        <Text style={[t.version, { color: c.textDim, paddingLeft: t.version.letterSpacing }]}>v{version}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  brand: { position: 'absolute', left: 0, right: 0, top: '35.5%', alignItems: 'center', gap: 18 },
  icon: { width: 106, height: 106, borderRadius: 25, overflow: 'hidden' },
  words: { alignItems: 'center', gap: 6 },
  spaced: { lineHeight: 46 },
  foot: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 10 },
  track: { width: 180, height: 2, overflow: 'hidden' },
  fill: { width: 180, height: 2, transformOrigin: 'left' },
});
