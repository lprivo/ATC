// Route drawing helpers (design: "Route drawing and runway snap"). Pure, no
// React / React Native imports, so they can be unit tested. World points are
// in nm (y north); screen points in pt.
import { add, angleDiff, dirOf, dist, headingTo, trackOffsets } from '../engine/math';
import type { Airport, RunwayEnd, Vec2 } from '../engine/types';
import { toScreen, type Viewport } from './viewport';

/** Design values. */
export const DRAW = {
  /** Thresholds within this distance of the finger show candidate rings: 3 nm or 60 pt, whichever is larger. */
  candidateNm: 3,
  candidatePt: 60,
  /** Snap within 28 pt or 0.8 nm, whichever is larger. */
  snapPt: 28,
  snapNm: 0.8,
  /** Alignment bonus weight in the snap score (pt). */
  alignWeight: 30,
  /** On release, the path is trimmed inside this distance of the threshold... */
  trimNm: 3.2,
  /** ...and ends at a final fix this far out on the centreline. */
  finalFixNm: 3,
  /** Loupe: radius, magnification max(26 pt/nm, 2.2 × zoom), and distance above the finger. */
  loupeRadius: 62,
  loupeMinK: 26,
  loupeZoom: 2.2,
  loupeAbovePt: 150,
  /** Confirm card auto-confirms after this long. */
  confirmMs: 3000,
};

const ends = (a: Airport) => a.runways.flatMap((r) => r.ends);

/** Threshold ids near the finger (candidate rings while drawing). */
export function candidates(airport: Airport, vp: Viewport, finger: Vec2): string[] {
  const reach = Math.max(DRAW.candidateNm, DRAW.candidatePt / vp.scale);
  return ends(airport)
    .filter((e) => dist(e.threshold, finger) <= reach)
    .map((e) => e.id);
}

/**
 * How well the last stretch of the path (its last 4 points) lines up with the
 * runway's approach direction: 1 = straight down the approach, 0 or less = across or away.
 */
export function alignment(points: readonly Vec2[], end: RunwayEnd): number {
  const tail = points.slice(-4);
  if (tail.length < 2) return 0;
  const hdg = headingTo(tail[0], tail[tail.length - 1]);
  return Math.cos((angleDiff(hdg, end.heading) * Math.PI) / 180);
}

/**
 * How far (pt) the last stretch of the path is from a runway end's extended
 * centreline: the mean sideways offset of the last 4 points. Parallel runways
 * share a heading, so this is what tells 31L from 31R.
 */
export function centrelineOffsetPt(points: readonly Vec2[], end: RunwayEnd, scale: number): number {
  const tail = points.slice(-4);
  if (tail.length === 0) return 0;
  const sum = tail.reduce((s, p) => s + Math.abs(trackOffsets(p, end.threshold, end.heading).cross), 0);
  return (sum / tail.length) * scale;
}

/**
 * The runway end the path snaps to, if the finger is within snap range of a
 * threshold (design: 28 pt or 0.8 nm). Ends the path is flying away from are
 * never candidates. Among the rest the lowest score wins: distance (pt)
 * − 30 × alignment + offset from the centreline (pt), so a path coming down
 * one centreline picks that runway even when the parallel threshold is nearer.
 */
export function snapTarget(airport: Airport, vp: Viewport, points: readonly Vec2[]): string | null {
  if (points.length === 0) return null;
  const finger = points[points.length - 1];
  const reachNm = Math.max(DRAW.snapNm, DRAW.snapPt / vp.scale);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const e of ends(airport)) {
    const dNm = dist(e.threshold, finger);
    if (dNm > reachNm) continue;
    const align = alignment(points, e);
    // Flying the wrong way down the runway (or away from it) isn't an approach.
    if (points.length >= 2 && align < 0) continue;
    const score = dNm * vp.scale - DRAW.alignWeight * align + centrelineOffsetPt(points, e, vp.scale);
    if (score < bestScore) {
      bestScore = score;
      best = e.id;
    }
  }
  return best;
}

/**
 * The path to send to the sim once it snapped to `end`: the tail of the drawn
 * path inside 3.2 nm of the threshold (or past it) is trimmed (earlier legs,
 * e.g. a downwind on the far side of the field, are kept), and the path ends
 * at a final fix 3 nm out on the centreline; the sim adds the threshold itself.
 * A plane already established inside the final fix goes straight to the threshold.
 */
export function finalisePath(points: readonly Vec2[], end: RunwayEnd, planePos?: Vec2): Vec2[] {
  const inFinalZone = (p: Vec2) => dist(p, end.threshold) <= DRAW.trimNm || trackOffsets(p, end.threshold, end.heading).along >= 0;
  const kept = [...points];
  while (kept.length && inFinalZone(kept[kept.length - 1])) kept.pop();
  const fix = add(end.threshold, dirOf(end.heading), -DRAW.finalFixNm);
  // Already on final inside the fix: straight to the threshold, no turning back for the fix.
  if (kept.length === 0 && planePos && onFinalInside(planePos, end)) return [{ ...end.threshold }];
  return [...kept, fix];
}

/** On the extended centreline (within 0.5 nm) and already closer than the final fix. */
function onFinalInside(p: Vec2, end: RunwayEnd) {
  const { along, cross } = trackOffsets(p, end.threshold, end.heading);
  return along < 0 && along > -DRAW.finalFixNm && Math.abs(cross) <= 0.5;
}

/**
 * The drawn points still ahead of the plane: everything after the point it is
 * closest to. Used to re-apply a path (e.g. Swap) without sending the plane
 * back to waypoints it has already passed.
 */
export function remainingPoints(points: readonly Vec2[], planePos: Vec2): Vec2[] {
  if (points.length === 0) return [];
  let nearest = 0;
  points.forEach((p, i) => {
    if (dist(p, planePos) < dist(points[nearest], planePos)) nearest = i;
  });
  return points.slice(nearest + 1);
}

/** The parallel runway end landing the same way (31L ↔ 31R), for the confirm card's Swap button. */
export function parallelEnd(airport: Airport, id: string): RunwayEnd | null {
  const me = ends(airport).find((e) => e.id === id);
  if (!me) return null;
  return ends(airport).find((e) => e.id !== id && Math.abs(angleDiff(e.heading, me.heading)) < 5) ?? null;
}

/**
 * Where the loupe goes: about 150 pt above the finger, shifted to the side away
 * from it, and kept inside the screen. Returns its centre and camera.
 */
export function loupeFor(vp: Viewport, finger: Vec2, insets = { top: 0, bottom: 0 }) {
  const s = toScreen(vp, finger);
  const r = DRAW.loupeRadius;
  const awayX = s.x < vp.w / 2 ? 1 : -1;
  const cx = Math.min(vp.w - r - 4, Math.max(r + 4, s.x + awayX * r * 0.8));
  const top = insets.top + r + 4;
  const bottom = vp.h - insets.bottom - r - 4;
  let cy = s.y - DRAW.loupeAbovePt;
  if (cy < top) cy = s.y + DRAW.loupeAbovePt; // no room above (under the HUD): go below the finger
  cy = Math.min(bottom, Math.max(top, cy));
  const k = Math.max(DRAW.loupeMinK, DRAW.loupeZoom * vp.scale);
  const cam: Viewport = { w: vp.w, h: vp.h, scale: k, ox: cx - finger.x * k, oy: cy + finger.y * k };
  return { cx, cy, r, cam, zoom: k / vp.scale };
}
