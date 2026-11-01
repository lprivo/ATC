// Gesture classification for the radar. Pure functions (no React / React
// Native imports) so they can be unit tested.

export interface TouchPt {
  x: number;
  y: number;
}

/** Design: a tap on empty radar moves less than 6 pt and lasts under 300 ms. */
export const TAP = { maxMovePt: 6, maxMs: 300 };
/** Two taps within this time and distance make a double-tap. */
export const DOUBLE_TAP = { maxGapMs: 300, maxDistPt: 30 };

export const isTap = (moved: number, ms: number) => moved < TAP.maxMovePt && ms < TAP.maxMs;

/** Whether a tap at `now`/`at` completes a double-tap with the previous tap (if any). */
export function isDoubleTap(prev: { t: number; at: TouchPt } | null, now: number, at: TouchPt): boolean {
  if (!prev) return false;
  return now - prev.t <= DOUBLE_TAP.maxGapMs && Math.hypot(at.x - prev.at.x, at.y - prev.at.y) <= DOUBLE_TAP.maxDistPt;
}

/** Distance and midpoint of a two-finger touch. */
export function pinchOf(a: TouchPt, b: TouchPt) {
  return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}

/** Zoom factor for one wheel event (web): ~10% per notch, smooth for trackpads. */
export const wheelZoomFactor = (deltaY: number) => Math.exp(-deltaY * 0.0015);
