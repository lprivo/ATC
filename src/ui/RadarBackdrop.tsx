import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { RANGE_RINGS_NM } from './radarGeometry';

/** Design: the sweep turns once every 4 s (splash and menu). */
const SWEEP_MS = 4000;
const SWEEP_SPAN_DEG = 46;
const SWEEP_STEPS = 12;

/**
 * Radar backdrop for the splash and menu: range rings and a rotating sweep
 * only, no airport (design S1: "Do not show an airport here"). The sweep is
 * the one gradient the design allows; it is drawn as fading wedges.
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
  const R = Math.hypot(size.w, size.h);
  const wedge = (a0: number, a1: number) => {
    const p = (a: number) => `${cx + Math.sin((a * Math.PI) / 180) * R},${cy - Math.cos((a * Math.PI) / 180) * R}`;
    return `M${cx},${cy} L${p(a0)} A${R},${R} 0 0 1 ${p(a1)} Z`;
  };
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} onLayout={onLayout} pointerEvents="none">
      {size.w > 0 && (
        <>
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            {RANGE_RINGS_NM.map((r) => (
              <Circle key={r} cx={cx} cy={cy} r={r * scale} stroke={c.rangeRing} strokeWidth={1} fill="none" />
            ))}
          </Svg>
          {/* The sweep rotates as a whole view around the radar centre (native-driver transform). */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX: cx - size.w / 2 }, { translateY: cy - size.h / 2 }, { rotate }, { translateX: size.w / 2 - cx }, { translateY: size.h / 2 - cy }] },
            ]}
          >
            <Svg width={size.w} height={size.h}>
              <G>
                {Array.from({ length: SWEEP_STEPS }, (_, i) => {
                  const a1 = -(i * SWEEP_SPAN_DEG) / SWEEP_STEPS;
                  const a0 = a1 - SWEEP_SPAN_DEG / SWEEP_STEPS;
                  return <Path key={i} d={wedge(a0, a1)} fill={c.sweep} fillOpacity={1 - i / SWEEP_STEPS} />;
                })}
                <Line x1={cx} y1={cy} x2={cx} y2={cy - R} stroke={c.snapHalo} strokeOpacity={0.6} strokeWidth={1.25} />
              </G>
            </Svg>
          </Animated.View>
        </>
      )}
    </View>
  );
}
