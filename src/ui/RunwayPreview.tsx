import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { airportByIcao } from '../engine/airports';
import { useTheme } from '../theme/ThemeContext';
import { runwayLabelPos } from './radarGeometry';

/**
 * Small runway-layout preview for an airport card (64 on S3a, 110 on S3b):
 * a ring, the runways to scale, and the runway-end labels on bigger previews.
 * Airports without a layout yet show just the ring.
 */
export function RunwayPreview({ icao, size }: { icao: string; size: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const ap = airportByIcao(icao);
  const ends = ap ? ap.runways.flatMap((r) => r.ends) : [];
  // Fit the runways: the farthest threshold sits at ~35% of the size from the centre.
  const reach = Math.max(1, ...ends.map((e) => Math.hypot(e.threshold.x, e.threshold.y)));
  const scale = (size * 0.35) / reach;
  const vp = { w: size, h: size, ox: size / 2, oy: size / 2, scale };
  const f = theme.radarFont.chip;
  return (
    <Svg width={size} height={size} accessibilityLabel={`${icao} runway layout`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 2} stroke={c.rangeRing} strokeWidth={1} fill="none" />
      {ap?.runways.map((r) => (
        <Line
          key={r.name}
          x1={vp.ox + r.ends[0].threshold.x * scale}
          y1={vp.oy - r.ends[0].threshold.y * scale}
          x2={vp.ox + r.ends[1].threshold.x * scale}
          y2={vp.oy - r.ends[1].threshold.y * scale}
          stroke={c.runway}
          strokeWidth={Math.max(2, size / 30)}
        />
      ))}
      {ap &&
        size >= 100 &&
        ends.map((e) => {
          const p = runwayLabelPos(vp, ap, e);
          return (
            <SvgText key={e.id} x={p.x} y={p.y + 3.5} fill={c.runwayLabel} fontFamily={f.fontFamily} fontSize={f.fontSize} textAnchor="middle">
              {e.id}
            </SvgText>
          );
        })}
    </Svg>
  );
}
