import { normDeg } from '../engine/math';
import type { Plane } from '../engine/types';

/** How much one tap on a stepper button changes each value (design). */
export const DIAL_STEP = { heading: 5, altitude: 1000, speed: 10 };
/** Stepper limits (design): altitude 2,000–15,000 ft, speed 140–300 kt. Headings wrap. */
export const STEP_LIMITS = { altitude: { min: 2000, max: 15000 }, speed: { min: 140, max: 300 } };

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

/** Next commanded altitude: snap to the step grid, move one step, keep within the stepper limits. */
export const nextAltitude = (p: Plane, dir: StepDirection) =>
  towards(p.target.altitude, clampTo(snap(p.target.altitude, DIAL_STEP.altitude) + dir * DIAL_STEP.altitude, STEP_LIMITS.altitude), dir);

/** Next commanded speed: snap to the step grid, move one step, keep within the stepper limits. */
export const nextSpeed = (p: Plane, dir: StepDirection) =>
  towards(p.target.speed, clampTo(snap(p.target.speed, DIAL_STEP.speed) + dir * DIAL_STEP.speed, STEP_LIMITS.speed), dir);

/**
 * A step never goes against its direction: when the current value is already
 * beyond a limit (e.g. the glideslope target on final is below 2,000 ft), the
 * clamp would move it the other way, so the value stays put instead.
 */
const towards = (current: number, next: number, dir: StepDirection) => (dir * (next - current) < 0 ? current : next);

/** Whether a stepper button can't move further (it dims; #11 adds the limit haptic). */
export function atLimit(kind: 'altitude' | 'speed', p: Plane, dir: StepDirection) {
  const v = kind === 'altitude' ? p.target.altitude : p.target.speed;
  const lim = STEP_LIMITS[kind];
  return dir > 0 ? v >= lim.max : v <= lim.min;
}

/**
 * Hold-to-repeat timing (design): the first repeat after 400 ms, then every
 * 120 ms; once the button has been held 1.5 s, every 60 ms. Returns the delay
 * before the next repeat given how long the button has been held.
 */
export const REPEAT = { firstMs: 400, everyMs: 120, fastAfterMs: 1500, fastEveryMs: 60 };
export const nextRepeatDelay = (heldMs: number) =>
  heldMs < REPEAT.firstMs ? REPEAT.firstMs - heldMs : heldMs >= REPEAT.fastAfterMs ? REPEAT.fastEveryMs : REPEAT.everyMs;

/** Sheet status chip, most important first: conflict, go-around, cleared, then climbing/descending. */
export type StatusChip = { text: string; tone: 'danger' | 'good' | 'info' } | null;
/** How long after a go-around the sheet keeps saying GO-AROUND, in sim seconds. */
export const GO_AROUND_STATUS_SEC = 60;
export function statusChip(p: Plane, time: number): StatusChip {
  if (p.conflict) return { text: '! CONFLICT', tone: 'danger' };
  if (p.goAroundAt != null && time - p.goAroundAt < GO_AROUND_STATUS_SEC) return { text: 'GO-AROUND', tone: 'danger' };
  if (p.clearedRunway) return { text: `CLEARED ${p.clearedRunway.id}`, tone: 'good' };
  const diff = p.target.altitude - p.altitude;
  if (diff > 50) return { text: '↑ CLIMBING', tone: 'info' };
  if (diff < -50) return { text: '↓ DESCENDING', tone: 'info' };
  return null;
}

/** Trend arrow for a stepper's "now" line: ↑/↓ for altitude and speed, ↻/↺ for a turn. */
export function trend(kind: 'heading' | 'altitude' | 'speed', p: Plane) {
  if (kind === 'heading') {
    const d = ((p.target.heading - p.heading + 540) % 360) - 180;
    return Math.abs(d) < 1 ? '' : d > 0 ? '↻' : '↺';
  }
  const d = kind === 'altitude' ? p.target.altitude - p.altitude : p.target.speed - p.speed;
  return Math.abs(d) < (kind === 'altitude' ? 50 : 2) ? '' : d > 0 ? '↑' : '↓';
}

const snap = (v: number, step: number) => Math.round(v / step) * step;
const clampTo = (v: number, lim: { min: number; max: number }) => Math.min(lim.max, Math.max(lim.min, v));
