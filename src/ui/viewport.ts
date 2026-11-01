// Screen <-> world maths and hit-testing for the radar. Pure functions (no
// React / React Native imports) so they can be unit tested.
import type { Plane, Vec2 } from '../engine/types';

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

/** Where a plane's two-line data tag sits relative to its blip, scaled from the tag font size. */
export interface TagLayout {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  /** Baselines of the two text lines, relative to the tag's top. */
  line1: number;
  line2: number;
}

export function tagLayout(fontSize: number): TagLayout {
  return {
    offsetX: 9,
    offsetY: -Math.round(fontSize * 2.4),
    // Wide enough for the longest second line, e.g. "100↓ 250 31R".
    width: Math.round(fontSize * 7.1),
    height: Math.round(fontSize * 2.75),
    line1: fontSize,
    line2: Math.round(fontSize * 2.2),
  };
}

/**
 * The plane under a touch at (x, y): a touch on a plane's data tag wins
 * outright, otherwise the nearest blip within `radiusPx`.
 */
export function hitTest(planes: readonly Plane[], v: Viewport, tag: TagLayout, x: number, y: number, radiusPx: number): string | null {
  let best: string | null = null;
  let bestScore = radiusPx;
  for (const p of planes) {
    const s = toScreen(v, p.pos);
    const tx = s.x + tag.offsetX;
    const ty = s.y + tag.offsetY;
    const onTag = x >= tx - 2 && x <= tx + tag.width && y >= ty - 4 && y <= ty + tag.height;
    const score = onTag ? 0 : Math.hypot(s.x - x, s.y - y);
    if (score < bestScore) {
      bestScore = score;
      best = p.id;
    }
  }
  return best;
}
