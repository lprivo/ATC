import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { LHBP } from '../engine/airports/lhbp';
import { splitAlpha } from '../theme/color';
import { useTheme } from '../theme/ThemeContext';

/** The icon's sweep fade, baked by scripts/make-sweep.mjs (one radian wide, leading edge north). */
const ICON_SWEEP: ImageSourcePropType = require('../../assets/sweep-icon.png');
/** Design `drawIcon`: the sweep ends at −40° and peaks at 0.45 alpha. */
const ICON_SWEEP_LEAD_DEG = -40;
const ICON_SWEEP_PEAK = 0.45;

/**
 * The procedural app icon (design `drawIcon`): rings, a sweep, the two LHBP
 * runways and a plane blip. Final icon artwork is to be produced from this.
 */
export function AppIcon({ size }: { size: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const cx = size / 2;
  const k = size / 46;
  const rk = size / 9; // runways drawn larger than the rings
  const b = size * 0.045;
  return (
    <View style={[styles.icon, { width: size, height: size, backgroundColor: c.panel }]} accessible accessibilityLabel="Privo ATC">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {[7, 13, 19].map((r) => (
          <Circle key={r} cx={cx} cy={cx} r={r * k} stroke={c.panelBorder} strokeWidth={Math.max(1, size * 0.012)} fill="none" />
        ))}
      </Svg>
      {/* A square twice the icon's size, centred on it, so the fade reaches every corner once rotated. */}
      <Image
        source={ICON_SWEEP}
        style={{
          position: 'absolute',
          left: -cx,
          top: -cx,
          width: size * 2,
          height: size * 2,
          tintColor: splitAlpha(c.sweep).rgb,
          opacity: ICON_SWEEP_PEAK,
          transform: [{ rotate: `${ICON_SWEEP_LEAD_DEG}deg` }],
        }}
      />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {LHBP.runways.map((r) => (
          <Line
            key={r.name}
            x1={cx + r.ends[0].threshold.x * rk}
            y1={cx - r.ends[0].threshold.y * rk}
            x2={cx + r.ends[1].threshold.x * rk}
            y2={cx - r.ends[1].threshold.y * rk}
            stroke={c.runway}
            strokeWidth={size * 0.05}
          />
        ))}
        <Rect x={size * 0.7 - b} y={size * 0.27 - b} width={b * 2} height={b * 2} fill={c.snapHalo} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { overflow: 'hidden' },
});
