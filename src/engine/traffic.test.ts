import { describe, expect, it } from 'vitest';
import { LHBP } from './airports/lhbp';
import FLIGHTS from './data/flights.json';
import { createRng } from './rng';
import { generateRandomTraffic, pickCallsign } from './traffic';

const flights = FLIGHTS as unknown as Record<string, string[]>;

describe('callsigns', () => {
  it("come from the airlines' flight lists (which the radio voice has recorded)", () => {
    const traffic = generateRandomTraffic(LHBP, { seed: 7, durationSec: 3600, meanIntervalSec: 150 });
    for (const t of traffic) expect(flights[t.callsign.slice(0, 3)], t.callsign).toContain(t.callsign.slice(3));
    expect(new Set(traffic.map((t) => t.callsign)).size).toBe(traffic.length);
  });

  it('even over a long session: a number comes back only once its flight is long gone', () => {
    const traffic = generateRandomTraffic(LHBP, { seed: 3, durationSec: 4 * 3600, meanIntervalSec: 45 });
    const last = new Map<string, number>();
    for (const t of traffic) {
      expect(flights[t.callsign.slice(0, 3)], t.callsign).toContain(t.callsign.slice(3));
      const before = last.get(t.callsign);
      if (before !== undefined) expect(t.time - before, t.callsign).toBeGreaterThan(1800);
      last.set(t.callsign, t.time);
    }
  });

  it('never one in use; another airline when one has none left; a random number only when all are in use', () => {
    const rng = createRng(1);
    const wzz = new Set(flights.WZZ.map((n) => `WZZ${n}`));
    expect(pickCallsign(rng, ['WZZ'], new Set(['WZZ9003']))).not.toBe('WZZ9003');
    const other = pickCallsign(rng, ['WZZ', 'RYR'], wzz);
    expect(flights.RYR).toContain(other.slice(3));
    const random = pickCallsign(rng, ['WZZ'], wzz);
    expect(random.startsWith('WZZ') && !wzz.has(random)).toBe(true);
  });

  it("another airline's fresh number first, then the number scheduled longest ago", () => {
    const scheduled = new Map(flights.WZZ.map((n, i) => [`WZZ${n}`, 100 + i]));
    expect(flights.RYR).toContain(pickCallsign(createRng(2), ['WZZ', 'RYR'], new Set(), scheduled).slice(3));
    expect(pickCallsign(createRng(2), ['WZZ'], new Set(), scheduled)).toBe(`WZZ${flights.WZZ[0]}`);
  });
});
