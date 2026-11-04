// Turns a radio call into recorded clips (issue #49). A call is a few phrase
// chunks, each recorded whole in the context of a real call (the callsign;
// "descend to altitude four thousand feet"; "turn left heading" + "zero four
// zero"), joined where a speaker pauses anyway, sometimes with a hesitation.
// The phrasings and value ranges are plain data in scripts/voices/manifest.json,
// shared with the generator, which builds chunk ids from the same words. Pure
// (no React / React Native / expo imports); `clipPlayer.ts` plays the result.
import manifest from '../../scripts/voices/manifest.json';
import { angleDiff } from '../engine/math';
import type { CallChanges, PlaneNow, RadioCall } from './radio';
import type { VoiceClips } from './voiceTypes';

export type Role = 'controller' | 'pilot';
export type PhraseKind = keyof (typeof manifest.phrasings)['controller'];
/** How each instruction is said, by role (manifest data). */
export const PHRASINGS = manifest.phrasings as unknown as Record<Role, Record<PhraseKind, string[]>>;
export const VALUES = manifest.values;

/** Pauses (ms) before a chunk: after the callsign, between instructions, between a heading stem and its number, around a hesitation. */
export const GAPS = { afterCallsign: 140, betweenInstructions: 170, inPhrase: 10, beforeFiller: 60, afterFiller: 260 };
/** How often a call has a hesitation ("uh", "er"), by role: at most one per call (manifest data). */
export const FILLER_CHANCE = manifest.fillers.chance as Record<Role, number>;

// ---- spoken words (as the generator builds them) --------------------------------------------

const DIGIT: Record<string, string> = manifest.lists.digits;
const LETTER: Record<string, string> = manifest.lists.letters;
const AIRLINE = manifest.airlines as unknown as Record<string, string>;

export const digitWords = (s: string) => [...s].filter((c) => c >= '0' && c <= '9').map((c) => DIGIT[c]).join(' ');
export const headingWords = (h: number) => digitWords(String(Math.round(h) % 360 || 360).padStart(3, '0'));
export function altitudeWords(ft: number): string {
  const r = Math.round(ft / 100) * 100;
  if (r > VALUES.transitionFt) return `flight level ${digitWords(String(Math.round(r / 100)).padStart(3, '0'))}`;
  const th = Math.floor(r / 1000);
  const hu = Math.round((r % 1000) / 100);
  return [th ? `${digitWords(String(th))} thousand` : '', hu ? `${DIGIT[hu]} hundred` : '', 'feet'].filter(Boolean).join(' ');
}
export const speedWords = (kt: number) => `${digitWords(String(Math.round(kt)))} knots`;
export function runwayWords(id: string): string {
  const m = /^(\d{1,2})([LRC]?)$/.exec(id.toUpperCase());
  if (!m) return id;
  const side = { L: 'left', R: 'right', C: 'center', '': '' }[m[2] as 'L'];
  return [digitWords(m[1].padStart(2, '0')), side].filter(Boolean).join(' ');
}
export function callsignWords(callsign: string): string {
  const cs = callsign.toUpperCase();
  const airline = cs.length > 3 ? AIRLINE[cs.slice(0, 3)] : undefined;
  const rest = airline ? cs.slice(3) : cs;
  return [airline, ...[...rest].map((ch) => DIGIT[ch] ?? LETTER[ch])].filter(Boolean).join(' ');
}

/** A chunk's clip id, from its words (the generator does the same). */
export const chunkId = (text: string) => `x_${text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;

// ---- a call as chunks -------------------------------------------------------------------------

export interface Instruction {
  kind: PhraseKind;
  values: Partial<Record<'side' | 'hdg' | 'alt' | 'spd' | 'rwy', string>>;
}

/** The instructions for a call's changes, in the order heading, altitude, speed, landing. */
export function instructionsFor(c: CallChanges, now: PlaneNow): Instruction[] {
  const out: Instruction[] = [];
  if (c.heading !== undefined) {
    const hdg = headingWords(c.heading);
    const turn = angleDiff(now.heading, c.heading);
    out.push(Math.abs(turn) < 3 ? { kind: 'fly', values: { hdg } } : { kind: 'turn', values: { side: turn > 0 ? 'right' : 'left', hdg } });
  }
  if (c.altitude !== undefined) {
    const fl = Math.round(c.altitude / 100) * 100 > VALUES.transitionFt;
    const verb = c.altitude < now.altitude - 50 ? 'descend' : c.altitude > now.altitude + 50 ? 'climb' : null;
    const kind: PhraseKind = verb ? (fl ? `${verb}FL` : verb) : 'maintainAlt';
    out.push({ kind, values: { alt: altitudeWords(c.altitude) } });
  }
  if (c.speed !== undefined) {
    const kind: PhraseKind = c.speed < now.speed - 2 ? 'reduce' : c.speed > now.speed + 2 ? 'increase' : 'maintainSpd';
    out.push({ kind, values: { spd: speedWords(c.speed) } });
  }
  if (c.land !== undefined) out.push({ kind: 'land', values: { rwy: runwayWords(c.land) } });
  return out;
}

/** Remembers the last phrasing and take used, so the next call picks another. */
export class RadioMemory {
  private lastPhrase = new Map<string, number>();
  private lastTake = new Map<string, string>();
  phrase(key: string, count: number, rng: () => number): number {
    const last = this.lastPhrase.get(key);
    let i = Math.floor(rng() * count);
    if (count > 1 && i === last) i = (i + 1) % count;
    this.lastPhrase.set(key, i);
    return i;
  }
  take(key: string, options: string[], rng: () => number): string {
    const last = this.lastTake.get(key);
    const pool = options.length > 1 ? options.filter((t) => t !== last) : options;
    const t = pool[Math.floor(rng() * pool.length)];
    this.lastTake.set(key, t);
    return t;
  }
}

export interface Chunk {
  /** What's said; empty for a hesitation. */
  text: string;
  /** A hesitation: one of the voice's `h_` clips ("uh", "er"). */
  filler?: true;
  /** Silence before it. */
  gapMs: number;
}

/**
 * The chunks of one utterance: the controller's "callsign, instructions" or
 * the pilot's "instructions, callsign". Some calls (`FILLER_CHANCE`, or
 * `fillerChance`) get one hesitation at a pause: at the start, or between
 * two chunks ("descend four thousand feet, uh, Wizz Air niner zero zero three").
 */
export function chunksFor(role: Role, callsign: string, instructions: Instruction[], memory: RadioMemory, rng: () => number, planeId: string, fillerChance = FILLER_CHANCE[role]): Chunk[] {
  const out: Chunk[] = [];
  const cs = callsignWords(callsign);
  if (role === 'controller') out.push({ text: cs, gapMs: 0 });
  instructions.forEach((ins, i) => {
    const options = PHRASINGS[role][ins.kind];
    let phrase = options[memory.phrase(`${planeId}:${role}:${ins.kind}`, options.length, rng)];
    for (const [k, v] of Object.entries(ins.values)) phrase = phrase.replace(`{${k}}`, v);
    phrase.split('|').forEach((part, j) => {
      const gapMs = j > 0 ? GAPS.inPhrase : out.length === 0 ? 0 : i === 0 && role === 'controller' ? GAPS.afterCallsign : GAPS.betweenInstructions;
      out.push({ text: part.trim(), gapMs });
    });
  });
  if (role === 'pilot') out.push({ text: cs, gapMs: GAPS.betweenInstructions });
  if (out.length && rng() < fillerChance) {
    const at = Math.floor(rng() * out.length);
    const next = out[at];
    out.splice(at, 1, { text: '', filler: true, gapMs: at ? GAPS.beforeFiller : 0 }, { ...next, gapMs: GAPS.afterFiller });
  }
  return out;
}

// ---- chunks → clips ----------------------------------------------------------------------------

export interface Segment {
  /** Clip id: a phrase chunk (`x_…`) or a hesitation (`h_…`). */
  piece: string;
  take: string;
  file: number;
  ms: number;
  /** Silence before this clip. */
  gapMs: number;
}

/**
 * The clips for an utterance's chunks, in one voice: each chunk's whole
 * recording, the take that continues (`m`) or, for the last chunk, the one
 * that ends a call (`f`); a hesitation is one of the voice's own (`h_`).
 * Null when a chunk has no recording (a callsign outside the flight lists):
 * the call isn't said rather than said in part.
 */
export function toSegments(opts: { voice: string; clips: VoiceClips; chunks: Chunk[]; memory: RadioMemory; rng: () => number }): Segment[] | null {
  const cast = opts.clips[opts.voice];
  if (!cast) return null;
  const out: Segment[] = [];
  for (const [i, chunk] of opts.chunks.entries()) {
    if (chunk.filler) {
      const fillers = Object.keys(cast.clips).filter((id) => id.startsWith('h_'));
      if (fillers.length) push(out, opts, opts.memory.take(`${opts.voice}:filler`, fillers, opts.rng), 'h', chunk.gapMs);
      continue;
    }
    if (!push(out, opts, chunkId(chunk.text), i === opts.chunks.length - 1 ? 'f' : 'm', chunk.gapMs)) return null;
  }
  return out;
}

function push(out: Segment[], opts: { voice: string; clips: VoiceClips; memory: RadioMemory; rng: () => number }, piece: string, wanted: string, gapMs: number): boolean {
  const takes = opts.clips[opts.voice].clips[piece];
  if (!takes?.length) return false;
  const pool = takes.filter((t) => t.take.startsWith(wanted));
  const usable = pool.length ? pool : takes;
  const name = opts.memory.take(`${opts.voice}:${piece}:${wanted}`, usable.map((t) => t.take), opts.rng);
  const take = usable.find((t) => t.take === name)!;
  out.push({ piece, take: take.take, file: take.file, ms: take.ms, gapMs: out.length ? gapMs : 0 });
  return true;
}

/** A desk call as the controller's transmission and the pilot's readback (null if either can't be said, or there's nothing to say). */
export function scriptCall(call: RadioCall, clips: VoiceClips, memory: RadioMemory, rng: () => number, fillerChance?: Partial<Record<Role, number>>): { controller: Segment[]; pilot: Segment[] } | null {
  const ins = instructionsFor(call.changes, call.plane);
  const ctl = controllerOf(clips);
  const pilot = pilotFor(call.plane.callsign, clips);
  if (!ins.length || !ctl || !pilot) return null;
  const say = (role: Role, voice: string) =>
    toSegments({ voice, clips, chunks: chunksFor(role, call.plane.callsign, ins, memory, rng, call.planeId, fillerChance?.[role]), memory, rng });
  const controller = say('controller', ctl);
  const readback = say('pilot', pilot);
  return controller && readback ? { controller, pilot: readback } : null;
}

/** The pilot voice for a plane: picked from the callsign, so a plane keeps its pilot. */
export function pilotFor(callsign: string, clips: VoiceClips): string | undefined {
  const pilots = Object.keys(clips).filter((id) => clips[id].role === 'pilot').sort();
  if (!pilots.length) return undefined;
  let h = 0;
  for (const ch of callsign) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pilots[h % pilots.length];
}

export const controllerOf = (clips: VoiceClips) => Object.keys(clips).find((id) => clips[id].role === 'controller');
