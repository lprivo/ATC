import { G, Path } from 'react-native-svg';
import { splitAlpha, sweepSlices, wedgePath } from './radarGeometry';

const STEPS = 60;

/**
 * The radar sweep's fading fan, centred on (cx, cy), with its leading edge at
 * bearing `leadDeg` (clockwise from north) and the fade trailing behind it.
 * It peaks at `color`'s own alpha unless `peakAlpha` says otherwise. Render it
 * inside an <Svg>.
 */
export function SweepFan({ cx, cy, r, spanDeg, color, leadDeg = 0, peakAlpha }: { cx: number; cy: number; r: number; spanDeg: number; color: string; leadDeg?: number; peakAlpha?: number }) {
  const { rgb, alpha } = splitAlpha(color);
  return (
    <G>
      {sweepSlices(spanDeg, STEPS, peakAlpha ?? alpha).map((l, i) => (
        <Path key={i} d={wedgePath(cx, cy, r, leadDeg + l.a0, leadDeg + l.a1)} fill={rgb} fillOpacity={l.opacity} />
      ))}
    </G>
  );
}
