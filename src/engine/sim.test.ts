import { describe, expect, it } from 'vitest';
import { LHBP } from './airports/lhbp';
import { add, dirOf, dist } from './math';
import { Sim } from './sim';
import { generateRandomTraffic } from './traffic';
import type { Airport, EntryPoint, TrafficEntry } from './types';

const rwy31R = LHBP.runways[0].ends[1];

function airportWith(entries: EntryPoint[]): Airport {
  return { ...LHBP, entries };
}

function flight(entry: string, over: Partial<TrafficEntry> = {}): TrafficEntry {
  return { time: 0, callsign: `T${entry}`, aircraftType: 'A320', kind: 'arrival', entry, altitude: 5000, speed: 250, ...over };
}

/** A sim with planes spawned at t=0 from the given entries. */
function simWith(entries: EntryPoint[], traffic: TrafficEntry[]) {
  const sim = new Sim(airportWith(entries), traffic);
  sim.step(0.01);
  return sim;
}

describe('flight model', () => {
  it('turns at standard rate toward the target heading', () => {
    const sim = simWith([{ name: 'A', pos: { x: 0, y: -20 }, heading: 0 }], [flight('A')]);
    const p = sim.planes[0];
    sim.setHeading(p.id, 90);
    sim.step(10);
    expect(p.heading).toBeCloseTo(30, 0);
    sim.step(30);
    expect(p.heading).toBe(90);
  });

  it('takes the shortest way round', () => {
    const sim = simWith([{ name: 'A', pos: { x: 0, y: -20 }, heading: 10 }], [flight('A')]);
    const p = sim.planes[0];
    sim.setHeading(p.id, 340);
    sim.step(5);
    expect(p.heading).toBeCloseTo(355, 0);
  });

  it('climbs at ~2000 fpm and clamps to limits', () => {
    const sim = simWith([{ name: 'A', pos: { x: 0, y: -20 }, heading: 0 }], [flight('A')]);
    const p = sim.planes[0];
    sim.setAltitude(p.id, 9000);
    sim.step(60);
    expect(p.altitude).toBeCloseTo(7000, -1);
    sim.setAltitude(p.id, 99999);
    expect(p.target.altitude).toBe(20000);
  });

  it('moves at its ground speed', () => {
    const sim = simWith([{ name: 'A', pos: { x: 0, y: -20 }, heading: 0 }], [flight('A', { speed: 240 })]);
    const p = sim.planes[0];
    const start = { ...p.pos };
    sim.step(60); // 240 kt = 4 nm/min
    expect(dist(start, p.pos)).toBeCloseTo(4, 1);
  });
});

describe('traffic', () => {
  it('spawns flights when their time comes', () => {
    const sim = new Sim(LHBP, [flight('N', { time: 30 })]);
    sim.step(29);
    expect(sim.planes).toHaveLength(0);
    sim.step(2);
    expect(sim.planes).toHaveLength(1);
    expect(sim.remainingTraffic).toBe(0);
  });

  it('random traffic is reproducible per seed', () => {
    const opts = { seed: 42, durationSec: 1800, meanIntervalSec: 90 };
    expect(generateRandomTraffic(LHBP, opts)).toEqual(generateRandomTraffic(LHBP, opts));
    expect(generateRandomTraffic(LHBP, opts)).not.toEqual(generateRandomTraffic(LHBP, { ...opts, seed: 7 }));
  });
});

describe('routes and landing', () => {
  // 8 nm out on the extended centreline of 31R, already pointing at it.
  const finalEntry: EntryPoint = { name: 'F', pos: add(rwy31R.threshold, dirOf(rwy31R.heading), -8), heading: rwy31R.heading };

  it('a path ending at a threshold clears the plane to land, and it lands', () => {
    const sim = simWith([finalEntry], [flight('F', { altitude: 2500 })]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [add(rwy31R.threshold, dirOf(rwy31R.heading), -4), add(rwy31R.threshold, { x: 0.3, y: 0.3 })]);
    expect(p.clearedRunway?.id).toBe('31R');
    sim.step(400);
    expect(sim.planes).toHaveLength(0);
    expect(sim.stats.landed).toBe(1);
    expect(sim.stats.goArounds).toBe(0);
  });

  it('picks the parallel runway whose centreline the path is on, not just the nearest threshold', () => {
    const rwy31L = LHBP.runways[1].ends[1];
    const sim = simWith([finalEntry], [flight('F')]);
    const p = sim.planes[0];
    // End 0.8 nm short of 31R on its centreline — that point is roughly equidistant from both thresholds.
    sim.setRoute(p.id, [add(rwy31R.threshold, dirOf(rwy31R.heading), -4), add(rwy31R.threshold, dirOf(rwy31R.heading), -0.8)]);
    expect(p.clearedRunway?.id).toBe('31R');
    // Same idea on 31L's centreline.
    sim.setRoute(p.id, [add(rwy31L.threshold, dirOf(rwy31L.heading), -4), add(rwy31L.threshold, dirOf(rwy31L.heading), -0.8)]);
    expect(p.clearedRunway?.id).toBe('31L');
  });

  it('does not clear a path that ends at a threshold from the wrong direction', () => {
    const sim = simWith([{ name: 'A', pos: { x: -10, y: 10 }, heading: 130 }], [flight('A')]);
    const p = sim.planes[0];
    // Approach the 31R threshold flying ~130 (i.e. landing direction of 13L, from the far side).
    const beyond = add(rwy31R.threshold, dirOf(rwy31R.heading), -3);
    sim.setRoute(p.id, [add(beyond, dirOf(130), -6), add(beyond, dirOf(130), -2), add(rwy31R.threshold, dirOf(310), -0.2)]);
    expect(p.clearedRunway?.id).not.toBe('31R');
  });

  it('goes around when far too high', () => {
    const sim = simWith([finalEntry], [flight('F', { altitude: 9000 })]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.step(400);
    expect(sim.stats.landed).toBe(0);
    expect(sim.stats.goArounds).toBe(1);
    expect(p.clearedRunway).toBeNull();
    expect(p.target.altitude).toBe(3000);
  });

  it('never circles the threshold forever: a last-second jog to the parallel runway resolves', () => {
    const rwy31L = LHBP.runways[1].ends[1];
    const sim = simWith([finalEntry], [flight('F', { altitude: 2500 })]);
    const p = sim.planes[0];
    // Fly down the 31R centreline, then end the path on the 31L threshold ~1 nm to the side.
    sim.setRoute(p.id, [add(rwy31R.threshold, dirOf(rwy31R.heading), -3), add(rwy31R.threshold, dirOf(rwy31R.heading), -0.8), rwy31L.threshold]);
    expect(p.clearedRunway?.id).toBe('31L');
    sim.step(600);
    // Either it squeaks in or it goes around — but it must not still be orbiting.
    expect(sim.stats.landed + sim.stats.goArounds).toBe(1);
  });

  it('follows a dense drawn path without getting stuck', () => {
    const sim = simWith([{ name: 'A', pos: { x: -20, y: 0 }, heading: 90 }], [flight('A', { speed: 250 })]);
    const p = sim.planes[0];
    // A tight zig-zag, sampled every 0.5 nm, ending at (0, 10).
    const path = [];
    for (let i = 1; i <= 40; i++) path.push({ x: -20 + i * 0.5, y: i % 8 < 4 ? 1 : -1 });
    path.push({ x: 0, y: 10 });
    sim.setRoute(p.id, path);
    sim.step(600);
    expect(p.route).toHaveLength(0);
    expect(dist(p.pos, { x: 0, y: 10 })).toBeGreaterThan(1); // flew past the end and carried on
  });

  it('a path ending away from runways is just a route', () => {
    const sim = simWith([finalEntry], [flight('F')]);
    const p = sim.planes[0];
    const wp = { x: 10, y: 10 };
    sim.setRoute(p.id, [wp]);
    expect(p.clearedRunway).toBeNull();
    sim.step(30);
    expect(p.heading).not.toBeCloseTo(finalEntry.heading, 0); // turning toward the waypoint
  });

  it('a heading command cancels the route and clearance', () => {
    const sim = simWith([finalEntry], [flight('F')]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.setHeading(p.id, 90);
    expect(p.route).toHaveLength(0);
    expect(p.clearedRunway).toBeNull();
  });
});

describe('separation and sector', () => {
  it('counts a violation once per encounter', () => {
    const sim = simWith(
      [
        { name: 'A', pos: { x: -5, y: 0 }, heading: 90 },
        { name: 'B', pos: { x: 5, y: 0 }, heading: 270 },
      ],
      [flight('A'), flight('B')],
    );
    sim.step(60); // closing at 500 kt: ~1.7 nm apart now
    expect(sim.planes.every((p) => p.conflict)).toBe(true);
    sim.step(5);
    expect(sim.stats.separationViolations).toBe(1);
  });

  it('vertical separation is enough', () => {
    const sim = simWith(
      [
        { name: 'A', pos: { x: -5, y: 0 }, heading: 90 },
        { name: 'B', pos: { x: 5, y: 0 }, heading: 270 },
      ],
      [flight('A', { altitude: 5000 }), flight('B', { altitude: 6000 })],
    );
    sim.step(60);
    expect(sim.stats.separationViolations).toBe(0);
  });

  it('planes leaving the square are counted as exits', () => {
    const sim = simWith([{ name: 'A', pos: { x: 0, y: 29 }, heading: 0 }], [flight('A')]);
    sim.step(60);
    expect(sim.planes).toHaveLength(0);
    expect(sim.stats.exited).toBe(1);
  });
});
