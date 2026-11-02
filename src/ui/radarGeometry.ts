// Screen-space geometry for radar glyphs (design handoff, "Components" and
// "Radar furniture"). Pure functions, no React / React Native imports, so they
// can be unit tested. All results are in screen points; `scale` is pt per nm.
import { add, dirOf } from '../engine/math';
import type { Airport, Plane, RunwayEnd, Vec2 } from '../engine/types';
import { conflictAltitude, formatDistance, type AltUnit, type DistUnit } from '../game/settings';
import { textWidth, type LabelItem } from './labels';
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

export interface TailPiece {
  /** Screen points, from the end nearer the plane backwards. */
  points: ScreenPt[];
  opacity: number;
  width: number;
}

export interface TailStyle {
  /** Tail length: this many minutes of flight at the plane's current speed... */
  minutes: number;
  /** ...but at least this many pt, so a slow plane at low zoom still shows one. */
  minPt: number;
  /** Gap left clear around the symbol, pt. */
  startPt: number;
  /** Number of fading pieces. */
  pieces: number;
  /** Stroke width at the plane and at the far end. */
  width: number;
  widthEnd: number;
  /** Opacity at the plane and at the far end. */
  opacity: number;
  opacityEnd: number;
}

/** Tail length on screen: `minutes` of flight at the plane's current speed, at least `minPt`. */
export const tailLengthPt = (p: Pick<Plane, 'speed'>, vp: Viewport, style: Pick<TailStyle, 'minutes' | 'minPt'>) =>
  Math.max(style.minPt, (p.speed / 60) * style.minutes * vp.scale);

const lerp = (a: ScreenPt, b: ScreenPt, t: number): ScreenPt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** The part of a polyline between distances `from` and `to` along it (`to` past its end stops at the end). */
export function slicePolyline(path: ScreenPt[], from: number, to: number): ScreenPt[] {
  const out: ScreenPt[] = [];
  let walked = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg === 0) continue;
    const end = walked + seg;
    if (end >= from) {
      if (out.length === 0) out.push(lerp(a, b, (from - walked) / seg));
      if (end >= to) {
        out.push(lerp(a, b, (to - walked) / seg));
        return out;
      }
      if (end > from) out.push(b); // a slice starting exactly on b already has it
    }
    walked = end;
  }
  return out;
}

/**
 * The tail's centreline on screen (playtest feedback, #37): from `startPt`
 * behind the symbol, back along the path the plane actually flew, for
 * `minutes` of flight at its **current** speed, so its length reads as speed at
 * a glance and changes as soon as the speed does. Where the history is too
 * short (just spawned), it carries on straight back. Label placement avoids it.
 */
export function tailPath(p: Plane, vp: Viewport, style: TailStyle): ScreenPt[] {
  const total = tailLengthPt(p, vp, style);
  if (!(total > style.startPt)) return [];
  // Walk back from the newest history sample, only as far as the tail needs, skipping zero-length steps.
  const path: ScreenPt[] = [toScreen(vp, p.pos)];
  let length = 0;
  for (let i = p.trail.length - 1; i >= 0 && length < total; i--) {
    const s = toScreen(vp, p.trail[i]);
    const last = path[path.length - 1];
    const d = Math.hypot(s.x - last.x, s.y - last.y);
    if (d > 1e-6) {
      path.push(s);
      length += d;
    }
  }
  // Too short: extend straight back (along the last flown step, or opposite the heading).
  if (length < total) {
    const end = path[path.length - 1];
    let back: ScreenPt;
    if (path.length >= 2) {
      const prev = path[path.length - 2];
      const d = Math.hypot(end.x - prev.x, end.y - prev.y);
      back = { x: (end.x - prev.x) / d, y: (end.y - prev.y) / d };
    } else {
      const h = screenDir(p.heading);
      back = { x: -h.x, y: -h.y };
    }
    path.push({ x: end.x + back.x * (total - length), y: end.y + back.y * (total - length) });
  }
  return slicePolyline(path, style.startPt, total);
}

/** The tail as drawn: `tailPath` in `pieces` equal lengths, fading and narrowing away from the plane. */
export function planeTail(p: Plane, vp: Viewport, style: TailStyle): TailPiece[] {
  const path = tailPath(p, vp, style);
  if (path.length < 2 || style.pieces < 1) return [];
  let length = 0;
  for (let i = 1; i < path.length; i++) length += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  const step = length / style.pieces;
  return Array.from({ length: style.pieces }, (_, k) => {
    const t = style.pieces === 1 ? 0 : k / (style.pieces - 1);
    return {
      points: slicePolyline(path, k * step, (k + 1) * step),
      opacity: style.opacity + (style.opacityEnd - style.opacity) * t,
      width: style.width + (style.widthEnd - style.width) * t,
    };
  });
}

/** A plane's entry for label placement: symbol position, label size, rank, and its tail to keep clear of. */
export function labelItemFor(p: Plane, s: ScreenPt, size: { w: number; h: number }, rank: number, vp: Viewport, tail: TailStyle): LabelItem {
  return { id: p.id, x: s.x, y: s.y, heading: p.heading, tail: tailPath(p, vp, tail), w: size.w, h: size.h, rank };
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
  const alt = conflictAltitude(altFt, units.alt).toUpperCase();
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
