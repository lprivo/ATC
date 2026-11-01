import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import { Sim } from '../engine/sim';
import type { SimEvent } from '../engine/types';
import { conflictBanner, hasNewConflict, MAX_TOASTS, pairKey, TOAST_MS, toastFor, updateToasts } from './hud';

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
    expect(toastFor(ev(3, 'goAround', ['WZZ1'], { text: 'WZZ1 going around (too high)' }), 0)).toMatchObject({ chip: 'GA', tone: 'danger', text: 'WZZ1 going around, too high' });
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
