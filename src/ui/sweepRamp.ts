// The radar sweep's fade, as a function of position. Pure TypeScript with
// erasable types only, because scripts/make-sweep.mjs imports this file
// directly (Node strips the types) to bake the images the app draws.

/** Design: the splash/menu sweep fades over 0.8 rad. */
export const SWEEP_SPAN_DEG = 46;
/** Design `drawIcon`: the app icon's sweep is one radian wide. */
export const ICON_SWEEP_SPAN_DEG = 57.3;

/**
 * Alpha (0–1) of the sweep at offset (dx, dy) from its centre, in pixels with
 * y up. The leading edge points north at full alpha; the fade trails
 * anticlockwise to zero over `spanDeg` (a conic gradient), with one pixel of
 * anti-aliasing on the hard leading edge.
 */
export function sweepAlpha(dx: number, dy: number, spanDeg: number): number {
  const r = Math.hypot(dx, dy);
  const bearing = (Math.atan2(dx, dy) * 180) / Math.PI; // clockwise from north
  const pxDeg = r > 0 ? 180 / Math.PI / r : 360; // one pixel's width in degrees here
  if (bearing > pxDeg || bearing < -spanDeg) return 0;
  const ramp = Math.min(1, Math.max(0, 1 + bearing / spanDeg));
  const edge = Math.min(1, Math.max(0, -bearing / pxDeg + 0.5));
  return ramp * edge;
}

/** The images scripts/make-sweep.mjs bakes: file (under assets/), size in pixels and span. */
export const SWEEP_IMAGES = [
  { file: 'sweep.png', size: 1024, spanDeg: SWEEP_SPAN_DEG },
  // Drawn at twice the icon's size (2 × 104 pt ≈ 624 px at 3×), so baked at that resolution to keep the leading edge crisp.
  { file: 'sweep-icon.png', size: 640, spanDeg: ICON_SWEEP_SPAN_DEG },
] as const;
