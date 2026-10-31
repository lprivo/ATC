import { normDeg } from '../engine/math';
import type { Plane } from '../engine/types';

/** How much one tap on a dial arrow changes each value. */
export const DIAL_STEP = { heading: 5, altitude: 1000, speed: 10 };

export type StepDirection = 1 | -1;

export const isFollowingRoute = (p: Plane) => p.route.length > 0;

/**
 * Next commanded heading for one dial step. While the plane flies a drawn path
 * its target heading keeps changing, so the first nudge starts from where it's
 * actually pointing (rounded to the step) rather than a stale target.
 */
export function nextHeading(p: Plane, dir: StepDirection): number {
  const step = DIAL_STEP.heading;
  const base = isFollowingRoute(p) ? Math.round(p.heading / step) * step : p.target.heading;
  return normDeg(base + dir * step);
}

/** Next commanded altitude: snap to the step grid, then move one step. The sim clamps limits. */
export const nextAltitude = (p: Plane, dir: StepDirection) =>
  snap(p.target.altitude, DIAL_STEP.altitude) + dir * DIAL_STEP.altitude;

/** Next commanded speed: snap to the step grid, then move one step. The sim clamps limits. */
export const nextSpeed = (p: Plane, dir: StepDirection) =>
  snap(p.target.speed, DIAL_STEP.speed) + dir * DIAL_STEP.speed;

const snap = (v: number, step: number) => Math.round(v / step) * step;
