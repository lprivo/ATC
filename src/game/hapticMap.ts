// Which haptic each game moment fires (design "Haptics" table). Pure data so it
// can be tested and, later, tuned from a backend.

export type HapticMoment =
  /** Select a plane. */
  | 'select'
  /** Each stepper step. */
  | 'step'
  /** A stepper button pressed at its limit. */
  | 'limit'
  /** A hold enters draw mode. */
  | 'drawStart'
  /** The drawn path snaps to a runway. */
  | 'snap'
  /** A landing clearance the player made is confirmed. */
  | 'landingConfirmed'
  /** A new conflict (once per pair). */
  | 'conflict';

export type HapticKind = 'impactLight' | 'impactMedium' | 'impactRigid' | 'selection' | 'success' | 'warning';

export const HAPTIC_FOR: Readonly<Record<HapticMoment, HapticKind>> = {
  select: 'impactLight',
  step: 'selection',
  limit: 'impactRigid',
  drawStart: 'impactMedium',
  snap: 'impactRigid',
  landingConfirmed: 'success',
  conflict: 'warning',
};
