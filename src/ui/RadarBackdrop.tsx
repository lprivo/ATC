import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { splitAlpha } from '../theme/color';
import { useTheme } from '../theme/ThemeContext';
import { RANGE_RINGS_NM } from './radarGeometry';
import { useReduceMotion } from './useReduceMotion';

/** The fade, baked by scripts/make-sweep.mjs (white, alpha ramp, leading edge north); tinted with the theme's `sweep` colour. */
const SWEEP_IMAGE: ImageSourcePropType = require('../../assets/sweep.png');

/** Design: the sweep turns once every 4 s (splash and menu). */
const SWEEP_MS = 4000;
/**
 * The rotation runs on the native UI thread on iOS and Android. Not on the
 * web: react-native-web has no native animation module, and there a native-
 * driver `Animated.loop` runs one turn and then stops at 12 o'clock.
 */
const NATIVE_DRIVER = Platform.OS !== 'web';
/** With Reduce Motion on, the sweep stands still at this angle (an eighth of a turn, 45°). */
const STILL_PHASE = 0.125;

/**
 * Radar backdrop for the splash and menu: range rings and a rotating sweep
 * only, no airport (design S1: "Do not show an airport here"). The sweep is
 * the one gradient the design allows. SVG has no conic gradient, so the fade
 * is a pre-rendered image, tinted from the theme. It fills a square centred on
 * the radar, so it reaches every corner at every angle.
 *
 * It only turns while `active` (its screen is the one showing: the menu stays
 * mounted under the game), and stands still when Reduce Motion is on. When it
 * starts again it carries on from where it stopped, rather than from 12 o'clock.
 */
export function RadarBackdrop({
  centreY = 0.5,
  scale = 8,
  opacity = 0.85,
  active = true,
}: {
  centreY?: number;
  scale?: number;
  opacity?: number;
  /** Whether its screen is the one showing (the route passes `useIsFocused()`); the sweep stops when not. */
  active?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const spin = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  const running = active && reduceMotion === false;
  useEffect(() => {
    if (!running) {
      if (reduceMotion === true) {
        spin.stopAnimation();
        spin.flattenOffset();
        spin.setValue(STILL_PHASE);
      }
      return;
    }
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    // Start from the current angle (offset), so a stop and restart doesn't jump the sweep back to north.
    spin.stopAnimation((v) => {
      if (cancelled) return;
      spin.setOffset(v % 1);
      spin.setValue(0);
      loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: SWEEP_MS, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }));
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [running, reduceMotion, spin]);
  // Linear beyond 1 (the default), as the offset can take it up to 2 turns: 1.25 is 450°, the same as 90°.
  const rotate = useMemo(() => spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }), [spin]);
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const cx = size.w / 2;
  const cy = size.h * centreY;
  // Long enough to reach the farthest corner from the centre.
  const R = Math.ceil(Math.max(Math.hypot(cx, cy), Math.hypot(size.w - cx, size.h - cy)));
  const sweep = splitAlpha(c.sweep);
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, { opacity }]} onLayout={onLayout} pointerEvents="none">
      {size.w > 0 && (
        <>
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            {RANGE_RINGS_NM.map((r) => (
              <Circle key={r} cx={cx} cy={cy} r={r * scale} stroke={c.rangeRing} strokeWidth={1} fill="none" />
            ))}
          </Svg>
          {/* A 2R square centred on the radar rotates about its own centre. */}
          <Animated.View style={{ position: 'absolute', left: cx - R, top: cy - R, width: 2 * R, height: 2 * R, transform: [{ rotate }] }}>
            <Image source={SWEEP_IMAGE} style={{ position: 'absolute', width: 2 * R, height: 2 * R, tintColor: sweep.rgb, opacity: sweep.alpha }} />
            <Svg width={2 * R} height={2 * R}>
              <Line x1={R} y1={R} x2={R} y2={0} stroke={c.snapHalo} strokeOpacity={0.6} strokeWidth={1.25} />
            </Svg>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
