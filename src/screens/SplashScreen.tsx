import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
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
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const progress = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const anim = Animated.timing(progress, { toValue: 1, duration: SPLASH_MS, easing: Easing.out(Easing.quad), useNativeDriver: true });
    anim.start(({ finished }) => finished && done.current());
    return () => anim.stop();
  }, [progress]);
  const version = Constants.expoConfig?.version ?? '1.0';
  return (
    <View style={[styles.screen, { backgroundColor: c.background }]} testID="splash">
      <RadarBackdrop centreY={0.5} scale={7} />
      <View style={styles.centre}>
        <AppIcon size={104} />
        <Text style={[t.wordmark, styles.wordmark, { color: c.text }]} accessibilityRole="header">
          PRIVO ATC
        </Text>
        <Text style={[t.tagline, { color: c.textDim }]}>APPROACH CONTROL</Text>
        <View style={[styles.track, { backgroundColor: c.rangeRing }]} accessibilityRole="progressbar" accessibilityLabel="Loading">
          <Animated.View style={[styles.fill, { backgroundColor: c.snapHalo, transform: [{ scaleX: progress }] }]} />
        </View>
        <Text style={[t.smallTight, { color: c.textDim }]}>v{version}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  wordmark: { marginTop: 18 },
  track: { width: 180, height: 2, marginTop: 28, overflow: 'hidden' },
  fill: { width: 180, height: 2, transformOrigin: 'left' },
});
