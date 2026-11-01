// HUD logic for the game screen: event toasts, the conflict banner and the
// automatic slow-down on a new conflict. Pure (no React / React Native imports).
import type { Sim } from '../engine/sim';
import type { Conflict, SimEvent } from '../engine/types';

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

/** When the oldest of `toasts` expires (ms timestamp), or null if there are none. */
export const nextToastExpiry = (toasts: readonly Toast[]) => (toasts.length ? Math.min(...toasts.map((t) => t.at)) + TOAST_MS : null);

export interface Banner {
  title: string;
  /** e.g. "WZZ8638 · LOT537 — 2.7 nm, 400 ft" */
  detail: string;
  /** Plane the SELECT button selects. */
  selectId: string;
}

/** The conflict banner for the first current conflict, or null when there is none. */
export function conflictBanner(sim: Sim): Banner | null {
  for (const cf of sim.conflicts) {
    const a = sim.plane(cf.a);
    const b = sim.plane(cf.b);
    if (!a || !b) continue;
    // Rounded down like the radar's pair tag, so it never shows the limit itself.
    const nm = (Math.floor(cf.distNm * 10) / 10).toFixed(1);
    // Always under 1,000 ft in a conflict, so no thousands separator is needed.
    const ft = Math.floor(cf.altFt / 100) * 100;
    return { title: 'SEPARATION LOST', detail: `${a.callsign} · ${b.callsign} — ${nm} nm, ${ft} ft`, selectId: a.id };
  }
  return null;
}

export const pairKey = (cf: Conflict) => (cf.a < cf.b ? `${cf.a}|${cf.b}` : `${cf.b}|${cf.a}`);

/** Whether any current conflict pair wasn't in `known` (design: a new conflict drops the sim to ×1). */
/** A stable key for the current set of conflict pairs (changes only when the set changes). */
export const conflictSetKey = (conflicts: readonly Conflict[]) => conflicts.map(pairKey).sort().join(',');

export const hasNewConflict = (known: ReadonlySet<string>, conflicts: readonly Conflict[]) => conflicts.some((cf) => !known.has(pairKey(cf)));
