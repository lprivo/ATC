// Turns a radio call into a sequence of recorded pieces (issue #49): which
// phrasing, which take of each piece, and the small gaps between them, so the
// same instruction never sounds quite the same twice. Pure (no React / React
// Native / expo imports); the phrasings are plain data. `clipPlayer.ts` plays
// the result.
import { angleDiff } from '../engine/math';
import type { CallChanges, PlaneNow } from './radio';
import type { VoiceClips } from './voiceTypes';

// ---- phrasings (plain data) ------------------------------------------------------------

/**
 * Each instruction's phrasings, as lists of pieces and slots, by who says it.
 * `{hdg}` `{alt}` `{spd}` `{rwy}` expand to spoken numbers; `{side}` is left or
 * right. One phrasing is picked per call, never the one used last time when
 * there's a choice.
 */
export const PHRASINGS = {
  controller: {
    turn: [['s_turn_{side}_heading', '{hdg}']],
    fly: [['s_fly_heading', '{hdg}']],
    descend: [['s_descend_to_altitude', '{alt}'], ['s_descend_altitude', '{alt}'], ['s_descend', '{alt}']],
    descendFL: [['s_descend', '{alt}']],
    climb: [['s_climb_to_altitude', '{alt}'], ['s_climb', '{alt}']],
    climbFL: [['s_climb', '{alt}']],
    maintainAlt: [['s_maintain', '{alt}']],
    reduce: [['s_reduce_speed', '{spd}']],
    increase: [['s_increase_speed', '{spd}']],
    maintainSpd: [['s_maintain', '{spd}']],
    land: [['s_runway', '{rwy}', 's_cleared_to_land']],
  },
  pilot: {
    turn: [['s_{side}_heading', '{hdg}'], ['s_turn_{side}_heading', '{hdg}']],
    fly: [['s_heading', '{hdg}'], ['s_fly_heading', '{hdg}']],
    descend: [['s_descend', '{alt}'], ['s_down_to', '{alt}'], ['s_descending', '{alt}']],
    descendFL: [['s_descend', '{alt}'], ['s_descending', '{alt}']],
    climb: [['s_climb', '{alt}'], ['s_up_to', '{alt}'], ['s_climbing', '{alt}']],
    climbFL: [['s_climb', '{alt}'], ['s_climbing', '{alt}']],
    maintainAlt: [['s_maintain', '{alt}']],
    reduce: [['s_reduce', '{spd}'], ['s_speed', '{spd}']],
    increase: [['s_increase', '{spd}'], ['s_speed', '{spd}']],
    maintainSpd: [['s_maintain', '{spd}']],
    land: [['s_cleared_to_land_runway', '{rwy}']],
  },
} as const satisfies Record<'controller' | 'pilot', Record<string, readonly (readonly string[])[]>>;

export type PhraseKind = keyof (typeof PHRASINGS)['controller'];

/** Pauses (ms) before a piece: after the callsign, between instructions, after a phrase stem, inside a number (a slight overlap: the pieces are trimmed with a little air round them). */
export const GAPS = { afterCallsign: 140, betweenInstructions: 170, afterStem: 30, inNumber: -20 };
/** Above this, altitudes are flight levels. */
export const TRANSITION_FT = 10000;

// ---- one call, as instructions -------------------------------------------------------------

export interface Instruction {
  kind: PhraseKind;
  side?: 'left' | 'right';
  /** Spoken numbers, as piece ids (digits and words). */
  slots: Partial<Record<'hdg' | 'alt' | 'spd' | 'rwy', string[]>>;
}

const digitPieces = (s: string) => [...s].filter((ch) => ch >= '0' && ch <= '9').map((d) => `d${d}`);

/** "four thousand feet", "three thousand five hundred feet", "flight level one two zero" as pieces. */
export function altitudePieces(ft: number): string[] {
  const r = Math.round(ft / 100) * 100;
  if (r > TRANSITION_FT) return ['s_flight_level', ...digitPieces(String(Math.round(r / 100)).padStart(3, '0'))];
  const th = Math.floor(r / 1000);
  const hu = Math.round((r % 1000) / 100);
  return [...(th ? [...digitPieces(String(th)), 'w_thousand'] : []), ...(hu ? [`d${hu}`, 'w_hundred'] : []), 'w_feet'];
}

const SIDE_WORD: Record<string, string> = { L: 'w_left', R: 'w_right', C: 'w_centre' };
export function runwayPieces(id: string): string[] {
  const m = /^(\d{1,2})([LRC]?)$/.exec(id.toUpperCase());
  if (!m) return [];
  return [...digitPieces(m[1].padStart(2, '0')), ...(m[2] ? [SIDE_WORD[m[2]]] : [])];
}

/** The instructions for a call's changes, in the order heading, altitude, speed, landing. */
export function instructionsFor(c: CallChanges, now: PlaneNow): Instruction[] {
  const out: Instruction[] = [];
  if (c.heading !== undefined) {
    const hdg = digitPieces(String(Math.round(c.heading) % 360 || 360).padStart(3, '0'));
    const turn = angleDiff(now.heading, c.heading);
    out.push(Math.abs(turn) < 3 ? { kind: 'fly', slots: { hdg } } : { kind: 'turn', side: turn > 0 ? 'right' : 'left', slots: { hdg } });
  }
  if (c.altitude !== undefined) {
    const fl = Math.round(c.altitude / 100) * 100 > TRANSITION_FT;
    const verb = c.altitude < now.altitude - 50 ? 'descend' : c.altitude > now.altitude + 50 ? 'climb' : 'maintainAlt';
    const kind: PhraseKind = verb === 'maintainAlt' ? verb : fl ? `${verb}FL` : verb;
    out.push({ kind, slots: { alt: altitudePieces(c.altitude) } });
  }
  if (c.speed !== undefined) {
    const kind: PhraseKind = c.speed < now.speed - 2 ? 'reduce' : c.speed > now.speed + 2 ? 'increase' : 'maintainSpd';
    out.push({ kind, slots: { spd: [...digitPieces(String(Math.round(c.speed))), 'w_knots'] } });
  }
  if (c.land !== undefined) out.push({ kind: 'land', slots: { rwy: runwayPieces(c.land) } });
  return out;
}

/** "WZZ9003" → airline piece and digits; an airline without a clip is spelled out. */
export function callsignPieces(callsign: string, has: (piece: string) => boolean): string[] {
  const cs = callsign.toUpperCase();
  const airline = `a_${cs.slice(0, 3)}`;
  const spell = (s: string) => [...s].map((ch) => (ch >= '0' && ch <= '9' ? `d${ch}` : `l${ch}`)).filter((p) => /^(d\d|l[A-Z])$/.test(p));
  return has(airline) ? [airline, ...spell(cs.slice(3))] : spell(cs);
}

// ---- pieces → clips ---------------------------------------------------------------------------

export interface Segment {
  piece: string;
  take: string;
  file: number;
  ms: number;
  /** Silence before this piece. */
  gapMs: number;
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

/** Every piece id a phrasing or slot can produce (for the completeness test). */
export const piecesOf = (phrase: readonly string[], side: 'left' | 'right' = 'left') =>
  phrase.filter((p) => !p.startsWith('{') || p === '{side}').map((p) => p.replace('{side}', side));

/**
 * One utterance as clips: the controller's "callsign, instructions" or the
 * pilot's "instructions, callsign". Lists (digits, letters, words) use a
 * leading-on take, the last piece a falling one; phrase stems any take.
 * Pieces without a clip are skipped (the completeness test keeps that from
 * happening).
 */
export function compose(opts: {
  role: 'controller' | 'pilot';
  voice: string;
  clips: VoiceClips;
  callsign: string;
  instructions: Instruction[];
  memory: RadioMemory;
  rng: () => number;
  /** Plane id, so phrasing variety is tracked per plane. */
  planeId: string;
}): Segment[] {
  const { role, voice, clips, memory, rng } = opts;
  const cast = clips[voice];
  if (!cast) return [];
  const has = (p: string) => !!cast.clips[p];
  const parts: { pieces: string[]; gapBefore: number }[] = [];
  const cs = callsignPieces(opts.callsign, has);
  if (role === 'controller') parts.push({ pieces: cs, gapBefore: 0 });
  opts.instructions.forEach((ins, i) => {
    const options = PHRASINGS[role][ins.kind];
    const phrase = options[memory.phrase(`${opts.planeId}:${role}:${ins.kind}`, options.length, rng)];
    const pieces = phrase.flatMap((p) => {
      const slot = /^\{(hdg|alt|spd|rwy)\}$/.exec(p);
      return slot ? (ins.slots[slot[1] as 'hdg'] ?? []) : [p.replace('{side}', ins.side ?? 'left')];
    });
    parts.push({ pieces, gapBefore: i === 0 ? (role === 'controller' ? GAPS.afterCallsign : 0) : GAPS.betweenInstructions });
  });
  if (role === 'pilot') parts.push({ pieces: cs, gapBefore: GAPS.betweenInstructions });

  const flat = parts.flatMap((part) => part.pieces.map((piece, j) => ({ piece, gap: j === 0 ? part.gapBefore : -1 })));
  const out: Segment[] = [];
  flat.forEach(({ piece, gap }, i) => {
    const takes = cast.clips[piece];
    if (!takes) return;
    const last = i === flat.length - 1;
    const wanted = piece.startsWith('s_') || piece.startsWith('a_') ? 't' : last ? 'f' : 'm';
    const pool = takes.filter((t) => t.take.startsWith(wanted));
    const usable = pool.length ? pool : takes;
    const name = memory.take(`${voice}:${piece}:${wanted}`, usable.map((t) => t.take), rng);
    const take = usable.find((t) => t.take === name)!;
    const prev = flat[i - 1]?.piece ?? '';
    const gapMs = gap >= 0 ? gap : prev.startsWith('s_') || prev.startsWith('a_') ? GAPS.afterStem : GAPS.inNumber;
    out.push({ piece, take: take.take, file: take.file, ms: take.ms, gapMs: out.length === 0 ? 0 : gapMs });
  });
  return out;
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
