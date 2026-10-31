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

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Move `current` toward `target` by at most `maxStep`. */
export const approach = (current: number, target: number, maxStep: number) =>
  Math.abs(target - current) <= maxStep ? target : current + Math.sign(target - current) * maxStep;
