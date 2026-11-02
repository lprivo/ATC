// Screen <-> world maths and hit-testing for the radar. Pure functions (no
// React / React Native imports) so they can be unit tested.
import type { Plane, Vec2 } from '../engine/types';
import type { Rect } from './labels';

/**
 * The radar camera: where the airport reference point (world 0,0) sits on
 * screen and how many points one nautical mile spans.
 */
export interface Viewport {
  w: number;
  h: number;
  /** Screen position of the airport reference point. */
  ox: number;
  oy: number;
  /** Points per nautical mile ("k" in the design). */
  scale: number;
}

/** Design camera limits and presets (pt per nm). */
export const ZOOM = { min: 5, max: 48, sector: 8, runway: 26 };
/** The airport sits a little above centre: 400 of 844 pt on the reference phone. */
const DEFAULT_ORIGIN_Y = 400 / 844;

export const clampScale = (k: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, k));

/** The default (re-centred) view for a w×h radar at the given zoom. */
export function defaultViewport(w: number, h: number, scale: number = ZOOM.sector): Viewport {
  return { w, h, ox: w / 2, oy: h * DEFAULT_ORIGIN_Y, scale: clampScale(scale) };
}

/** Keeps the camera when the radar is resized, anchored on the screen centre. */
export function resizeViewport(v: Viewport, w: number, h: number): Viewport {
  if (v.w === 0 || v.h === 0) return defaultViewport(w, h, v.scale);
  return { ...v, w, h, ox: v.ox + (w - v.w) / 2, oy: v.oy + (h - v.h) / 2 };
}

export const toScreen = (v: Viewport, p: Vec2) => ({ x: v.ox + p.x * v.scale, y: v.oy - p.y * v.scale });

export const toWorld = (v: Viewport, x: number, y: number): Vec2 => ({
  x: (x - v.ox) / v.scale,
  y: -(y - v.oy) / v.scale,
});

/** Moves the view by a screen delta. */
export const panBy = (v: Viewport, dx: number, dy: number): Viewport => ({ ...v, ox: v.ox + dx, oy: v.oy + dy });

/** Zooms to `scale` (clamped) keeping the world point under screen point (fx, fy) fixed. */
export function zoomAt(v: Viewport, scale: number, fx: number, fy: number): Viewport {
  const k = clampScale(scale);
  const w = toWorld(v, fx, fy);
  return { ...v, scale: k, ox: fx - w.x * k, oy: fy + w.y * k };
}

/**
 * Safari trackpad pinch: `gestureScale` is relative to the scale when the
 * pinch began (`startScale`), not to the previous event. Zooms to that
 * (clamped), keeping the world point under the pointer `at` fixed.
 */
export function trackpadPinchZoom(v: Viewport, startScale: number, gestureScale: number, at: { x: number; y: number }): Viewport {
  return zoomAt(v, startScale * gestureScale, at.x, at.y);
}

/** Double-tap: sector view zooms into the runways around the airport; anything else returns to the sector view. */
export function toggleRunwayZoom(v: Viewport): Viewport {
  const toRunway = v.scale < (ZOOM.sector + ZOOM.runway) / 2;
  return defaultViewport(v.w, v.h, toRunway ? ZOOM.runway : ZOOM.sector);
}

/**
 * Pans (never zooms) so a world point lands inside the visible band: below
 * `top` and above `bottom` (e.g. the sheet's top edge), and `margin` from the
 * sides. Used when a plane is selected so it isn't hidden by the sheet.
 */
export function ensureVisible(v: Viewport, p: Vec2, top: number, bottom: number, margin = 24): Viewport {
  const s = toScreen(v, p);
  let dx = 0;
  let dy = 0;
  if (s.x < margin) dx = margin - s.x;
  else if (s.x > v.w - margin) dx = v.w - margin - s.x;
  if (s.y < top) dy = top - s.y;
  else if (s.y > bottom) dy = bottom - s.y;
  return dx === 0 && dy === 0 ? v : panBy(v, dx, dy);
}

/** "x1,y1 x2,y2 ..." for an SVG polyline. */
export const polylinePoints = (v: Viewport, list: Vec2[]) =>
  list
    .map((p) => {
      const s = toScreen(v, p);
      return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
    })
    .join(' ');

/**
 * The plane under a touch at (x, y): a touch on a plane's data block wins
 * outright, otherwise the nearest symbol within `radiusPx`.
 */
export function hitTest(
  planes: readonly Plane[],
  v: Viewport,
  labels: ReadonlyMap<string, { rect: Rect }>,
  x: number,
  y: number,
  radiusPx: number,
): string | null {
  let best: string | null = null;
  let bestScore = radiusPx;
  for (const p of planes) {
    const r = labels.get(p.id)?.rect;
    const onLabel = r != null && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    const s = toScreen(v, p.pos);
    const score = onLabel ? 0 : Math.hypot(s.x - x, s.y - y);
    if (score < bestScore) {
      bestScore = score;
      best = p.id;
    }
  }
  return best;
}
