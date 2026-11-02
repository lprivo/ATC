import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import { Sim } from '../engine/sim';
import { topUpTraffic } from './useSim';

describe('endless traffic', () => {
  it('tops up before the scheduled traffic runs out, and only for endless sessions', () => {
    const sim = new Sim(LHBP, []);
    const opts = { meanIntervalSec: 257, durationSec: 7200, endless: true };
    expect(topUpTraffic(sim, { ...opts, endless: false }, 1)).toBe(false);
    expect(topUpTraffic(sim, opts, 1)).toBe(true);
    expect(sim.remainingTraffic).toBeGreaterThan(10);
    // Plenty left: no top-up.
    expect(topUpTraffic(sim, opts, 2)).toBe(false);
    // Near the end of what's scheduled: tops up again, after the last arrival.
    const last = sim.lastScheduledTime!;
    sim.step(last - 300);
    expect(topUpTraffic(sim, opts, 3)).toBe(true);
    expect(sim.lastScheduledTime!).toBeGreaterThan(last + 3600);
  });
});
