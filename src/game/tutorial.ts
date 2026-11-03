// The first-time tutorial (design T1–T4): four coach marks over a scripted
// mini-session (fixtures.ts `tutorial`). Each step waits for the real gesture;
// there is no Next button. Pure (no React / React Native imports): the copy is
// plain data, and `advance` decides when a step is done.
import { ZOOM } from '../ui/viewport';

/** The plane the tutorial is about. */
export const TUTORIAL_CALLSIGN = 'WZZ9003';
/** T2 asks for this altitude (or lower). */
export const TUTORIAL_ALTITUDE_FT = 4000;

/** Where the coach mark draws attention on the radar. */
export type Spotlight = 'plane' | 'route' | 'pinch' | 'sheet';

export interface TutorialStep {
  title: string;
  body: string;
  spotlight: Spotlight;
  /** Shows the line-style legend (your path / cleared). */
  legend?: boolean;
}

/** The four coach marks, in order. Plain data (it may later come from a backend). */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: 'Tap a plane to take control',
    body: 'Its label shows the callsign, then altitude in hundreds of feet (070 = 7,000 ft) and speed in knots.',
    spotlight: 'plane',
  },
  {
    title: 'Bring it down to 4,000 ft',
    body: 'The big number is your order; “now” is what the plane is doing. Hold ▼ to step faster.',
    spotlight: 'sheet',
  },
  {
    title: 'Hold, then drag to 13L',
    body: "Press the plane until it buzzes, then trace its route. End on the runway's end and it snaps on; let go to clear it to land. It descends and slows down by itself.",
    spotlight: 'route',
    legend: true,
  },
  {
    title: 'Pinch to zoom in',
    body: "Budapest's two runways are only 1.6 km apart (0.86 nm), a few pixels on the full sector. Pinch in when you need to pick one; ⊕ zooms back out.",
    spotlight: 'pinch',
  },
];

/** Index of the current step; `TUTORIAL_STEPS.length` means all done (START PLAYING). */
export type StepIndex = number;
export const TUTORIAL_DONE: StepIndex = TUTORIAL_STEPS.length;

/** What the tutorial watches, read from the game each frame. */
export interface TutorialObservation {
  /** Callsign of the selected plane, if any. */
  selected: string | null;
  /** The tutorial plane's commanded altitude (ft), or null if it isn't in the air. */
  targetAltitude: number | null;
  /** The tutorial plane is cleared to land (on any runway). */
  cleared: boolean;
  /** Radar zoom now, and when the current step began (px per nm). */
  zoom: number;
  zoomAtStep: number;
}

/** T4 is done once the radar is zoomed in this much past where it was (or to runway zoom). */
export const PINCH_FACTOR = 2;
export const pinchTarget = (zoomAtStep: number) => Math.min(zoomAtStep * PINCH_FACTOR, ZOOM.runway);

/** Whether the gesture the step asks for has been done. */
export function stepDone(step: StepIndex, o: TutorialObservation): boolean {
  switch (step) {
    case 0:
      return o.selected === TUTORIAL_CALLSIGN;
    case 1:
      return o.targetAltitude !== null && o.targetAltitude <= TUTORIAL_ALTITUDE_FT;
    case 2:
      return o.cleared;
    case 3:
      return o.zoom >= pinchTarget(o.zoomAtStep);
    default:
      return false;
  }
}

/**
 * The step after this observation: at most one step further, so each step's
 * own check runs (a player who is ahead moves on one frame per step).
 */
export function advance(step: StepIndex, o: TutorialObservation): StepIndex {
  return step < TUTORIAL_DONE && stepDone(step, o) ? step + 1 : step;
}

/** Step counter as shown on the card, e.g. "2 / 4". */
export const stepLabel = (step: StepIndex) => `${Math.min(step, TUTORIAL_STEPS.length - 1) + 1} / ${TUTORIAL_STEPS.length}`;
