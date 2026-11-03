import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { playEffect } from './audio';
import type { Segment } from './radioScript';

/**
 * Plays one radio transmission stitched from recorded pieces (issue #49): a
 * squelch click, the pieces back to back on a timer (their lengths are known,
 * so there's no waiting on each to finish), and the squelch tail. `rate`
 * speeds the whole transmission up or down a little, pitch with it, so even
 * the same pieces don't sound quite the same.
 */
export async function playTransmission(segments: readonly Segment[], opts: { rate?: number; clickVolume?: number } = {}): Promise<void> {
  if (!segments.length) return;
  const rate = opts.rate ?? 1;
  const click = opts.clickVolume ?? 0.45;
  const players: AudioPlayer[] = [];
  try {
    for (const s of segments) {
      const p = createAudioPlayer(s.file);
      p.shouldCorrectPitch = false;
      players.push(p);
    }
    // Wait (briefly) for the pieces to load, so the first ones don't start late.
    const began = Date.now();
    while (players.some((p) => !p.isLoaded) && Date.now() - began < LOAD_WAIT_MS) await wait(15);
    for (const p of players) safe(() => p.setPlaybackRate(rate));
    playEffect('radioOn', click);
    let at = KEY_UP_MS;
    const timers = segments.map((s, i) => {
      at += s.gapMs / rate;
      const t = setTimeout(() => safe(() => players[i].play()), Math.max(0, at));
      at += s.ms / rate;
      return t;
    });
    await wait(at);
    playEffect('radioOff', click);
    await wait(TAIL_MS);
    timers.forEach(clearTimeout);
  } finally {
    for (const p of players) safe(() => p.remove());
  }
}

/** A random transmission rate, a few per cent either side of normal. */
export const randomRate = (rng: () => number = Math.random) => 0.96 + rng() * 0.08;

const LOAD_WAIT_MS = 600;
/** The voice starts just after the key-up click. */
const KEY_UP_MS = 70;
const TAIL_MS = 150;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const safe = (f: () => void) => {
  try {
    f();
  } catch {
    // Best effort.
  }
};
