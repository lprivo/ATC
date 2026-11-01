import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { LHBP } from '../engine/airports/lhbp';
import { useTheme } from '../theme/ThemeContext';

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
  const a = (-40 * Math.PI) / 180;
  const R = size;
  const sweep = `M${cx},${cx} L${cx + Math.sin(a - 1) * R},${cx - Math.cos(a - 1) * R} A${R},${R} 0 0 1 ${cx + Math.sin(a) * R},${cx - Math.cos(a) * R} Z`;
  const b = size * 0.045;
  return (
    <Svg width={size} height={size} accessibilityLabel="Privo ATC">
      <Rect width={size} height={size} fill={c.panel} />
      {[7, 13, 19].map((r) => (
        <Circle key={r} cx={cx} cy={cx} r={r * k} stroke={c.panelBorder} strokeWidth={Math.max(1, size * 0.012)} fill="none" />
      ))}
      <Path d={sweep} fill={c.sweep} />
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
  );
}
