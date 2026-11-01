import type { Vec2 } from './types';

const RAD = Math.PI / 180;

export const normDeg = (d: number) => ((d % 360) + 360) % 360;

/** Signed shortest turn from `from` to `to`, in (-180, 180]. */
export const angleDiff = (from: number, to: number) => {
  const d = normDeg(to - from);
  return d > 180 ? d - 360 : d;
};

export const dist = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);

export const headingTo = (from: Vec2, to: Vec2) =>
  normDeg(Math.atan2(to.x - from.x, to.y - from.y) / RAD);

/** Unit vector pointing along a heading. */
export const dirOf = (heading: number): Vec2 => ({
  x: Math.sin(heading * RAD),
  y: Math.cos(heading * RAD),
});

export const add = (a: Vec2, b: Vec2, scale = 1): Vec2 => ({
  x: a.x + b.x * scale,
  y: a.y + b.y * scale,
});

/**
 * Position of `pt` relative to a line through `origin` along `heading`:
 * `along` > 0 is ahead of the origin, `cross` > 0 is to the right of the track.
 */
export function trackOffsets(pt: Vec2, origin: Vec2, heading: number) {
  const d = dirOf(heading);
  const vx = pt.x - origin.x;
  const vy = pt.y - origin.y;
  return { along: vx * d.x + vy * d.y, cross: vx * d.y - vy * d.x };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Move `current` toward `target` by at most `maxStep`. */
export const approach = (current: number, target: number, maxStep: number) =>
  Math.abs(target - current) <= maxStep ? target : current + Math.sign(target - current) * maxStep;
