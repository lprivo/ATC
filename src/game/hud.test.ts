import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import { Sim } from '../engine/sim';
import type { SimEvent } from '../engine/types';
import { conflictBanner, conflictSetKey, hasNewConflict, MAX_TOASTS, nextToastExpiry, pairKey, sessionClock, stepToastState, toComeCaption, trafficLine, TOAST_MS, toastFor, updateToasts } from './hud';

const ev = (seq: number, kind: SimEvent['kind'], callsigns: string[], extra: Partial<SimEvent> = {}): SimEvent => ({
  seq,
  time: 0,
  kind,
  text: '',
  callsigns,
  ...extra,
});

describe('toasts', () => {
  it('chips: runway for clearances and landings, GA, ! and EXIT', () => {
    expect(toastFor(ev(1, 'cleared', ['RYR41HB'], { runway: '31R' }), 0)).toMatchObject({ chip: '31R', tone: 'good', text: 'RYR41HB cleared to land 31R' });
    expect(toastFor(ev(2, 'landed', ['RYR41HB'], { runway: '31R' }), 0)).toMatchObject({ chip: '31R', tone: 'good' });
    expect(toastFor(ev(3, 'goAround', ['WZZ1'], { reason: 'too high' }), 0)).toMatchObject({ chip: 'GA', tone: 'danger', text: 'WZZ1 going around, too high' });
    expect(toastFor(ev(4, 'conflict', ['A', 'B']), 0)).toMatchObject({ chip: '!', text: 'Separation lost: A · B' });
    expect(toastFor(ev(5, 'exited', ['A']), 0)).toMatchObject({ chip: 'EXIT', tone: 'dim' });
    expect(toastFor(ev(6, 'entered', ['A']), 0)).toBeNull();
  });

  it('keeps the newest two, newest first, and remembers the last event seen', () => {
    const events = [ev(1, 'exited', ['A']), ev(2, 'exited', ['B']), ev(3, 'exited', ['C'])];
    const r = updateToasts([], events, 0, 1000);
    expect(r.toasts.map((t) => t.seq)).toEqual([3, 2]);
    expect(r.toasts).toHaveLength(MAX_TOASTS);
    expect(r.lastSeq).toBe(3);
    // Nothing new: unchanged, and already-seen events don't come back.
    expect(updateToasts(r.toasts, events, r.lastSeq, 1500).toasts.map((t) => t.seq)).toEqual([3, 2]);
  });

  it('toasts disappear after 4 s', () => {
    const r = updateToasts([], [ev(1, 'exited', ['A'])], 0, 1000);
    expect(updateToasts(r.toasts, [], r.lastSeq, 1000 + TOAST_MS - 1).toasts).toHaveLength(1);
    expect(updateToasts(r.toasts, [], r.lastSeq, 1000 + TOAST_MS).toasts).toHaveLength(0);
  });
});

describe('conflict banner and slow-down', () => {
  const pairSim = () => {
    const sim = new Sim(
      { ...LHBP, entries: [{ name: 'A', pos: { x: 0, y: 0 }, heading: 90 }, { name: 'B', pos: { x: 2.75, y: 0 }, heading: 270 }] },
      [
        { time: 0, callsign: 'WZZ8638', aircraftType: 'A21N', kind: 'arrival', entry: 'A', altitude: 6400, speed: 250 },
        { time: 0, callsign: 'LOT537', aircraftType: 'E195', kind: 'arrival', entry: 'B', altitude: 6000, speed: 230 },
      ],
    );
    sim.step(0.01);
    return sim;
  };

  it('describes the first conflict pair and selects its first plane', () => {
    const sim = pairSim();
    const b = conflictBanner(sim)!;
    expect(b.title).toBe('SEPARATION LOST');
    expect(b.detail).toMatch(/^WZZ8638 · LOT537 — 2\.\d nm, 400 ft$/);
    expect(b.selectId).toBe(sim.planes[0].id);
  });

  it('the banner can be limited to pairs a filter accepts (e.g. only the new pair)', () => {
    const sim = pairSim();
    expect(conflictBanner(sim, () => false)).toBeNull();
    expect(conflictBanner(sim, (cf) => cf.a === sim.planes[0].id)?.selectId).toBe(sim.planes[0].id);
  });

  it('the banner follows the unit settings (km floored, metres)', () => {
    const b = conflictBanner(pairSim(), undefined, { dist: 'km', alt: 'm' })!;
    expect(b.detail).toMatch(/^WZZ8638 · LOT537 — 5\.\d km, 1[12]0 m$/);
  });

  it('no banner without a conflict', () => {
    const sim = new Sim(LHBP, []);
    expect(conflictBanner(sim)).toBeNull();
  });

  it('a pair not seen before is a new conflict; a known one is not', () => {
    const sim = pairSim();
    expect(hasNewConflict(new Set(), sim.conflicts)).toBe(true);
    expect(hasNewConflict(new Set(sim.conflicts.map(pairKey)), sim.conflicts)).toBe(false);
    expect(pairKey({ a: '2', b: '1', distNm: 0, altFt: 0 })).toBe(pairKey({ a: '1', b: '2', distNm: 0, altFt: 0 }));
  });
});

describe('toast timing and keys', () => {
  it('the next expiry is when the oldest toast reaches 4 s', () => {
    const r = updateToasts([], [ev(1, 'exited', ['A'])], 0, 1000);
    const later = updateToasts(r.toasts, [ev(2, 'exited', ['B'])], r.lastSeq, 3000);
    expect(nextToastExpiry(later.toasts)).toBe(1000 + TOAST_MS);
    expect(nextToastExpiry([])).toBeNull();
  });

  it('a new sim (restart: seq from 1 again) starts clean; the same sim keeps its toasts', () => {
    const oldSim = {};
    const newSim = {};
    const before = stepToastState({ owner: oldSim, toasts: [], lastSeq: 0 }, oldSim, [ev(6, 'exited', ['OLD']), ev(7, 'exited', ['OLD2'])], 0);
    expect(before.lastSeq).toBe(7);
    // Same sim: nothing new, toasts kept.
    expect(stepToastState(before, oldSim, [ev(7, 'exited', ['OLD2'])], 10).toasts).toHaveLength(2);
    // New sim with seq 1: its event shows and the old toasts are gone.
    const after = stepToastState(before, newSim, [ev(1, 'exited', ['NEW'])], 20);
    expect(after.toasts.map((t) => t.text)).toEqual(['NEW left the sector']);
    expect(after.owner).toBe(newSim);
  });

  it('the conflict set key ignores pair order', () => {
    const a = { a: '1', b: '2', distNm: 1, altFt: 0 };
    const b = { a: '4', b: '3', distNm: 1, altFt: 0 };
    expect(conflictSetKey([a, b])).toBe(conflictSetKey([b, a]));
    expect(conflictSetKey([])).toBe('');
  });
});

describe('session clock', () => {
  it('counts down to the end of a timed session', () => {
    expect(sessionClock(0, 1800)).toEqual({ text: '30:00', caption: 'LEFT', a11y: '30:00 left', lastMinute: false });
    expect(sessionClock(305.2, 1800)).toMatchObject({ text: '24:55', a11y: '24:55 left' });
  });
  it('rounds up, so it only reads 00:00 once the session is over', () => {
    expect(sessionClock(1799.5, 1800).text).toBe('00:01');
    expect(sessionClock(1800, 1800).text).toBe('00:00');
    expect(sessionClock(1900, 1800).text).toBe('00:00');
  });
  it('marks the last minute in words as well as colour', () => {
    expect(sessionClock(1739, 1800)).toMatchObject({ caption: 'LEFT', lastMinute: false });
    expect(sessionClock(1740, 1800)).toMatchObject({ caption: 'LAST MIN', lastMinute: true });
  });
  it('shows the time played in an endless session', () => {
    expect(sessionClock(131, null)).toEqual({ text: '02:11', caption: null, a11y: '02:11 played', lastMinute: false });
  });
});

describe('planes still to come', () => {
  it('captions the count for the top bar', () => {
    expect(toComeCaption(6)).toBe('6 TO COME');
    expect(toComeCaption(0)).toBe('NONE TO COME');
  });
  it('shows planes airborne and still to come in the sheet', () => {
    expect(trafficLine(4, 9)).toBe('4 airborne · 9 to come');
    expect(trafficLine(2, 0)).toBe('2 airborne · none to come');
  });
  it('shows only planes airborne in an endless session', () => {
    expect(trafficLine(3, null)).toBe('3 airborne');
  });
});
