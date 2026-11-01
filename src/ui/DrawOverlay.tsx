import { useId } from 'react';
import { ClipPath, Circle, Defs, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { Airport, RunwayEnd, Vec2 } from '../engine/types';
import type { Theme } from '../theme/themes';
import { candidates, loupeFor } from './drawing';
import { textWidth } from './labels';
import { centreline, runwayLabelPos, runwayWidth } from './radarGeometry';
import { polylinePoints, toScreen, type Viewport } from './viewport';

interface Props {
  /** "under": snap highlight and the draft (drawn below the planes); "over": the LAND chip and the loupe. */
  layer: 'under' | 'over';
  airport: Airport;
  vp: Viewport;
  theme: Theme;
  /** Drawn path so far (world), starting at the plane. */
  points: readonly Vec2[];
  /** Finger position (world). */
  finger: Vec2;
  /** Runway end the path snaps to, if any. */
  snap: string | null;
  /** HUD space at the top and bottom, which the loupe keeps clear of. */
  insets: { top: number; bottom: number };
}

/**
 * Everything shown while a path is being drawn (design "Route drawing and
 * runway snap"): candidate rings, the snapped runway's halo, lit centreline,
 * ring and inverted label, the dotted draft with its end handle (under the
 * planes), and on top a `LAND 31L` chip and the loupe.
 */
export function DrawOverlay({ layer, airport, vp, theme, points, finger, snap, insets }: Props) {
  const clipId = useId();
  const path = [...points, finger];
  const snapped = snap ? airport.runways.flatMap((r) => r.ends).find((e) => e.id === snap) : undefined;
  const near = candidates(airport, vp, finger).filter((id) => id !== snap);

  if (layer === 'under') {
    return <Highlight airport={airport} vp={vp} theme={theme} path={path} finger={finger} snapped={snapped} candidates={near} />;
  }

  const c = theme.colors;
  const l = loupeFor(vp, finger, insets);
  const s = toScreen(vp, finger);
  const chipFont = theme.radarFont.chip;
  const chip = snapped ? `LAND ${snapped.id}` : null;
  const chipW = chip ? textWidth(chip, chipFont.fontSize) + 10 : 0;
  return (
    <G>
      {chip && (
        <G>
          <Rect x={s.x + 16} y={s.y - 34} width={chipW} height={16} fill={c.snapHalo} />
          <SvgText x={s.x + 21} y={s.y - 22} fill={c.background} fontFamily={chipFont.fontFamily} fontSize={chipFont.fontSize}>
            {chip}
          </SvgText>
        </G>
      )}
      {/* Loupe: the airport and the drawing, magnified, clipped to a circle. */}
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={l.cx} cy={l.cy} r={l.r} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect x={l.cx - l.r} y={l.cy - l.r} width={l.r * 2} height={l.r * 2} fill={c.background} />
        {airport.runways.flatMap((r) => r.ends).map((e) => (
          <Line key={`cl-${e.id}`} {...seg(centreline(l.cam, e))} stroke={c.centreline} strokeWidth={1} strokeDasharray="4 6" />
        ))}
        {airport.runways.map((r) => (
          <Line key={r.name} {...pts(l.cam, r.ends[0].threshold, r.ends[1].threshold)} stroke={c.runway} strokeWidth={runwayWidth(l.cam.scale)} />
        ))}
        <Highlight airport={airport} vp={l.cam} theme={theme} path={path} finger={finger} snapped={snapped} candidates={near} />
      </G>
      <Circle cx={l.cx} cy={l.cy} r={l.r} stroke={c.accent} strokeWidth={2} fill="none" />
      <ZoomChip x={l.cx} y={l.cy + l.r} text={`×${Number(l.zoom.toFixed(1))}`} theme={theme} />
    </G>
  );
}

/** Candidate rings, the snapped runway's highlight and the draft path, for one camera. */
function Highlight({
  airport,
  vp,
  theme,
  path,
  finger,
  snapped,
  candidates: near,
}: {
  airport: Airport;
  vp: Viewport;
  theme: Theme;
  path: Vec2[];
  finger: Vec2;
  snapped: RunwayEnd | undefined;
  candidates: string[];
}) {
  const c = theme.colors;
  const z = theme.size;
  const ends = airport.runways.flatMap((r) => r.ends);
  const runway = snapped ? airport.runways.find((r) => r.ends.includes(snapped)) : undefined;
  const handle = toScreen(vp, finger);
  return (
    <G>
      {near.map((id) => {
        const t = toScreen(vp, ends.find((e) => e.id === id)!.threshold);
        return <Circle key={id} cx={t.x} cy={t.y} r={z.candidateRing} stroke={c.accent} strokeWidth={1.25} strokeDasharray="3 3" fill="none" />;
      })}
      {snapped && runway && (
        <G>
          {/* Halo along the runway, the lit extended centreline, and a ring on the threshold. */}
          <Line
            {...pts(vp, runway.ends[0].threshold, runway.ends[1].threshold)}
            stroke={c.snapHalo}
            strokeOpacity={z.snapHaloOpacity}
            strokeWidth={runwayWidth(vp.scale) + 12}
          />
          <Line {...seg(centreline(vp, snapped))} stroke={c.snapHalo} strokeWidth={2} />
          <Circle {...centre(vp, snapped.threshold)} r={z.snapRing} stroke={c.snapHalo} strokeWidth={2} fill="none" />
          <InvertedLabel airport={airport} vp={vp} theme={theme} end={snapped} />
          <Line {...pts(vp, finger, snapped.threshold)} stroke={c.snapHalo} strokeWidth={2.5} />
        </G>
      )}
      {path.length > 1 && <Polyline points={polylinePoints(vp, path)} fill="none" stroke={c.routeDraft} strokeWidth={2.5} strokeDasharray="2 5" />}
      <Circle cx={handle.x} cy={handle.y} r={z.draftHandle} fill={c.labelBg} stroke={c.routeDraft} strokeWidth={2} />
    </G>
  );
}

function InvertedLabel({ airport, vp, theme, end }: { airport: Airport; vp: Viewport; theme: Theme; end: RunwayEnd }) {
  const font = theme.radarFont.runway;
  const p = runwayLabelPos(vp, airport, end);
  const w = textWidth(end.id, font.fontSize) + 8;
  return (
    <G>
      <Rect x={p.x - w / 2} y={p.y - 8} width={w} height={16} fill={theme.colors.snapHalo} />
      <SvgText x={p.x} y={p.y + font.fontSize * 0.35} fill={theme.colors.background} fontFamily={font.fontFamily} fontSize={font.fontSize} textAnchor="middle">
        {end.id}
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

const centre = (vp: Viewport, p: Vec2) => {
  const s = toScreen(vp, p);
  return { cx: s.x, cy: s.y };
};
const pts = (vp: Viewport, a: Vec2, b: Vec2) => {
  const sa = toScreen(vp, a);
  const sb = toScreen(vp, b);
  return { x1: sa.x, y1: sa.y, x2: sb.x, y2: sb.y };
};
const seg = (cl: { from: { x: number; y: number }; to: { x: number; y: number } }) => ({ x1: cl.from.x, y1: cl.from.y, x2: cl.to.x, y2: cl.to.y });
