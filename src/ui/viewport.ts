// Screen <-> world maths and hit-testing for the radar. Pure functions (no
// React / React Native imports) so they can be unit tested.
import type { Plane, Vec2 } from '../engine/types';

export interface Viewport {
  w: number;
  h: number;
  /** Pixels per nautical mile. */
  scale: number;
}

/** Fits a square of ±rangeNm around the airport into a w×h area, centred. */
export function makeViewport(w: number, h: number, rangeNm: number): Viewport {
  return { w, h, scale: Math.min(w, h) / (2 * rangeNm) || 1 };
}

export const toScreen = (v: Viewport, p: Vec2) => ({ x: v.w / 2 + p.x * v.scale, y: v.h / 2 - p.y * v.scale });

export const toWorld = (v: Viewport, x: number, y: number): Vec2 => ({
  x: (x - v.w / 2) / v.scale,
  y: -(y - v.h / 2) / v.scale,
});

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
