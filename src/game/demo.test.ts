import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import type { Airport } from '../engine/types';
import { createDemo, DEMO, landingEnds, pickDemoAirport, stepDemo } from './demo';

describe('menu demo', () => {
  it('picks a random airport from the playable layouts', () => {
    const other = { ...LHBP, icao: 'XXXX' } as Airport;
    expect(pickDemoAirport([LHBP, other], () => 0).icao).toBe('LHBP');
    expect(pickDemoAirport([LHBP, other], () => 0.99).icao).toBe('XXXX');
    expect(() => pickDemoAirport([], () => 0)).toThrow();
  });

  it('lands on one direction at a time: both parallels facing the same way', () => {
    const ends = landingEnds(LHBP, () => 0);
    expect(ends).toHaveLength(2);
    expect(Math.abs(ends[0].heading - ends[1].heading)).toBeLessThan(20);
    const other = landingEnds(LHBP, () => 0.99);
    expect(Math.abs(((other[0].heading - ends[0].heading + 540) % 360) - 180)).toBeGreaterThan(160);
  });

  it('starts with planes already in the air', () => {
    expect(createDemo(LHBP, 1).sim.planes.length).toBeGreaterThan(0);
  });

  it('flies every arrival in: cleared to land on a runway in use, via a long final', () => {
    const demo = createDemo(LHBP, 7);
    for (const p of demo.sim.planes) {
      expect(p.clearedRunway && demo.ends.map((e) => e.id)).toContain(p.clearedRunway!.id);
    }
  });

  it('keeps landing planes for as long as the menu is open: no go-arounds, no near-misses, no pile-up', () => {
    for (const seed of [1, 2, 3]) {
      const demo = createDemo(LHBP, seed);
      let closest = Infinity;
      let most = 0;
      for (let t = 0; t < 40 * 60; t++) {
        stepDemo(demo, 1);
        const ps = demo.sim.planes;
        most = Math.max(most, ps.length);
        for (let i = 0; i < ps.length; i++)
          for (let j = i + 1; j < ps.length; j++)
            if (Math.abs(ps[i].altitude - ps[j].altitude) < 500) closest = Math.min(closest, Math.hypot(ps[i].pos.x - ps[j].pos.x, ps[i].pos.y - ps[j].pos.y));
      }
      const s = demo.sim.stats;
      expect(s.landed, `seed ${seed}`).toBeGreaterThanOrEqual(20);
      expect(s.goArounds, `seed ${seed}`).toBe(0);
      expect(s.exited, `seed ${seed}`).toBe(0);
      // Sequenced: planes at about the same height stay well apart (in trail on final they close to ~2 nm as they slow).
      expect(closest, `seed ${seed}`).toBeGreaterThan(1.5);
      // The arrival rate and the slots keep up: the sky doesn't fill up.
      expect(most, `seed ${seed}`).toBeLessThanOrEqual(18);
      expect(demo.sim.remainingTraffic).toBeGreaterThan(0);
    }
  });

  it('warms up for the configured time', () => {
    expect(createDemo(LHBP, 3).sim.time).toBeCloseTo(DEMO.warmUpSec, 6);
  });
});
