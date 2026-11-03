// Radio phraseology (issue #49): what the controller says for a command and how
// the pilot reads it back, in ICAO / CAP 413 style, plus the desk that merges a
// burst of commands to one plane into a single call. Pure (no React / React
// Native / expo imports): `radioVoice.ts` speaks the calls.
import { AIRLINE_CALLSIGNS } from '../engine/data/airlines';
import { angleDiff } from '../engine/math';

// ---- data ---------------------------------------------------------------------------

/**
 * Above this the game says flight levels ("flight level one two zero"), below
 * it altitudes in feet. One value for every airport for now; real transition
 * altitudes vary by country.
 */
export const TRANSITION_ALTITUDE_FT = 10000;

const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner'];
const NATO: Readonly<Record<string, string>> = {
  A: 'alfa', B: 'bravo', C: 'charlie', D: 'delta', E: 'echo', F: 'foxtrot', G: 'golf', H: 'hotel', I: 'india', J: 'juliett', K: 'kilo', L: 'lima', M: 'mike',
  N: 'november', O: 'oscar', P: 'papa', Q: 'quebec', R: 'romeo', S: 'sierra', T: 'tango', U: 'uniform', V: 'victor', W: 'whiskey', X: 'x-ray', Y: 'yankee', Z: 'zulu',
};
const SIDE: Readonly<Record<string, string>> = { L: 'left', R: 'right', C: 'centre' };

// ---- spoken numbers and names ------------------------------------------------------------

/** Each digit on its own: "080" → "zero eight zero". */
export const digits = (s: string) => [...s].map((ch) => DIGITS[Number(ch)] ?? '').filter(Boolean).join(' ');

/** "WZZ9003" → "Wizz Air niner zero zero three"; "RYR41HB" → "Ryanair four one hotel bravo" (names from `AIRLINE_CALLSIGNS`); an unknown airline is spelled out. */
export function spokenCallsign(callsign: string): string {
  const m = /^([A-Z]{3})(.*)$/.exec(callsign.toUpperCase());
  const airline = m ? AIRLINE_CALLSIGNS[m[1]] : undefined;
  const rest = m && airline ? m[2] : callsign.toUpperCase();
  const words = [...rest].map((ch) => (ch >= '0' && ch <= '9' ? DIGITS[Number(ch)] : (NATO[ch] ?? ''))).filter(Boolean);
  return [airline, ...words].filter(Boolean).join(' ');
}

/** "13L" → "one three left". */
export function spokenRunway(id: string): string {
  const m = /^(\d{1,2})([LRC]?)$/.exec(id.toUpperCase());
  if (!m) return id;
  return [digits(m[1].padStart(2, '0')), SIDE[m[2]]].filter(Boolean).join(' ');
}

/** "four thousand feet", "three thousand five hundred feet", or "flight level one two zero" above the transition altitude. */
export function spokenAltitude(ft: number): string {
  const rounded = Math.round(ft / 100) * 100;
  if (rounded > TRANSITION_ALTITUDE_FT) return `flight level ${digits(String(Math.round(rounded / 100)).padStart(3, '0'))}`;
  const thousands = Math.floor(rounded / 1000);
  const hundreds = Math.round((rounded % 1000) / 100);
  const parts = [thousands ? `${spokenNumber(thousands)} thousand` : '', hundreds ? `${DIGITS[hundreds]} hundred` : ''].filter(Boolean);
  return `${parts.join(' ') || 'zero'} feet`;
}

/** Whole thousands as words ("one" … "niner", then digits: "one zero" for 10, as controllers say "one zero thousand"). */
const spokenNumber = (n: number) => (n < 10 ? DIGITS[n] : digits(String(n)));

// ---- one call ------------------------------------------------------------------------

/** What changed for one plane in one call (only what the player changed). */
export interface CallChanges {
  heading?: number;
  altitude?: number;
  speed?: number;
  /** Cleared to land on this runway end. */
  land?: string;
}

/** The plane as it is when the call goes out (its turn direction, climb or descent, faster or slower). */
export interface PlaneNow {
  callsign: string;
  heading: number;
  altitude: number;
  speed: number;
}

export interface Transmission {
  planeId: string;
  callsign: string;
  /** What the controller says. */
  controller: string;
  /** The pilot's readback. */
  readback: string;
}

/** One instruction: as the controller says it, and as the pilot reads it back. */
interface Instruction {
  say: string;
  readback: string;
}

function instructions(c: CallChanges, now: PlaneNow): Instruction[] {
  const out: Instruction[] = [];
  if (c.heading !== undefined) {
    const hdg = digits(String(Math.round(c.heading) % 360 || 360).padStart(3, '0'));
    const turn = angleDiff(now.heading, c.heading);
    if (Math.abs(turn) < 3) out.push({ say: `fly heading ${hdg}`, readback: `heading ${hdg}` });
    else {
      const side = turn > 0 ? 'right' : 'left';
      out.push({ say: `turn ${side} heading ${hdg}`, readback: `${side} heading ${hdg}` });
    }
  }
  if (c.altitude !== undefined) {
    const alt = spokenAltitude(c.altitude);
    const fl = alt.startsWith('flight level');
    const verb = c.altitude < now.altitude - 50 ? 'descend' : c.altitude > now.altitude + 50 ? 'climb' : 'maintain';
    out.push(verb === 'maintain' ? { say: `maintain ${alt}`, readback: `maintain ${alt}` } : { say: `${verb} ${fl ? '' : 'to altitude '}${alt}`, readback: `${verb} ${alt}` });
  }
  if (c.speed !== undefined) {
    const spd = `${digits(String(Math.round(c.speed)))} knots`;
    const verb = c.speed < now.speed - 2 ? 'reduce speed' : c.speed > now.speed + 2 ? 'increase speed' : 'maintain';
    out.push({ say: `${verb} ${spd}`, readback: `${verb === 'maintain' ? 'maintain' : verb.split(' ')[0]} ${spd}` });
  }
  if (c.land !== undefined) {
    const rwy = spokenRunway(c.land);
    out.push({ say: `runway ${rwy}, cleared to land`, readback: `cleared to land runway ${rwy}` });
  }
  return out;
}

/** The call for these changes: "Callsign, instruction, instruction." and "Instruction, instruction, callsign." (null if nothing to say). */
export function transmission(planeId: string, c: CallChanges, now: PlaneNow): Transmission | null {
  const ins = instructions(c, now);
  if (ins.length === 0) return null;
  const cs = spokenCallsign(now.callsign);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    planeId,
    callsign: now.callsign,
    controller: `${cs}, ${ins.map((i) => i.say).join(', ')}.`,
    readback: `${cap(ins.map((i) => i.readback).join(', '))}, ${cs}.`,
  };
}

// ---- the desk: merging bursts of commands ---------------------------------------------------

/** A call goes out once the player has left a plane alone this long (stepper taps and holds merge into one call). */
export const RADIO_QUIET_MS = 900;

export type RadioCommand = { kind: 'heading' | 'altitude' | 'speed'; value: number } | { kind: 'land'; runway: string };

interface Pending {
  changes: CallChanges;
  lastAt: number;
}

/**
 * Collects commands per plane and hands out one call per plane once the
 * player has stopped changing it. A value stepped away and back again (or
 * already said) isn't said twice.
 */
export class RadioDesk {
  private pending = new Map<string, Pending>();
  private said = new Map<string, CallChanges>();

  note(planeId: string, cmd: RadioCommand, now: number) {
    const p = this.pending.get(planeId) ?? { changes: {}, lastAt: now };
    if (cmd.kind === 'land') p.changes.land = cmd.runway;
    else {
      p.changes[cmd.kind] = cmd.value;
      // An altitude or heading command takes the plane off its approach: a new clearance has to be said again.
      if (cmd.kind !== 'speed') {
        delete p.changes.land;
        const s = this.said.get(planeId);
        if (s) delete s.land;
      }
    }
    p.lastAt = now;
    this.pending.set(planeId, p);
  }

  /** Calls whose plane has been quiet for `RADIO_QUIET_MS`, oldest first. `plane` looks the plane up as it is now (undefined: gone, the call is dropped). */
  due(now: number, plane: (id: string) => PlaneNow | undefined): Transmission[] {
    const ready = [...this.pending.entries()].filter(([, p]) => now - p.lastAt >= RADIO_QUIET_MS).sort((a, b) => a[1].lastAt - b[1].lastAt);
    const out: Transmission[] = [];
    for (const [id, p] of ready) {
      this.pending.delete(id);
      const said = this.said.get(id) ?? {};
      const fresh: CallChanges = {};
      for (const k of ['heading', 'altitude', 'speed', 'land'] as const) {
        if (p.changes[k] !== undefined && p.changes[k] !== said[k]) (fresh as Record<string, unknown>)[k] = p.changes[k];
      }
      const now = plane(id);
      const t = now ? transmission(id, fresh, now) : null;
      if (!t) continue;
      this.said.set(id, { ...said, ...fresh });
      out.push(t);
    }
    return out;
  }

  /** Forget everything (a new session). */
  clear() {
    this.pending.clear();
    this.said.clear();
  }
}

// ---- voices --------------------------------------------------------------------------

export interface VoiceInfo {
  identifier: string;
  language: string;
  quality: string;
}

/**
 * Two different English voices, so controller and pilot are easy to tell
 * apart: a British one for the controller, preferably another accent for the
 * pilot, the better ("Enhanced") voice of each where there is one. Either may
 * be undefined (the device's default English voice is used).
 */
export function pickVoices(voices: readonly VoiceInfo[]): { controller?: string; pilot?: string } {
  const en = voices.filter((v) => v.language.toLowerCase().startsWith('en'));
  const rank = (v: VoiceInfo) => (v.quality === 'Enhanced' ? 0 : 1);
  const by = (pred: (v: VoiceInfo) => boolean) => en.filter(pred).sort((a, b) => rank(a) - rank(b));
  const lang = (v: VoiceInfo) => v.language.toLowerCase().replace('_', '-');
  const controller = (by((v) => lang(v) === 'en-gb')[0] ?? by(() => true)[0])?.identifier;
  const pilot = (
    by((v) => v.identifier !== controller && ['en-us', 'en-au', 'en-ie', 'en-za', 'en-in'].includes(lang(v)))[0] ?? by((v) => v.identifier !== controller)[0]
  )?.identifier;
  return { controller, pilot };
}
