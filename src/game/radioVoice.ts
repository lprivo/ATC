import * as Speech from 'expo-speech';
import { AccessibilityInfo, Platform } from 'react-native';
import { duckMusic, playEffect } from './audio';
import { pickVoices, RadioDesk, type PlaneNow, type RadioCommand, type Transmission } from './radio';

/**
 * The radio voice (issue #49): the controller's call for the player's
 * commands, then the pilot's readback, each opened and closed by a squelch
 * click, in two of the phone's own voices (expo-speech, offline). Module
 * state, like the other audio: commands are noted where they're given
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
let active = false;
let screenReader = false;
let lookup: (id: string) => PlaneNow | undefined = () => undefined;
const desk = new RadioDesk();
const queue: Transmission[] = [];
let speaking = false;
/** Bumped by a reset, so a call already under way stops at its next step. */
let generation = 0;
let ticker: ReturnType<typeof setInterval> | null = null;
let voices: { controller?: string; pilot?: string } | null = null;

/** Calls waiting to be said; more than this and the oldest are dropped (the player has moved on). */
const MAX_QUEUE = 3;
const TICK_MS = 200;
/** Between the controller's call and the pilot's readback, and between calls. */
const READBACK_GAP_MS = 450;
const CALL_GAP_MS = 700;
const VOICE = {
  controller: { language: 'en-GB', rate: 1.05, pitch: 1.0 },
  pilot: { language: 'en-US', rate: 1.1, pitch: 1.0 },
};
const CLICK_VOLUME = 0.45;
const VOICES_TIMEOUT_MS = 1500;
/** A call that never reports it's done (no speech engine) is given up after about this long. */
const speechLimitMs = (text: string) => 3000 + text.length * 90;

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
  safe(() => Speech.stop());
  speaking = false;
  duckMusic(false);
}

function tick() {
  if (!enabled || !active) return;
  for (const t of desk.due(Date.now(), lookup)) queue.push(t);
  while (queue.length > MAX_QUEUE) queue.shift();
  if (!speaking && queue.length && !screenReader) say(queue.shift()!);
}

async function say(t: Transmission) {
  const g = generation;
  speaking = true;
  duckMusic(true);
  // The voice list can wait forever where there are no voices (expo-speech on the web): fall back to the default voice.
  voices ??= await Promise.race([
    Speech.getAvailableVoicesAsync().then(
      (vs) => pickVoices(vs.map((v) => ({ identifier: v.identifier, name: v.name, language: v.language, quality: String(v.quality) }))),
      () => ({}),
    ),
    wait(VOICES_TIMEOUT_MS).then(() => ({})),
  ]);
  if (g !== generation) return;
  await transmit(t.controller, { ...VOICE.controller, voice: voices.controller });
  await wait(READBACK_GAP_MS);
  if (g !== generation) return;
  await transmit(t.readback, { ...VOICE.pilot, voice: voices.pilot });
  await wait(CALL_GAP_MS);
  if (g !== generation) return;
  speaking = false;
  if (!queue.length) duckMusic(false);
}

/** One transmission: key up (click), speak, key down (squelch tail). Resolves once, however it ends. */
function transmit(text: string, opts: Speech.SpeechOptions): Promise<void> {
  return new Promise((resolve) => {
    let over = false;
    const finish = (click: boolean) => {
      if (over) return;
      over = true;
      clearTimeout(limit);
      if (click) playEffect('radioOff', CLICK_VOLUME);
      resolve();
    };
    const limit = setTimeout(() => finish(true), speechLimitMs(text));
    playEffect('radioOn', CLICK_VOLUME);
    // Only pass a voice that was found: asking for one makes expo-speech wait for the voice list.
    const { voice, ...rest } = opts;
    safe(
      () => Speech.speak(text, { ...rest, ...(voice ? { voice } : {}), onDone: () => finish(true), onStopped: () => finish(false), onError: () => finish(true) }),
      () => finish(true),
    );
  });
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function safe(f: () => void, onError?: () => void) {
  try {
    f();
  } catch {
    onError?.();
  }
}
