// Where the tutorial's coach marks go on screen (design T1–T4). Pure: no React Native imports.
import type { Vec2 } from '../engine/types';
import type { Spotlight } from '../game/tutorial';
import { toScreen, type Viewport } from './viewport';

/** T1: the clear circle round the plane, and the ring drawn on its edge (design 46 / 92). */
export const PLANE_SPOT_R = 46;
/** T3: clear margin round the plane and the runway end in the route spotlight. */
const ROUTE_MARGIN = 70;
/** T4: the two finger hints, either side of the airport (design: ±77, ±70), and their radius. */
const PINCH_OFFSET = { x: 77, y: 70 };
export const TOUCH_HINT_R = 23;

export type CoachShape =
  /** Scrim everywhere but this ellipse (a circle when rx = ry); `ring` draws its edge, `light` uses the lighter route scrim. */
  | { kind: 'hole'; cx: number; cy: number; rx: number; ry: number; ring: boolean; light: boolean }
  /** Scrim over the radar above the sheet. */
  | { kind: 'aboveSheet'; bottom: number }
  /** No scrim: two finger hints. */
  | { kind: 'pinch'; points: { x: number; y: number }[] };

/** Rounded to whole points, so the overlay doesn't re-render for sub-point camera jitter. */
const r = (n: number) => Math.round(n);

/**
 * The scrim shape for a step. `plane` is the tutorial plane (null once it's
 * gone), `runway` the threshold the route step asks for.
 */
export function coachShape(spot: Spotlight, vp: Viewport, opts: { plane: Vec2 | null; runway: Vec2; sheetHeight: number }): CoachShape | null {
  switch (spot) {
    case 'plane': {
      if (!opts.plane) return null;
      const p = toScreen(vp, opts.plane);
      return { kind: 'hole', cx: r(p.x), cy: r(p.y), rx: PLANE_SPOT_R, ry: PLANE_SPOT_R, ring: true, light: false };
    }
    case 'route': {
      const a = toScreen(vp, opts.runway);
      const b = opts.plane ? toScreen(vp, opts.plane) : a;
      return {
        kind: 'hole',
        cx: r((a.x + b.x) / 2),
        cy: r((a.y + b.y) / 2),
        rx: r(Math.abs(a.x - b.x) / 2 + ROUTE_MARGIN),
        ry: r(Math.abs(a.y - b.y) / 2 + ROUTE_MARGIN),
        ring: false,
        light: true,
      };
    }
    case 'sheet':
      return { kind: 'aboveSheet', bottom: r(opts.sheetHeight) };
    case 'pinch': {
      const o = { x: vp.ox, y: vp.oy };
      return {
        kind: 'pinch',
        points: [
          { x: r(o.x - PINCH_OFFSET.x), y: r(o.y - PINCH_OFFSET.y) },
          { x: r(o.x + PINCH_OFFSET.x), y: r(o.y + PINCH_OFFSET.y) },
        ],
      };
    }
  }
}

/** SVG path: the whole w×h screen with an elliptical hole (filled even-odd). */
export function holePath(w: number, h: number, s: { cx: number; cy: number; rx: number; ry: number }) {
  const { cx, cy, rx, ry } = s;
  return `M0 0H${w}V${h}H0Z M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
}
