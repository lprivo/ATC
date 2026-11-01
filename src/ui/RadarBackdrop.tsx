import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { RANGE_RINGS_NM, wedgePath } from './radarGeometry';

/** Design: the sweep turns once every 4 s (splash and menu). */
const SWEEP_MS = 4000;
const SWEEP_SPAN_DEG = 46;
const SWEEP_STEPS = 12;

/**
 * Radar backdrop for the splash and menu: range rings and a rotating sweep
 * only, no airport (design S1: "Do not show an airport here"). The sweep is
 * the one gradient the design allows; it is drawn as fading wedges in a
 * square centred on the radar, so it reaches every corner at every angle.
 */
export function RadarBackdrop({ centreY = 0.5, scale = 8, opacity = 0.85 }: { centreY?: number; scale?: number; opacity?: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: SWEEP_MS, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const cx = size.w / 2;
  const cy = size.h * centreY;
  // Long enough to reach the farthest corner from the centre.
  const R = Math.ceil(Math.max(Math.hypot(cx, cy), Math.hypot(size.w - cx, size.h - cy)));
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, { opacity }]} onLayout={onLayout} pointerEvents="none">
      {size.w > 0 && (
        <>
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            {RANGE_RINGS_NM.map((r) => (
              <Circle key={r} cx={cx} cy={cy} r={r * scale} stroke={c.rangeRing} strokeWidth={1} fill="none" />
            ))}
          </Svg>
          {/* A 2R square centred on the radar rotates about its own centre (native-driver transform). */}
          <Animated.View style={{ position: 'absolute', left: cx - R, top: cy - R, width: 2 * R, height: 2 * R, transform: [{ rotate }] }}>
            <Svg width={2 * R} height={2 * R}>
              {Array.from({ length: SWEEP_STEPS }, (_, i) => {
                const a1 = -(i * SWEEP_SPAN_DEG) / SWEEP_STEPS;
                const a0 = a1 - SWEEP_SPAN_DEG / SWEEP_STEPS;
                return <Path key={i} d={wedgePath(R, R, R, a0, a1)} fill={c.sweep} fillOpacity={1 - i / SWEEP_STEPS} />;
              })}
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
