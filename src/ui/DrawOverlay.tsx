import { ClipPath, Circle, Defs, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { add, dirOf } from '../engine/math';
import type { Airport, Vec2 } from '../engine/types';
import type { Theme } from '../theme/themes';
import { candidates, loupeFor } from './drawing';
import { textWidth } from './labels';
import { runwayLabelPos, runwayWidth } from './radarGeometry';
import { polylinePoints, toScreen, type Viewport } from './viewport';

interface Props {
  airport: Airport;
  vp: Viewport;
  theme: Theme;
  /** Drawn path so far (world), starting at the plane. */
  points: readonly Vec2[];
  /** Finger position (world). */
  finger: Vec2;
  /** Runway end the path snaps to, if any. */
  snap: string | null;
}

/**
 * Everything shown while a path is being drawn (design "Route drawing and
 * runway snap"): candidate rings, the snapped runway's halo, lit centreline,
 * ring and inverted label, the dotted draft with its end handle, a `LAND 31L`
 * chip, and the loupe.
 */
export function DrawOverlay({ airport, vp, theme, points, finger, snap }: Props) {
  const c = theme.colors;
  const path = [...points, finger];
  const l = loupeFor(vp, finger);
  const s = toScreen(vp, finger);
  const chipFont = theme.radarFont.chip;
  const chip = snap ? `LAND ${snap}` : null;
  const chipW = chip ? textWidth(chip, chipFont.fontSize) + 10 : 0;
  return (
    <G>
      <Snap airport={airport} vp={vp} theme={theme} path={path} finger={finger} snap={snap} />
      {chip && (
        <G>
          <Rect x={s.x + 16} y={s.y - 34} width={chipW} height={16} fill={c.snapHalo} />
          <SvgText x={s.x + 21} y={s.y - 22} fill={c.background} fontFamily={chipFont.fontFamily} fontSize={chipFont.fontSize}>
            {chip}
          </SvgText>
        </G>
      )}
      {/* Loupe: the same scene, magnified, clipped to a circle. */}
      <Defs>
        <ClipPath id="loupe">
          <Circle cx={l.cx} cy={l.cy} r={l.r} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#loupe)">
        <Rect x={l.cx - l.r} y={l.cy - l.r} width={l.r * 2} height={l.r * 2} fill={c.background} />
        <Runways airport={airport} vp={l.cam} theme={theme} />
        <Snap airport={airport} vp={l.cam} theme={theme} path={path} finger={finger} snap={snap} />
      </G>
      <Circle cx={l.cx} cy={l.cy} r={l.r} stroke={c.accent} strokeWidth={2} fill="none" />
      <ZoomChip x={l.cx} y={l.cy + l.r} text={`×${Number(l.zoom.toFixed(1))}`} theme={theme} />
    </G>
  );
}

/** Snap and candidate highlights, and the draft path, for one camera. */
function Snap({ airport, vp, theme, path, finger, snap }: { airport: Airport; vp: Viewport; theme: Theme; path: Vec2[]; finger: Vec2; snap: string | null }) {
  const c = theme.colors;
  const ends = airport.runways.flatMap((r) => r.ends);
  const snapped = snap ? ends.find((e) => e.id === snap) : undefined;
  const runway = snapped ? airport.runways.find((r) => r.ends.includes(snapped)) : undefined;
  const handle = toScreen(vp, finger);
  const rf = theme.radarFont.runway;
  return (
    <G>
      {candidates(airport, vp, finger)
        .filter((id) => id !== snap)
        .map((id) => {
          const t = toScreen(vp, ends.find((e) => e.id === id)!.threshold);
          return <Circle key={id} cx={t.x} cy={t.y} r={9} stroke={c.accent} strokeWidth={1.25} strokeDasharray="3 3" fill="none" />;
        })}
      {snapped && runway && (
        <G>
          {/* Halo along the runway, the lit extended centreline, and a ring on the threshold. */}
          <Line
            {...seg(vp, runway.ends[0].threshold, runway.ends[1].threshold)}
            stroke={c.snapHalo}
            strokeOpacity={0.28}
            strokeWidth={runwayWidth(vp.scale) + 12}
          />
          <Line {...seg(vp, snapped.threshold, add(snapped.threshold, dirOf(snapped.heading), -12))} stroke={c.snapHalo} strokeWidth={2} />
          <Circle {...pt(vp, snapped.threshold)} r={10} stroke={c.snapHalo} strokeWidth={2} fill="none" />
          <InvertedLabel airport={airport} vp={vp} theme={theme} id={snapped.id} font={rf} />
          <Line {...seg(vp, finger, snapped.threshold)} stroke={c.snapHalo} strokeWidth={2.5} />
        </G>
      )}
      {path.length > 1 && <Polyline points={polylinePoints(vp, path)} fill="none" stroke={c.routeDraft} strokeWidth={2.5} strokeDasharray="2 5" />}
      <Circle cx={handle.x} cy={handle.y} r={7} fill={c.labelBg} stroke={c.routeDraft} strokeWidth={2} />
    </G>
  );
}

/** Just the runways, for the loupe (rings, fixes and labels would only clutter it). */
function Runways({ airport, vp, theme }: { airport: Airport; vp: Viewport; theme: Theme }) {
  return (
    <G>
      {airport.runways.map((r) => (
        <Line key={r.name} {...seg(vp, r.ends[0].threshold, r.ends[1].threshold)} stroke={theme.colors.runway} strokeWidth={runwayWidth(vp.scale)} />
      ))}
    </G>
  );
}

function InvertedLabel({ airport, vp, theme, id, font }: { airport: Airport; vp: Viewport; theme: Theme; id: string; font: { fontFamily: string; fontSize: number } }) {
  const end = airport.runways.flatMap((r) => r.ends).find((e) => e.id === id)!;
  const p = runwayLabelPos(vp, airport, end);
  const w = textWidth(id, font.fontSize) + 8;
  return (
    <G>
      <Rect x={p.x - w / 2} y={p.y - 8} width={w} height={16} fill={theme.colors.snapHalo} />
      <SvgText x={p.x} y={p.y + font.fontSize * 0.35} fill={theme.colors.background} fontFamily={font.fontFamily} fontSize={font.fontSize} textAnchor="middle">
        {id}
      </SvgText>
    </G>
  );
}

function ZoomChip({ x, y, text, theme }: { x: number; y: number; text: string; theme: Theme }) {
  const f = theme.radarFont.chip;
  const w = textWidth(text, f.fontSize) + 8;
  return (
    <G>
      <Rect x={x - w / 2} y={y - 7} width={w} height={14} fill={theme.colors.accent} />
      <SvgText x={x} y={y + 3.5} fill={theme.colors.background} fontFamily={f.fontFamily} fontSize={f.fontSize} textAnchor="middle">
        {text}
      </SvgText>
    </G>
  );
}

const pt = (vp: Viewport, p: Vec2) => {
  const s = toScreen(vp, p);
  return { cx: s.x, cy: s.y };
};
const seg = (vp: Viewport, a: Vec2, b: Vec2) => {
  const sa = toScreen(vp, a);
  const sb = toScreen(vp, b);
  return { x1: sa.x, y1: sa.y, x2: sb.x, y2: sb.y };
};
