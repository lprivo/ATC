import { AccessibilityInfo, Platform } from 'react-native';
import { duckMusic } from './audio';
import { playTransmission, randomRate } from './clipPlayer';
import { RadioDesk, type PlaneNow, type RadioCall, type RadioCommand } from './radio';
import { RadioMemory, scriptCall } from './radioScript';
import { VOICE_CLIPS } from './voiceClips';

/**
 * The radio voice (issue #49): the controller's call for the player's
 * commands, then the pilot's readback, played from the recorded phrases
 * (`voiceClips.ts`), each opened and closed by a squelch click. Module state,
 * like the other audio: commands are noted where they're given
 * (`radioCommand`), and the game screen says when the radio may talk
 * (`setRadioActive`: in a session, not paused, at ×1 or ×2) and how to look a
 * plane up (`setRadioPlanes`).
 *
 * Calls queue (at most a few: older ones drop) and wait while the radio is
 * inactive; nothing is said while a screen reader is on, so it doesn't talk
 * over VoiceOver. Failures are ignored: the radio is flavour, commands apply
 * at once whatever it says.
 */

let enabled = true;
/** The player's radio volume (Settings), 0–1: the voices and their clicks. */
let volume = 1;
let active = false;
let screenReader = false;
let lookup: (id: string) => PlaneNow | undefined = () => undefined;
const desk = new RadioDesk();
const memory = new RadioMemory();
const queue: RadioCall[] = [];
let speaking = false;
/** Bumped by a reset, so a call already under way stops. */
let generation = 0;
let ticker: ReturnType<typeof setInterval> | null = null;

/** Calls waiting to be said; more than this and the oldest are dropped (the player has moved on). */
const MAX_QUEUE = 3;
const TICK_MS = 200;
/** The pilot answers after a moment: somewhere in this range (ms). */
const READBACK_GAP_MS = [350, 800] as const;
/** Between calls. */
const CALL_GAP_MS = 700;
const CLICK_VOLUME = 0.45;

// Quiet while VoiceOver / TalkBack is on. Native only: react-native-web always reports a screen reader.
if (Platform.OS !== 'web') {
  AccessibilityInfo.isScreenReaderEnabled?.().then(
    (on) => (screenReader = on),
    () => {},
  );
  AccessibilityInfo.addEventListener?.('screenReaderChanged', (on: boolean) => {
    screenReader = on;
  });
}

declare global {
  // Dev-only handle, like __sim: what the radio is doing, for a browser console or test.
  var __radio: { state: () => { enabled: boolean; active: boolean; screenReader: boolean; speaking: boolean; queued: number } } | undefined;
}
if (typeof __DEV__ !== 'undefined' && __DEV__) globalThis.__radio = { state: () => ({ enabled, active, screenReader, speaking, queued: queue.length }) };

export function setRadioEnabled(on: boolean) {
  enabled = on;
  if (!on) reset();
}

export function setRadioVolume(v: number) {
  volume = v;
}

/** A short call at the current volume, for the volume setting (not while a call is under way). */
export function previewRadio() {
  if (!enabled || speaking) return;
  const script = scriptCall({ planeId: 'preview', changes: { altitude: 4000 }, plane: PREVIEW_PLANE }, VOICE_CLIPS, memory, Math.random, { controller: 0 });
  if (!script) return;
  speaking = true;
  void playTransmission(script.controller, { rate: randomRate(), volume, clickVolume: CLICK_VOLUME * volume }).finally(() => (speaking = false));
}
const PREVIEW_PLANE: PlaneNow = { callsign: 'WZZ9003', heading: 80, altitude: 6000, speed: 230 };

/** The radio may talk now (in a session, not paused, not fast-forwarding). */
export function setRadioActive(on: boolean) {
  active = on;
  if (on && !ticker) ticker = setInterval(tick, TICK_MS);
  if (!on && ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

/** How to look up a plane as it is now (the current session's sim). */
export function setRadioPlanes(f: (id: string) => PlaneNow | undefined) {
  lookup = f;
}

/** A command the player just gave (the plane's new target, or a landing clearance). */
export function radioCommand(planeId: string, cmd: RadioCommand) {
  if (!enabled || screenReader) return;
  desk.note(planeId, cmd, Date.now());
}

/** A new session (or leaving one): forget pending calls and stop talking. */
export function resetRadio() {
  reset();
}

function reset() {
  generation++;
  desk.clear();
  queue.length = 0;
  speaking = false;
  duckMusic(false);
}

function tick() {
  if (!enabled || !active) return;
  for (const c of desk.due(Date.now(), lookup)) queue.push(c);
  while (queue.length > MAX_QUEUE) queue.shift();
  if (!speaking && queue.length && !screenReader) void say(queue.shift()!);
}

async function say(call: RadioCall) {
  const script = scriptCall(call, VOICE_CLIPS, memory, Math.random);
  if (!script) return;
  const g = generation;
  const stopped = () => g !== generation;
  speaking = true;
  duckMusic(true);
  try {
    await playTransmission(script.controller, { rate: randomRate(), volume, clickVolume: CLICK_VOLUME * volume, stopped });
    if (stopped()) return;
    await wait(READBACK_GAP_MS[0] + Math.random() * (READBACK_GAP_MS[1] - READBACK_GAP_MS[0]));
    if (stopped()) return;
    await playTransmission(script.pilot, { rate: randomRate(), volume, clickVolume: CLICK_VOLUME * volume, stopped });
    if (stopped()) return;
    await wait(CALL_GAP_MS);
  } catch {
    // Best effort: the radio is flavour.
  }
  if (stopped()) return;
  speaking = false;
  if (!queue.length) duckMusic(false);
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
