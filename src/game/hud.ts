// HUD logic for the game screen: event toasts, the conflict banner and the
// automatic slow-down on a new conflict. Pure (no React / React Native imports).
import type { Sim } from '../engine/sim';
import type { Conflict, SimEvent } from '../engine/types';
import { clock } from './session';
import { conflictAltitude, formatDistance, type AltUnit, type DistUnit } from './settings';

/** Design: at most 2 toasts at once, auto-dismissed after 4 s. */
export const MAX_TOASTS = 2;
export const TOAST_MS = 4000;

export type ToastTone = 'good' | 'danger' | 'dim';
export interface Toast {
  seq: number;
  /** Short tag at the start of the toast: runway, GA, ! or EXIT. */
  chip: string;
  tone: ToastTone;
  text: string;
  /** Wall-clock time it appeared (ms). */
  at: number;
}

/** The toast for a sim event, or null for events that aren't toasted (arrivals, info). */
export function toastFor(e: SimEvent, at: number): Toast | null {
  const who = e.callsigns.join(' · ');
  switch (e.kind) {
    case 'cleared':
      return { seq: e.seq, chip: e.runway ?? 'CLR', tone: 'good', text: `${who} cleared to land ${e.runway ?? ''}`.trim(), at };
    case 'cancelled':
      return { seq: e.seq, chip: e.runway ?? 'CLR', tone: 'dim', text: `${who} clearance cancelled`, at };
    case 'landed':
      return { seq: e.seq, chip: e.runway ?? 'LND', tone: 'good', text: `${who} landed`, at };
    case 'goAround':
      return { seq: e.seq, chip: 'GA', tone: 'danger', text: e.reason ? `${who} going around, ${e.reason}` : `${who} going around`, at };
    case 'conflict':
      return { seq: e.seq, chip: '!', tone: 'danger', text: `Separation lost: ${who}`, at };
    case 'exited':
      return { seq: e.seq, chip: 'EXIT', tone: 'dim', text: `${who} left the sector`, at };
    default:
      return null;
  }
}

/**
 * Adds toasts for events newer than `lastSeq`, drops expired ones, and keeps the
 * newest MAX_TOASTS (newest first). Returns the toasts and the new `lastSeq`.
 */
export function updateToasts(current: readonly Toast[], events: readonly SimEvent[], lastSeq: number, now: number) {
  const fresh = events.filter((e) => e.seq > lastSeq);
  const added = fresh.map((e) => toastFor(e, now)).filter((t): t is Toast => t != null);
  const toasts = [...added.reverse(), ...current].filter((t) => now - t.at < TOAST_MS).slice(0, MAX_TOASTS);
  const seq = fresh.length ? fresh[fresh.length - 1].seq : lastSeq;
  return { toasts, lastSeq: seq };
}

export interface ToastState {
  /** The sim these toasts belong to; a new sim (restart) starts clean. */
  owner: unknown;
  toasts: Toast[];
  lastSeq: number;
}

/** One render's toast update, starting over when the sim (`owner`) changes. */
export function stepToastState(state: ToastState, owner: unknown, events: readonly SimEvent[], now: number): ToastState {
  const base = state.owner === owner ? state : { owner, toasts: [], lastSeq: 0 };
  return { owner, ...updateToasts(base.toasts, events, base.lastSeq, now) };
}

/** When the oldest of `toasts` expires (ms timestamp), or null if there are none. */
export const nextToastExpiry = (toasts: readonly Toast[]) => (toasts.length ? Math.min(...toasts.map((t) => t.at)) + TOAST_MS : null);

export interface Banner {
  title: string;
  /** e.g. "WZZ8638 · LOT537 — 2.7 nm, 400 ft" */
  detail: string;
  /** Plane the SELECT button selects. */
  selectId: string;
  /** Identifies the pair, e.g. to announce each new conflict once. */
  pairKey: string;
}

/** The conflict banner for the first current conflict (or the first one `only` accepts), or null when there is none. */
export function conflictBanner(
  sim: Sim,
  only: (cf: Conflict) => boolean = () => true,
  units: { dist: DistUnit; alt: AltUnit } = { dist: 'nm', alt: 'ft' },
): Banner | null {
  for (const cf of sim.conflicts) {
    if (!only(cf)) continue;
    const a = sim.plane(cf.a);
    const b = sim.plane(cf.b);
    if (!a || !b) continue;
    // Rounded down like the radar's pair tag, so it never shows the limit itself.
    const dist = formatDistance(cf.distNm, units.dist);
    const alt = conflictAltitude(cf.altFt, units.alt);
    return { title: 'SEPARATION LOST', detail: `${a.callsign} · ${b.callsign} — ${dist}, ${alt}`, selectId: a.id, pairKey: pairKey(cf) };
  }
  return null;
}

export const pairKey = (cf: Conflict) => (cf.a < cf.b ? `${cf.a}|${cf.b}` : `${cf.b}|${cf.a}`);

/** A stable key for the current set of conflict pairs (changes only when the set changes). */
export const conflictSetKey = (conflicts: readonly Conflict[]) => conflicts.map(pairKey).sort().join(',');

/** Whether any current conflict pair wasn't in `known` (design: a new conflict drops the sim to ×1). */
export const hasNewConflict = (known: ReadonlySet<string>, conflicts: readonly Conflict[]) => conflicts.some((cf) => !known.has(pairKey(cf)));

/**
 * The top bar's clock. In a timed session it counts down to the end ("24:55",
 * captioned LEFT, then LAST MIN in the final minute, so the warning isn't
 * colour alone); it reads 00:00 only when the session is over. An endless
 * session shows the time played, uncaptioned.
 */
export function sessionClock(simTime: number, sessionSec: number | null): { text: string; caption: string | null; a11y: string; lastMinute: boolean } {
  if (sessionSec == null) return { text: clock(simTime), caption: null, a11y: `${clock(simTime)} played`, lastMinute: false };
  const left = Math.max(0, Math.ceil(sessionSec - simTime));
  const lastMinute = left <= 60;
  return { text: clock(left), caption: lastMinute ? 'LAST MIN' : 'LEFT', a11y: `${clock(left)} left`, lastMinute };
}

/** Arrivals still to come, for the top bar: "6 TO COME", "NONE TO COME". */
export const toComeCaption = (toCome: number) => (toCome === 0 ? 'NONE TO COME' : `${toCome} TO COME`);

/**
 * The sheet's traffic line: planes in the sector now and, in a timed session,
 * the arrivals still to come ("4 airborne · 9 to come"). `toCome` is null in
 * an endless session, which has no end to its traffic: then only the planes
 * airborne are shown.
 */
export function trafficLine(airborne: number, toCome: number | null): string {
  if (toCome == null) return `${airborne} airborne`;
  return `${airborne} airborne · ${toCome === 0 ? 'none to come' : `${toCome} to come`}`;
}
