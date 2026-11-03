// The first-time tutorial (design T1–T4): four coach marks over a scripted
// mini-session. Each step waits for the real gesture; there is no Next button.
// `TUTORIAL` is the whole tutorial as plain serialisable data (scene, copy,
// steps), so a backend can serve it later; `tick` is the step machine. Pure
// (no React / React Native imports).
import { airportByIcao } from '../engine/airports';
import type { Sim } from '../engine/sim';
import { scene, type PlaneSpec } from './scene';

/** What a step waits for. The step machine (`tick`) switches on this, never on a step's position. */
export type Gesture = 'select' | 'descend' | 'clear' | 'pinch';

/** Where the coach mark draws attention on the radar. */
export type Spotlight = 'plane' | 'route' | 'pinch' | 'sheet';

/** Card copy. `{callsign}`, `{runway}` and `{altitude}` are filled in (`fillCopy`), the altitude in the player's unit. */
export interface TutorialCopy {
  title: string;
  body: string;
}

export interface TutorialStep extends TutorialCopy {
  gesture: Gesture;
  spotlight: Spotlight;
  /** Shows the line-style legend (your path / cleared). */
  legend?: boolean;
}

export interface TutorialDefinition {
  /** ICAO code of the airport the scene is at. */
  airport: string;
  /** The plane the tutorial is about. */
  callsign: string;
  /** The runway end the clear step asks for. */
  runway: string;
  /** The descend step asks for this altitude (ft) or lower. */
  altitudeFt: number;
  /** The mini-session: these planes and nothing else. */
  planes: PlaneSpec[];
  steps: TutorialStep[];
  /** Shown in place of the descend card while the plane isn't selected (its controls are closed). */
  reselect: TutorialCopy;
}

export const TUTORIAL: TutorialDefinition = {
  airport: 'LHBP',
  callsign: 'WZZ9003',
  runway: '13L',
  altitudeFt: 4000,
  planes: [
    // North-west of the airport heading east at 6,000 ft, with room to descend and be cleared to 13L.
    { callsign: 'WZZ9003', type: 'A319', pos: { x: -12, y: 9 }, heading: 80, altitude: 6000, speed: 230 },
    // Already on a 7 nm final to 31R.
    { callsign: 'RYR41HB', type: 'B738', pos: { x: 6.48, y: -5.116 }, heading: 312, altitude: 2000, speed: 160, clearedTo: '31R' },
  ],
  steps: [
    {
      gesture: 'select',
      title: 'Tap a plane to take control',
      body: 'Its label shows the callsign, then altitude in hundreds of feet (070 = 7,000 ft) and speed in knots.',
      spotlight: 'plane',
    },
    {
      gesture: 'descend',
      title: 'Bring it down to {altitude}',
      body: 'The big number is your order; “now” is what the plane is doing. Hold ▼ to step faster.',
      spotlight: 'sheet',
    },
    {
      gesture: 'clear',
      title: 'Hold, then drag to {runway}',
      body: "Press the plane until it buzzes, then trace its route. End on the runway's end and it snaps on; let go to clear it to land. It descends and slows down by itself.",
      spotlight: 'route',
      legend: true,
    },
    {
      gesture: 'pinch',
      title: 'Pinch to zoom in',
      body: "Budapest's two runways are only 1.6 km apart (0.86 nm), a few pixels on the full sector. Pinch in when you need to pick one; ⊕ zooms back out.",
      spotlight: 'pinch',
    },
  ],
  reselect: {
    title: 'Tap {callsign} again',
    body: 'Its controls closed. Tap the plane to open them, then bring it down to {altitude}.',
  },
};

const GESTURES: readonly Gesture[] = ['select', 'descend', 'clear', 'pinch'];

/**
 * The tutorial's mini-session as a Sim. Throws if the definition doesn't hold
 * together: an unknown airport or runway end, no steps or an unknown gesture,
 * or no plane with the tutorial's callsign.
 */
export function tutorialSim(def: TutorialDefinition = TUTORIAL): Sim {
  const airport = airportByIcao(def.airport);
  if (!airport) throw new Error(`tutorial: no airport ${def.airport}`);
  if (def.steps.length === 0) throw new Error('tutorial: no steps');
  const bad = def.steps.find((s) => !GESTURES.includes(s.gesture));
  if (bad) throw new Error(`tutorial: unknown gesture ${bad.gesture}`);
  if (!def.planes.some((p) => p.callsign === def.callsign)) throw new Error(`tutorial: no plane ${def.callsign}`);
  const sim = scene(def.planes, { airport });
  if (!sim.runwayEnd(def.runway)) throw new Error(`tutorial: ${def.airport} has no runway end ${def.runway}`);
  return sim;
}

/** Fills a card's placeholders. */
export function fillCopy(copy: TutorialCopy, values: { callsign: string; runway: string; altitude: string }): TutorialCopy {
  const fill = (s: string) => s.replace(/\{(callsign|runway|altitude)\}/g, (_, k: keyof typeof values) => values[k]);
  return { title: fill(copy.title), body: fill(copy.body) };
}

// ---- the step machine ----------------------------------------------------------

/**
 * The pinch step is done once the radar is zoomed in this much past the widest
 * it was during the step, or to the radar's closest zoom (`maxZoom`) when that
 * is nearer, as long as it zoomed in at all.
 */
export const PINCH_FACTOR = 1.5;

/** Every step but the pinch needs the tutorial plane in the air. */
const needsPlane = (g: Gesture) => g !== 'pinch';
/** The clear step draws on the radar: the plane's controls close so the card doesn't sit on them (design T3). */
const deselectsOnEnter = (g: Gesture) => g === 'clear';

export interface TutorialState {
  /** Index into `steps`; `steps.length` means all done (START PLAYING). */
  step: number;
  /** The step's first tick has run (its on-enter effects are done). */
  entered: boolean;
  /** Widest zoom seen during this step (px per nm), null until the radar has laid out. */
  zoomLow: number | null;
}

/** What the tutorial watches, read from the game each frame. */
export interface TutorialObservation {
  /** The tutorial plane is in the air. */
  planeActive: boolean;
  /** Callsign of the selected plane, if any. */
  selected: string | null;
  /** The tutorial plane's commanded altitude (ft), or null if it isn't in the air. */
  targetAltitude: number | null;
  /** The tutorial plane is cleared to land (on any runway). */
  cleared: boolean;
  /** Radar zoom now (px per nm), null until it has laid out. */
  zoom: number | null;
  /** The radar's closest zoom (px per nm). */
  maxZoom: number;
}

/** What a tick asks the game to do. */
export interface TutorialTick {
  state: TutorialState;
  /** The plane is gone before the steps that need it are done: play the scene again. */
  restart: boolean;
  /** Close the plane's controls. */
  deselect: boolean;
}

/** The state at a step (clamped to the steps, so a bad `initialStep` can't escape them). */
export function startTutorial(def: TutorialDefinition, step = 0): TutorialState {
  const s = Number.isFinite(step) ? Math.round(step) : 0;
  return { step: Math.min(Math.max(s, 0), def.steps.length), entered: false, zoomLow: null };
}

export const isDone = (def: TutorialDefinition, s: TutorialState) => s.step >= def.steps.length;

function gestureDone(def: TutorialDefinition, g: Gesture, o: TutorialObservation, zoomLow: number | null): boolean {
  switch (g) {
    case 'select':
      return o.selected === def.callsign;
    case 'descend':
      return o.targetAltitude !== null && o.targetAltitude <= def.altitudeFt;
    case 'clear':
      return o.cleared;
    case 'pinch':
      return o.zoom !== null && zoomLow !== null && o.zoom > zoomLow && o.zoom >= Math.min(zoomLow * PINCH_FACTOR, o.maxZoom);
  }
}

/**
 * One frame of the step machine: at most one step further, so each step's
 * own check runs (a player who is ahead moves on one frame per step).
 */
export function tick(def: TutorialDefinition, s: TutorialState, o: TutorialObservation): TutorialTick {
  const idle = { state: s, restart: false, deselect: false };
  if (isDone(def, s)) return idle;
  const g = def.steps[s.step].gesture;
  if (needsPlane(g) && !o.planeActive) return { ...idle, restart: true };
  const deselect = !s.entered && deselectsOnEnter(g);
  const zoomLow = o.zoom === null ? s.zoomLow : Math.min(s.zoomLow ?? o.zoom, o.zoom);
  if (gestureDone(def, g, o, zoomLow)) return { state: { step: s.step + 1, entered: false, zoomLow: null }, restart: false, deselect };
  const state = s.entered && zoomLow === s.zoomLow ? s : { step: s.step, entered: true, zoomLow };
  return { state, restart: false, deselect };
}

/** The card to show: the step's own, or the reselect card while the descend step has lost its plane's controls. */
export function cardFor(def: TutorialDefinition, s: TutorialState, selected: string | null): { copy: TutorialCopy; spotlight: Spotlight; legend: boolean } | null {
  if (isDone(def, s)) return null;
  const step = def.steps[s.step];
  if (step.gesture === 'descend' && selected !== def.callsign) return { copy: def.reselect, spotlight: 'plane', legend: false };
  return { copy: step, spotlight: step.spotlight, legend: !!step.legend };
}

/** Step counter as shown on the card, e.g. "2 / 4" (the last step's once done). */
export const stepLabel = (def: TutorialDefinition, s: TutorialState) => `${Math.min(s.step, def.steps.length - 1) + 1} / ${def.steps.length}`;
