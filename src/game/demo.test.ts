import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import { add, dirOf } from '../engine/math';
import type { Airport, Vec2 } from '../engine/types';
import { circuit, createDemo, DEMO, landingEnds, pickDemoAirport, runwayForSide, stepDemo, type Demo } from './demo';

/** The two planes' closest approach on screen (the worst over 100 seeds measured 12.5 nm). */
const CLOSEST_NM = 8;
/** Stand-ins for the random generator: always the first, or always the last, of a list. */
const FIRST = { pick: <T,>(xs: readonly T[]) => xs[0] };
const LAST = { pick: <T,>(xs: readonly T[]) => xs[xs.length - 1] };

/**
 * Runs a demo and records each arrival as the autopilot routes it: where it
 * was, the route and runway it was given, and its assigned altitude; and when
 * each plane first appeared.
 */
function watch(seed: number, sec: number) {
  const demo = createDemo(LHBP, seed);
  const seen = new Map<string, Vec2>(); // unrouted planes, where they appeared
  const routed: { pos: Vec2; route: Vec2[]; runway: string; altitude: number }[] = [];
  const appeared: number[] = [];
  for (const p of demo.sim.planes) if (!p.clearedRunway) seen.set(p.id, { ...p.pos });
  const known = new Set(demo.sim.planes.map((p) => p.id));
  for (let t = 0; t < sec; t++) {
    const before = new Map([...seen]);
    stepDemo(demo, 1);
    for (const p of demo.sim.planes) {
      if (!known.has(p.id)) {
        known.add(p.id);
        appeared.push(demo.sim.time);
        if (!p.clearedRunway) seen.set(p.id, { ...p.pos });
      } else if (before.has(p.id) && p.clearedRunway) {
        // Routed in this step, from where it was before it.
        routed.push({ pos: before.get(p.id)!, route: [...p.route], runway: p.clearedRunway.id, altitude: p.target.altitude });
        seen.delete(p.id);
      }
    }
  }
  return { demo, routed, appeared };
}

/** Steps the demo a second at a time until `done` (or gives up after a few sim-hours). */
function runUntil(demo: Demo, done: () => boolean) {
  for (let t = 0; t < 4 * 3600; t++) {
    if (done()) return true;
    stepDemo(demo, 1);
  }
  return false;
}

/** Every plane in the air is cleared and on final, with nothing waiting to spawn: the release rule's other conditions hold. */
const allOnFinal = (demo: Demo) => demo.sim.remainingTraffic === 0 && demo.sim.planes.every((p) => p.clearedRunway && p.route.length <= 1);

describe('menu demo', () => {
  it('picks a random airport from the playable layouts', () => {
    const other = { ...LHBP, icao: 'XXXX' } as Airport;
    expect(pickDemoAirport([LHBP, other], FIRST).icao).toBe('LHBP');
    expect(pickDemoAirport([LHBP, other], LAST).icao).toBe('XXXX');
    expect(() => pickDemoAirport([], FIRST)).toThrow();
  });

  it('lands on one direction at a time: both parallels facing the same way', () => {
    const ends = landingEnds(LHBP, FIRST);
    expect(ends).toHaveLength(2);
    expect(Math.abs(ends[0].heading - ends[1].heading)).toBeLessThan(20);
    const other = landingEnds(LHBP, LAST);
    expect(Math.abs(((other[0].heading - ends[0].heading + 540) % 360) - 180)).toBeGreaterThan(160);
  });

  it('lands each plane on the runway on its own side of the approach', () => {
    const ends = landingEnds(LHBP, FIRST); // 13L/13R, landing towards 130°
    // North-east of the approach (right of 130° is south-west, so this is the left side): the left runway, 13L.
    expect(runwayForSide(ends, { x: 10, y: 10 })).toMatchObject({ side: -1, end: { id: '13L' } });
    expect(runwayForSide(ends, { x: -10, y: -10 })).toMatchObject({ side: 1, end: { id: '13R' } });
  });

  it('flies a circuit that stays on its own side until it turns onto final', () => {
    const ends = landingEnds(LHBP, FIRST); // landing towards 130°: the approach is to the north-west
    for (const pos of [{ x: -25, y: 15 }, { x: 25, y: -5 }, { x: 0, y: 28 }, { x: 5, y: -28 }]) {
      const { end, side } = runwayForSide(ends, pos);
      const route = circuit(pos, end, side);
      const u = dirOf(end.heading);
      const across = (q: Vec2) => ((q.x - end.threshold.x) * u.y - (q.y - end.threshold.y) * u.x) * side;
      // Everything before the joining point is out to the plane's side; then the joining point and threshold on the centreline.
      for (const q of route.slice(0, -2)) expect(across(q)).toBeCloseTo(DEMO.circuitNm, 6);
      expect(route[route.length - 1]).toEqual(end.threshold);
      expect(across(route[route.length - 2])).toBeCloseTo(0, 6);
    }
  });

  it('flies downwind first only when it comes from closer in than half the final (or from beyond the airport)', () => {
    const [end] = landingEnds(LHBP, FIRST);
    const u = dirOf(end.heading);
    const right = { x: u.y, y: -u.x };
    /** A point `alongNm` along the landing direction from the threshold (negative: on the approach), 8 nm to the right. */
    const at = (alongNm: number) => add(add(end.threshold, u, alongNm), right, 8);
    expect(circuit(at(-25), end, 1)).toHaveLength(3); // far out on the approach: base, final
    expect(circuit(at(-9), end, 1)).toHaveLength(3); // still more than half the final out
    expect(circuit(at(-3), end, 1)).toHaveLength(4); // closer in: downwind past the threshold first
    expect(circuit(at(15), end, 1)).toHaveLength(4); // beyond the airport
  });
  it('starts with planes already in the air', () => {
    expect(createDemo(LHBP, 1).sim.planes.length).toBeGreaterThan(0);
  });

  it("flies every arrival in: the runway on its side, its circuit, and the altitude of that runway's stream", () => {
    let bothUsed = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { demo, routed } = watch(seed, 30 * 60);
      expect(routed.length, `seed ${seed}`).toBeGreaterThan(0);
      const altitudeOf = new Map<string, number>();
      for (const r of routed) {
        const { end, side } = runwayForSide(demo.ends, r.pos);
        expect(r.runway).toBe(end.id);
        expect(r.route).toEqual(circuit(r.pos, end, side));
        expect(r.altitude).toBe(DEMO.altitudeFt[demo.ends.indexOf(end) % DEMO.altitudeFt.length]);
        altitudeOf.set(r.runway, r.altitude);
      }
      // When both runways of the pair are in use, each stream flies at its own altitude.
      if (altitudeOf.size === 2) {
        bothUsed++;
        expect(new Set(altitudeOf.values()).size, `seed ${seed}`).toBe(2);
      }
    }
    expect(bothUsed).toBeGreaterThan(0);
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
      expect(most, `seed ${seed}`).toBeLessThanOrEqual(2);
    }
  });

  // In a normal run the on-final rule already keeps these from deciding, so each is tested from the state where it's the only rule left.
  it('lets no third plane in, even with both on final and the gap passed', () => {
    const demo = createDemo(LHBP, 1);
    expect(runUntil(demo, () => demo.sim.planes.length === 2 && demo.sim.remainingTraffic === 0)).toBe(true);
    // Put both straight onto final (in a real run the second is still in its circuit when the first lands).
    for (const p of demo.sim.planes) demo.sim.setRoute(p.id, [p.clearedRunway!.threshold], p.clearedRunway!.id);
    expect(allOnFinal(demo)).toBe(true);
    demo.nextSpawn = 0;
    stepDemo(demo, 0.1);
    expect(demo.sim.planes.length).toBeLessThanOrEqual(2);
  });

  it('waits for the gap after the last arrival, even with the plane in the air on final', () => {
    const demo = createDemo(LHBP, 1);
    expect(runUntil(demo, () => demo.sim.planes.length === 1 && allOnFinal(demo))).toBe(true);
    demo.nextSpawn = demo.sim.time + 30;
    stepDemo(demo, 0.1);
    expect(demo.sim.planes.length).toBeLessThanOrEqual(1);
  });

  // The end-to-end view of the gap; the test above is the one that pins the gap rule itself.
  it('lets arrivals in at least a minute apart', () => {
    for (const seed of [1, 2, 3]) {
      const { appeared } = watch(seed, 60 * 60);
      expect(appeared.length, `seed ${seed}`).toBeGreaterThan(3);
      for (let i = 1; i < appeared.length; i++) expect(appeared[i] - appeared[i - 1], `seed ${seed}`).toBeGreaterThanOrEqual(DEMO.spawnGapSec - 1);
    }
  });

  it('never runs out of planes: the arrivals pool refills when it runs dry', () => {
    const demo = createDemo(LHBP, 9);
    demo.pool = []; // as if the menu had been open long enough to use them all up
    const seed = demo.seed;
    const landed = demo.sim.stats.landed;
    for (let t = 0; t < 60 * 60; t++) stepDemo(demo, 1);
    expect(demo.seed).toBeGreaterThan(seed);
    expect(demo.sim.stats.landed - landed).toBeGreaterThan(5);
  });

  it('warms up for the configured time', () => {
    expect(createDemo(LHBP, 3).sim.time).toBeCloseTo(DEMO.warmUpSec, 6);
  });
});
