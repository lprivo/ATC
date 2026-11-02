// Screen-space geometry for radar glyphs (design handoff, "Components" and
// "Radar furniture"). Pure functions, no React / React Native imports, so they
// can be unit tested. All results are in screen points; `scale` is pt per nm.
import { add, dirOf } from '../engine/math';
import type { Airport, Plane, RunwayEnd, Vec2 } from '../engine/types';
import { formatDistance, type AltUnit, type DistUnit } from '../game/settings';
import { textWidth } from './labels';
import { toScreen, type Viewport } from './viewport';

export interface ScreenPt {
  x: number;
  y: number;
}

/** Unit vector of a heading in screen space (y grows downwards). */
export const screenDir = (heading: number): ScreenPt => {
  const d = dirOf(heading);
  return { x: d.x, y: -d.y };
};

export const RANGE_RINGS_NM = [5, 10, 20, 30];
/** Extended centrelines: length and tick positions, nm from the threshold. */
export const CENTRELINE_NM = 12;
export const CENTRELINE_TICKS_NM = [5, 10];
const CENTRELINE_START_NM = 0.25;
const TICK_HALF_PT = 4;
/** Ring numbers sit at this screen angle (degrees, 0 = east, clockwise). */
const RING_LABEL_DEG = -50;

/** Runway stroke width: clamp(3, 0.22 nm, 7) pt. */
export const runwayWidth = (scale: number) => Math.min(7, Math.max(3, 0.22 * scale));

/** Where each range ring's number goes. */
export function ringLabels(vp: Viewport, maxNm: number) {
  const c = toScreen(vp, { x: 0, y: 0 });
  const a = (RING_LABEL_DEG * Math.PI) / 180;
  return RANGE_RINGS_NM.filter((r) => r <= maxNm).map((r) => ({
    r,
    x: c.x + Math.cos(a) * r * vp.scale + 3,
    y: c.y + Math.sin(a) * r * vp.scale - 3,
  }));
}

/** The dashed centreline and its two ticks for one runway end. */
export function centreline(vp: Viewport, end: RunwayEnd) {
  const out = (nm: number) => add(end.threshold, dirOf(end.heading), -nm);
  const n = screenDir(end.heading + 90);
  return {
    from: toScreen(vp, out(CENTRELINE_START_NM)),
    to: toScreen(vp, out(CENTRELINE_NM)),
    ticks: CENTRELINE_TICKS_NM.map((nm) => {
      const p = toScreen(vp, out(nm));
      return { x1: p.x - n.x * TICK_HALF_PT, y1: p.y - n.y * TICK_HALF_PT, x2: p.x + n.x * TICK_HALF_PT, y2: p.y + n.y * TICK_HALF_PT };
    }),
  };
}

/**
 * Runway-end label position: 13 pt beyond the threshold (on the approach side)
 * and 9 pt sideways, away from the other runways, so parallel labels don't collide.
 */
export function runwayLabelPos(vp: Viewport, airport: Airport, end: RunwayEnd): ScreenPt {
  const t = toScreen(vp, end.threshold);
  const back = screenDir(end.heading + 180);
  const side = awaySide(airport, end);
  return { x: t.x + back.x * 13 + side.x * 9, y: t.y + back.y * 13 + side.y * 9 };
}

/** Screen unit vector perpendicular to a runway end, pointing away from the airport's other runways. */
function awaySide(airport: Airport, end: RunwayEnd): ScreenPt {
  const ends = airport.runways.flatMap((r) => r.ends);
  const mid = ends.reduce((m, e) => ({ x: m.x + e.threshold.x / ends.length, y: m.y + e.threshold.y / ends.length }), { x: 0, y: 0 });
  const runway = airport.runways.find((r) => r.ends.includes(end));
  const centre = runway ? { x: (runway.ends[0].threshold.x + runway.ends[1].threshold.x) / 2, y: (runway.ends[0].threshold.y + runway.ends[1].threshold.y) / 2 } : end.threshold;
  const n = dirOf(end.heading + 90);
  const dot = (centre.x - mid.x) * n.x + (centre.y - mid.y) * n.y;
  // A single runway (dot ≈ 0) puts labels on the right of the landing direction.
  const sign = dot < -1e-6 ? -1 : 1;
  return { x: n.x * sign, y: -n.y * sign };
}

/** Heading vector end: one minute of flight ahead, at least `minPt`. */
export function headingVector(p: Plane, vp: Viewport, minutes: number, minPt: number) {
  const s = toScreen(vp, p.pos);
  const d = screenDir(p.heading);
  const len = Math.max(minPt, (p.speed / 60) * minutes * vp.scale);
  const start = 6; // clear of the symbol
  return { x1: s.x + d.x * start, y1: s.y + d.y * start, x2: s.x + d.x * len, y2: s.y + d.y * len };
}

/** Trail dot alpha: 0.84 for the newest dot down to 0.2 for the oldest, for any dot count. */
export const trailAlpha = (k: number, count: number) => (count <= 1 ? 0.84 : 0.84 - (k / (count - 1)) * 0.64);

/**
 * Trail: up to `count` dots along the plane's real flown path (newest history
 * first), one every max(5 pt, 0.45 nm) of path length, fading 0.84 → 0.2.
 * Fewer dots while the history is still short (just after spawning).
 */
export function trailDots(p: Plane, vp: Viewport, count: number) {
  const gap = Math.max(5, 0.45 * vp.scale);
  const path = [toScreen(vp, p.pos), ...[...p.trail].reverse().map((q) => toScreen(vp, q))];
  const out: { x: number; y: number; opacity: number }[] = [];
  let need = gap; // path length still to walk before the next dot
  for (let i = 1; i < path.length && out.length < count; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let used = 0;
    while (seg - used >= need && out.length < count) {
      used += need;
      const t = used / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, opacity: 0 });
      need = gap;
    }
    need -= seg - used;
  }
  return out.map((d, k) => ({ ...d, opacity: trailAlpha(k, count) }));
}

/** Conflict ring radius: max(minPt, ringNm). */
export const conflictRingRadius = (vp: Viewport, ringNm: number, minPt: number) => Math.max(minPt, ringNm * vp.scale);

/** SVG path for the four selection corner brackets around a symbol at (x, y). */
export function bracketPath(x: number, y: number, box: number, arm: number) {
  const b = box / 2;
  let d = '';
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      d += `M${x + sx * b},${y + sy * (b - arm)}L${x + sx * b},${y + sy * b}L${x + sx * (b - arm)},${y + sy * b}`;
    }
  }
  return d;
}

/** Open chevron (arrow head) at `b`, pointing from `a` to `b`, as "x,y x,y x,y". */
export function chevron(a: ScreenPt, b: ScreenPt, size = 6) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const p1 = { x: b.x - Math.cos(ang - 0.6) * size, y: b.y - Math.sin(ang - 0.6) * size };
  const p2 = { x: b.x - Math.cos(ang + 0.6) * size, y: b.y - Math.sin(ang + 0.6) * size };
  return `${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
}

/**
 * Midpoint label for a conflict pair, 26 pt below the line's middle. Text like
 * "2.7 NM · 400 FT". Values round down, so a conflict never reads as the
 * 3.0 NM / 1000 FT minimum it is breaking.
 */
export function pairTag(
  vp: Viewport,
  a: Vec2,
  b: Vec2,
  distNm: number,
  altFt: number,
  fontSize = 10,
  units: { dist: DistUnit; alt: AltUnit } = { dist: 'nm', alt: 'ft' },
) {
  const sa = toScreen(vp, a);
  const sb = toScreen(vp, b);
  const x = (sa.x + sb.x) / 2;
  const y = (sa.y + sb.y) / 2 + 26;
  const dist = formatDistance(distNm, units.dist).toUpperCase();
  // Metres floored to 10 so a conflict never reads as the (≈305 m) limit; feet floored to 100.
  const alt = units.alt === 'm' ? `${Math.floor((altFt * 0.3048) / 10) * 10} M` : `${Math.floor(altFt / 100) * 100} FT`;
  const text = `${dist} · ${alt}`;
  const w = textWidth(text, fontSize) + 8;
  /** The filled chip behind the text (14 pt tall, centred on x, y). */
  const rect = { x: x - w / 2, y: y - 7, w, h: 14 };
  return { x, y, text, rect };
}

/** Fix glyph: 9 pt outline triangle centred on the fix. */
export function fixTriangle(s: ScreenPt) {
  return `${s.x},${s.y - 4.5} ${s.x + 4},${s.y + 2.5} ${s.x - 4},${s.y + 2.5}`;
}

/**
 * SVG path of a sweep wedge from the centre (cx, cy) out to radius r, between
 * bearings a0 and a1 (degrees clockwise from north, a0 < a1).
 */
export function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => `${cx + Math.sin((a * Math.PI) / 180) * r},${cy - Math.cos((a * Math.PI) / 180) * r}`;
  return `M${cx},${cy} L${p(a0)} A${r},${r} 0 0 1 ${p(a1)} Z`;
}
