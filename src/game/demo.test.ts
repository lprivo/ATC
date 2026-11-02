import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import type { Airport } from '../engine/types';
import { circuit, createDemo, DEMO, landingEnds, pickDemoAirport, runwayForSide, stepDemo } from './demo';

/** The two planes' closest approach on screen (the worst over 100 seeds measured 12.5 nm). */
const CLOSEST_NM = 8;

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

  it('lands each plane on the runway on its own side of the approach', () => {
    const ends = landingEnds(LHBP, () => 0); // 13L/13R, landing towards 130°
    // North-east of the approach (right of 130° is south-west, so this is the left side): the left runway, 13L.
    expect(runwayForSide(ends, { x: 10, y: 10 })).toMatchObject({ side: -1, end: { id: '13L' } });
    expect(runwayForSide(ends, { x: -10, y: -10 })).toMatchObject({ side: 1, end: { id: '13R' } });
  });

  it('flies a circuit that stays on its own side until it turns onto final', () => {
    const ends = landingEnds(LHBP, () => 0);
    for (const pos of [{ x: -25, y: 15 }, { x: 25, y: -5 }, { x: 0, y: 28 }, { x: 5, y: -28 }]) {
      const { end, side } = runwayForSide(ends, pos);
      const route = circuit(pos, end, side);
      const u = { x: Math.sin((end.heading * Math.PI) / 180), y: Math.cos((end.heading * Math.PI) / 180) };
      const across = (q: { x: number; y: number }) => ((q.x - end.threshold.x) * u.y - (q.y - end.threshold.y) * u.x) * side;
      // Everything before the joining point is out to the plane's side; then the joining point and threshold on the centreline.
      for (const q of route.slice(0, -2)) expect(across(q)).toBeCloseTo(DEMO.circuitNm, 6);
      expect(route[route.length - 1]).toEqual(end.threshold);
      expect(across(route[route.length - 2])).toBeCloseTo(0, 6);
      // From beyond the airport it flies downwind past it first (one more leg).
      const beyond = (pos.x - end.threshold.x) * u.x + (pos.y - end.threshold.y) * u.y > -DEMO.finalNm / 2;
      expect(route).toHaveLength(beyond ? 4 : 3);
    }
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
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const demo = createDemo(LHBP, seed);
      let closest = Infinity;
      let most = 0;
      for (let t = 0; t < 40 * 60; t++) {
        stepDemo(demo, 1);
        const ps = demo.sim.planes;
        most = Math.max(most, ps.length);
        for (let i = 0; i < ps.length; i++)
          for (let j = i + 1; j < ps.length; j++)
            closest = Math.min(closest, Math.hypot(ps[i].pos.x - ps[j].pos.x, ps[i].pos.y - ps[j].pos.y));
      }
      const s = demo.sim.stats;
      expect(s.landed, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      expect(s.goArounds, `seed ${seed}`).toBe(0);
      expect(s.exited, `seed ${seed}`).toBe(0);
      // On a flat radar height doesn't help: the two planes never overlap on screen, at any altitude.
      expect(closest, `seed ${seed}`).toBeGreaterThan(CLOSEST_NM);
      // A background, not a busy sector: never more than two planes at once.
      expect(most, `seed ${seed}`).toBeLessThanOrEqual(DEMO.maxPlanes);
    }
  });

  it('never runs out of planes, however long the menu stays open', () => {
    const demo = createDemo(LHBP, 9);
    for (let t = 0; t < 6 * 3600; t++) stepDemo(demo, 1);
    expect(demo.sim.planes.length).toBeGreaterThan(0);
    expect(demo.sim.stats.landed).toBeGreaterThan(20);
  });

  it('warms up for the configured time', () => {
    expect(createDemo(LHBP, 3).sim.time).toBeCloseTo(DEMO.warmUpSec, 6);
  });
});
