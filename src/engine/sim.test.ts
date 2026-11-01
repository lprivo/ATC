import { describe, expect, it } from 'vitest';
import { LHBP } from './airports/lhbp';
import { add, angleDiff, dirOf, dist, headingTo } from './math';
import { remainingPathNm, RULES, Sim, TRAIL_LENGTH } from './sim';
import { generateRandomTraffic } from './traffic';
import type { Airport, EntryPoint, TrafficEntry } from './types';

const rwy13L = LHBP.runways[0].ends[0];
const rwy31R = LHBP.runways[0].ends[1];
const rwy31L = LHBP.runways[1].ends[1];

/** A point `nm` out on the approach to a runway end (before the threshold). */
const onFinal = (end: { threshold: { x: number; y: number }; heading: number }, nm: number) =>
  add(end.threshold, dirOf(end.heading), -nm);

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
    // Two north-facing parallels 1 nm apart, with B's threshold staggered 1.2 nm further south.
    const staggered: Airport = {
      ...LHBP,
      entries: [{ name: 'S', pos: { x: 0, y: -8 }, heading: 0 }],
      runways: [
        { name: '36A/18A', ends: [{ id: '36A', threshold: { x: 0, y: 0 }, heading: 0 }, { id: '18A', threshold: { x: 0, y: 2 }, heading: 180 }] },
        { name: '36B/18B', ends: [{ id: '36B', threshold: { x: 1, y: -1.2 }, heading: 0 }, { id: '18B', threshold: { x: 1, y: 0.8 }, heading: 180 }] },
      ],
    };
    const sim = new Sim(staggered, [flight('S')]);
    sim.step(0.01);
    const p = sim.planes[0];
    // Ends on A's centreline 1.2 nm short of A — but only 1.0 nm from B's threshold.
    const end = { x: 0, y: -1.2 };
    expect(dist(end, { x: 1, y: -1.2 })).toBeLessThan(dist(end, { x: 0, y: 0 }));
    sim.setRoute(p.id, [{ x: 0, y: -4 }, end]);
    expect(p.clearedRunway?.id).toBe('36A');
  });

  it('does not clear a path that ends at a threshold from the wrong direction', () => {
    const sim = simWith([{ name: 'A', pos: { x: -10, y: 10 }, heading: 130 }], [flight('A')]);
    const p = sim.planes[0];
    // Approach the 31R threshold flying 13L's landing direction, i.e. from the far side.
    const beyond = add(rwy31R.threshold, dirOf(rwy31R.heading), -3);
    sim.setRoute(p.id, [add(beyond, dirOf(rwy13L.heading), -6), add(beyond, dirOf(rwy13L.heading), -2), add(rwy31R.threshold, dirOf(rwy31R.heading), -0.2)]);
    expect(p.clearedRunway).toBeNull();
  });

  it('a drawn path that overshoots onto the runway still lands', () => {
    const sim = simWith([finalEntry], [flight('F', { altitude: 2500 })]);
    const p = sim.planes[0];
    // Finger lifted 1.4 nm past the threshold, i.e. on the runway itself.
    const drawn = Array.from({ length: 24 }, (_, i) => onFinal(rwy31R, 7.8 - i * 0.4));
    sim.setRoute(p.id, drawn);
    expect(p.clearedRunway?.id).toBe('31R');
    expect(p.route.at(-1)).toEqual(rwy31R.threshold);
    sim.step(400);
    expect(sim.stats.landed).toBe(1);
    expect(sim.stats.goArounds).toBe(0);
  });

  it('a single-point path to a threshold from the wrong side is not a clearance', () => {
    // North-west of the field heading 130, path straight to 31R's threshold (landing direction 310).
    const sim = simWith([{ name: 'A', pos: onFinal(rwy13L, 6), heading: 130 }], [flight('A')]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [rwy31R.threshold]);
    expect(p.clearedRunway).toBeNull();
  });

  it('goes around when far too high', () => {
    const sim = simWith([finalEntry], [flight('F', { altitude: 9000 })]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.step(400);
    expect(sim.stats.landed).toBe(0);
    expect(sim.stats.goArounds).toBe(1);
    expect(p.clearedRunway).toBeNull();
    expect(p.target.altitude).toBe(RULES.goAroundAltitude);
    expect(sim.events.some((e) => e.text.includes('too high'))).toBe(true);
    // A heading after the go-around keeps the go-around altitude, not the pre-approach one.
    sim.setHeading(p.id, 90);
    expect(p.target.altitude).toBe(RULES.goAroundAltitude);
  });

  it('never circles the threshold forever: a last-second jog to the parallel runway resolves', () => {
    const sim = simWith([finalEntry], [flight('F', { altitude: 2500 })]);
    const p = sim.planes[0];
    // Fly down the 31R centreline until abeam a point 0.6 nm short of 31L (0.86 nm
    // to the side), then jog across to the 31L threshold: a real last-second sidestep.
    const abeam = add(add(rwy31L.threshold, dirOf(rwy31L.heading), -0.6), dirOf(rwy31L.heading + 90), 0.86);
    expect(Math.abs(angleDiff(headingTo(abeam, rwy31L.threshold), rwy31L.heading))).toBeGreaterThan(50);
    sim.setRoute(p.id, [add(rwy31R.threshold, dirOf(rwy31R.heading), -3), abeam, rwy31L.threshold]);
    expect(p.clearedRunway?.id).toBe('31L');
    sim.step(600);
    // Either it squeaks in or it goes around, but it must not still be orbiting.
    expect(sim.stats.landed + sim.stats.goArounds).toBe(1);
    expect(p.status === 'landed' || p.clearedRunway === null).toBe(true);
  });

  it('follows a dense drawn path without getting stuck', () => {
    const sim = simWith([{ name: 'A', pos: { x: -20, y: 0 }, heading: 90 }], [flight('A', { speed: 250 })]);
    const p = sim.planes[0];
    // A tight zig-zag, sampled every 0.5 nm, ending at (0, 10).
    const path = [];
    for (let i = 1; i <= 40; i++) path.push({ x: -20 + i * 0.5, y: i % 8 < 4 ? 1 : -1 });
    path.push({ x: 0, y: 10 });
    sim.setRoute(p.id, path);
    // Watch it fly: it must actually pass close to the zig-zag and to the end point,
    // not just drop the waypoints and carry on.
    let closestToMid = Infinity;
    let closestToEnd = Infinity;
    for (let t = 0; t < 600; t++) {
      sim.step(1);
      closestToMid = Math.min(closestToMid, dist(p.pos, path[20]));
      closestToEnd = Math.min(closestToEnd, dist(p.pos, { x: 0, y: 10 }));
    }
    expect(p.route).toHaveLength(0);
    expect(closestToMid).toBeLessThan(1);
    expect(closestToEnd).toBeLessThan(1.5);
  });

  it('skips a waypoint that is already behind the plane instead of turning back for it', () => {
    // At 150 kt the capture radius is ~0.8 nm, so a point 1.2 nm behind isn't "reached" —
    // only the behind rule drops it.
    const sim = simWith([{ name: 'A', pos: { x: 0, y: 0 }, heading: 0 }], [flight('A', { speed: 150 })]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [{ x: 0, y: -1.2 }, { x: 0, y: 10 }]);
    sim.step(0.25);
    expect(p.route).toEqual([{ x: 0, y: 10 }]);
    expect(p.target.heading).toBe(0);
  });

  it('setRoute: a forced runway lands there, null never lands, an unknown id is just a route', () => {
    const sim = simWith([finalEntry], [flight('F')]);
    const p = sim.planes[0];
    // Ends nearer 31R's threshold, but the UI chose 31L.
    sim.setRoute(p.id, [onFinal(rwy31L, 3)], '31L');
    expect(p.clearedRunway?.id).toBe('31L');
    expect(p.route.at(-1)).toEqual(rwy31L.threshold);
    // null: the same path to a threshold never clears.
    sim.setRoute(p.id, [rwy31R.threshold], null);
    expect(p.clearedRunway).toBeNull();
    sim.setRoute(p.id, [onFinal(rwy31R, 2)], 'XX');
    expect(p.clearedRunway).toBeNull();
    expect(sim.runwayEnd('31R')).toBe(rwy31R);
    expect(sim.runwayEnd('XX')).toBeUndefined();
  });

  it('a path ending away from runways is just a route', () => {
    const sim = simWith([finalEntry], [flight('F')]);
    const p = sim.planes[0];
    const wp = { x: 10, y: 10 };
    sim.setRoute(p.id, [wp]);
    expect(p.clearedRunway).toBeNull();
    sim.step(60);
    expect(Math.abs(angleDiff(p.heading, headingTo(p.pos, wp)))).toBeLessThan(3);
  });

  it('a heading command cancels the route and clearance', () => {
    const sim = simWith([finalEntry], [flight('F')]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.setHeading(p.id, 90);
    expect(p.route).toHaveLength(0);
    expect(p.clearedRunway).toBeNull();
  });

  it('descends on the glideslope based on the path left to fly', () => {
    const sim = simWith([finalEntry], [flight('F', { altitude: 5000 })]);
    const p = sim.planes[0];
    // A dog-leg: 4 nm out to the side first, so path left (~12 nm) is much more than straight-line (8 nm).
    sim.setRoute(p.id, [add(onFinal(rwy31R, 6), dirOf(rwy31R.heading + 90), 4), onFinal(rwy31R, 3), rwy31R.threshold]);
    sim.step(0.25);
    expect(remainingPathNm(p)).toBeGreaterThan(dist(p.pos, rwy31R.threshold) + 2);
    expect(Math.abs(p.target.altitude - remainingPathNm(p) * RULES.glideFtPerNm)).toBeLessThan(20);
  });

  it('slows to approach speed only inside the approach zone', () => {
    const near = simWith([finalEntry], [flight('F')]); // 8 nm out
    near.setRoute(near.planes[0].id, [rwy31R.threshold]);
    near.step(0.25);
    expect(near.planes[0].target.speed).toBe(150);

    const far = simWith([{ name: 'F', pos: onFinal(rwy31R, 20), heading: rwy31R.heading }], [flight('F', { altitude: 9000 })]);
    far.setRoute(far.planes[0].id, [rwy31R.threshold]);
    far.step(0.25);
    expect(far.planes[0].target.speed).toBe(250);
  });

  it('a long curving path neither dives early nor touches down when it overflies the threshold first', () => {
    // 3 nm out on final for 13L at 2,000 ft, but the path overflies the runway,
    // loops round and only lands on its last leg.
    const sim = simWith([{ name: 'F', pos: onFinal(rwy13L, 3), heading: rwy13L.heading }], [flight('F', { altitude: 2000 })]);
    const p = sim.planes[0];
    const beyond = add(rwy13L.threshold, dirOf(rwy13L.heading), 5);
    const side = dirOf(rwy13L.heading - 90);
    sim.setRoute(p.id, [rwy13L.threshold, beyond, add(beyond, side, 4), add(onFinal(rwy13L, 12), side, 4), onFinal(rwy13L, 12), rwy13L.threshold]);
    expect(p.clearedRunway?.id).toBe('13L');
    sim.step(0.25);
    expect(p.target.altitude).toBe(2000); // ~45 nm of path left: no reason to descend yet
    sim.step(90); // well past the first overflight of the threshold
    expect(sim.stats.goArounds).toBe(0);
    expect(sim.stats.landed).toBe(0);
    expect(p.clearedRunway?.id).toBe('13L');
  });

  it('goes around when close in but not pointing at the runway', () => {
    // 2 nm out on the 31R centreline, but heading 120° away from the runway direction.
    const sim = simWith([{ name: 'F', pos: onFinal(rwy31R, 2), heading: rwy31R.heading + 120 }], [flight('F', { altitude: 1000 })]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [rwy31R.threshold]);
    expect(p.clearedRunway?.id).toBe('31R');
    sim.step(0.25);
    expect(sim.stats.goArounds).toBe(1);
    expect(sim.events.some((e) => e.text.includes('not lined up'))).toBe(true);
  });

  it('cancelling a clearance restores the altitude and speed the approach overrode', () => {
    const sim = simWith([finalEntry], [flight('F', { altitude: 5000 })]);
    const p = sim.planes[0];
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.step(0.25);
    expect(p.target.altitude).toBeLessThan(3000);
    sim.setHeading(p.id, 90);
    expect(p.target).toMatchObject({ altitude: 5000, speed: 250 });

    // Re-cleared to the parallel runway mid-approach, then cancelled: still back to the originals.
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.step(0.25);
    sim.setRoute(p.id, [rwy31L.threshold]);
    expect(p.clearedRunway?.id).toBe('31L');
    sim.step(0.25);
    sim.setHeading(p.id, 90);
    expect(p.target).toMatchObject({ altitude: 5000, speed: 250 });

    // Dial changes made while cleared are kept when the clearance is cancelled.
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.setSpeed(p.id, 180);
    sim.setHeading(p.id, 90);
    expect(p.target).toMatchObject({ altitude: 5000, speed: 180 });
    sim.setSpeed(p.id, 250);

    // An altitude command cancels the clearance too, keeps the path as a plain
    // route, and takes the new altitude (not the pre-approach one).
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.step(0.25);
    sim.setAltitude(p.id, 4000);
    expect(p.clearedRunway).toBeNull();
    expect(p.route).toHaveLength(1);
    expect(p.target).toMatchObject({ altitude: 4000, speed: 250 });
    expect(sim.events.at(-1)).toMatchObject({ kind: 'cancelled', runway: '31R', callsigns: [p.callsign] });
    sim.setAltitude(p.id, 5000);

    // Asking for the altitude it's already targeting changes nothing and keeps the clearance.
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.step(0.25);
    const eventsBefore = sim.events.length;
    sim.setAltitude(p.id, p.target.altitude);
    expect(p.clearedRunway?.id).toBe('31R');
    expect(sim.events.length).toBe(eventsBefore);
    // A heading command cancels it with an event too.
    sim.setHeading(p.id, 90);
    expect(sim.events.at(-1)).toMatchObject({ kind: 'cancelled', runway: '31R' });

    // A new path that doesn't end on a runway cancels it too.
    sim.setRoute(p.id, [rwy31R.threshold]);
    sim.step(0.25);
    sim.setRoute(p.id, [{ x: 20, y: 20 }]);
    expect(p.clearedRunway).toBeNull();
    expect(sim.events.at(-1)).toMatchObject({ kind: 'cancelled', runway: '31R' });
    // Commands to an uncleared plane don't announce anything.
    const quiet = sim.events.length;
    sim.setHeading(p.id, 180);
    expect(sim.events.length).toBe(quiet);
    expect(p.target).toMatchObject({ altitude: 5000, speed: 250 });
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

  it('lists each pair in conflict with its lateral and vertical separation', () => {
    const sim = simWith(
      [
        { name: 'A', pos: { x: -5, y: 0 }, heading: 90 },
        { name: 'B', pos: { x: 5, y: 0 }, heading: 270 },
      ],
      [flight('A', { altitude: 7000 }), flight('B', { altitude: 7400 })],
    );
    sim.step(0.01);
    expect(sim.conflicts).toEqual([]); // 10 nm apart
    sim.step(60);
    const [a, b] = sim.planes;
    expect(sim.conflicts).toHaveLength(1);
    expect(sim.conflicts[0]).toMatchObject({ a: a.id, b: b.id, altFt: 400 });
    expect(sim.conflicts[0].distNm).toBeCloseTo(dist(a.pos, b.pos));
    // Once they have passed and opened up again the list empties.
    sim.step(60);
    expect(sim.conflicts).toEqual([]);
  });

  it('a pair in conflict drops off the list when one of them leaves', () => {
    const sim = simWith(
      [
        { name: 'A', pos: { x: 31.5, y: 0 }, heading: 90 },
        { name: 'B', pos: { x: 31.5, y: 1 }, heading: 270 },
      ],
      [flight('A'), flight('B')],
    );
    sim.step(0.01);
    expect(sim.conflicts).toHaveLength(1);
    sim.step(10); // A crosses the sector edge; B heads back in
    expect(sim.planes.map((p) => p.callsign)).toHaveLength(1);
    expect(sim.conflicts).toEqual([]);
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

  it('planes established on parallel finals may be closer than 3 nm', () => {
    const sim = simWith(
      [
        { name: 'R', pos: onFinal(rwy31R, 5), heading: rwy31R.heading },
        { name: 'L', pos: onFinal(rwy31L, 5), heading: rwy31L.heading },
      ],
      [flight('R', { altitude: 1500 }), flight('L', { altitude: 1500 })],
    );
    const [a, b] = sim.planes;
    expect(dist(a.pos, b.pos)).toBeLessThan(RULES.separationNm);
    // (They already counted as a conflict in the instant they spawned, before being cleared.)
    const before = sim.stats.separationViolations;
    sim.setRoute(a.id, [rwy31R.threshold]);
    sim.setRoute(b.id, [rwy31L.threshold]);
    sim.step(1);
    expect(a.conflict || b.conflict).toBe(false);
    expect(sim.conflicts).toEqual([]);
    expect(sim.stats.separationViolations).toBe(before);
  });

  it('the parallel exemption also holds for finger-drawn paths with many waypoints', () => {
    const sim = simWith(
      [
        { name: 'R', pos: onFinal(rwy31R, 9), heading: rwy31R.heading },
        { name: 'L', pos: onFinal(rwy31L, 9), heading: rwy31L.heading },
      ],
      [flight('R', { altitude: 2500 }), flight('L', { altitude: 2500 })],
    );
    const [a, b] = sim.planes;
    // Dense paths down each centreline, a point every 0.4 nm, like a drawn path.
    const drawn = (end: typeof rwy31R) => Array.from({ length: 22 }, (_, i) => onFinal(end, 8.4 - i * 0.4));
    sim.setRoute(a.id, [...drawn(rwy31R), rwy31R.threshold]);
    sim.setRoute(b.id, [...drawn(rwy31L), rwy31L.threshold]);
    expect(a.route.length).toBeGreaterThan(10);
    for (let t = 0; t < 120; t++) {
      sim.step(1);
      if (sim.planes.length < 2) break;
      expect(a.conflict || b.conflict).toBe(false);
    }
  });

  it('planes cleared to parallel runways but not yet established still need separation', () => {
    // Abeam each other 1 nm apart, cleared to 31R / 31L, but 15 nm out: outside the approach zone.
    const sim = simWith(
      [
        { name: 'R', pos: onFinal(rwy31R, 15), heading: rwy31R.heading },
        { name: 'L', pos: onFinal(rwy31L, 15), heading: rwy31L.heading },
      ],
      [flight('R', { altitude: 5000 }), flight('L', { altitude: 5000 })],
    );
    const [a, b] = sim.planes;
    sim.setRoute(a.id, [rwy31R.threshold]);
    sim.setRoute(b.id, [rwy31L.threshold]);
    sim.step(0.25);
    expect(a.conflict && b.conflict).toBe(true);
  });

  it('planes cleared to opposite ends of the same runway still need separation', () => {
    const sim = simWith(
      [
        { name: 'A', pos: onFinal(rwy13L, 3), heading: rwy13L.heading },
        { name: 'B', pos: add(onFinal(rwy13L, 3), { x: 0, y: 1 }), heading: rwy31R.heading },
      ],
      [flight('A'), flight('B')],
    );
    const [a, b] = sim.planes;
    // Put both in the state the old exemption let through: cleared, on their last leg.
    a.clearedRunway = rwy13L;
    a.route = [rwy13L.threshold];
    b.clearedRunway = rwy31R;
    b.route = [rwy31R.threshold];
    sim.step(0.25);
    expect(a.conflict && b.conflict).toBe(true);
  });

  it('planes leaving the square are counted as exits', () => {
    const sim = simWith([{ name: 'A', pos: { x: 0, y: 29 }, heading: 0 }], [flight('A')]);
    sim.step(60);
    expect(sim.planes).toHaveLength(0);
    expect(sim.stats.exited).toBe(1);
  });
});

describe('limits and housekeeping', () => {
  it('clamps commanded speed and altitude to aircraft limits', () => {
    const sim = simWith([{ name: 'A', pos: { x: 0, y: -20 }, heading: 0 }], [flight('A')]);
    const p = sim.planes[0];
    sim.setSpeed(p.id, 0);
    sim.setAltitude(p.id, 0);
    expect(p.target).toMatchObject({ speed: 140, altitude: 1000 });
    sim.setSpeed(p.id, 999);
    sim.setAltitude(p.id, 99999);
    expect(p.target).toMatchObject({ speed: 320, altitude: 20000 });
  });

  it('events are structured: kind, callsigns, runway, reason, and a seq that keeps counting', () => {
    const entry: EntryPoint = { name: 'F', pos: onFinal(rwy31R, 2), heading: rwy31R.heading };
    const sim = simWith([entry], [flight('F', { altitude: 5000 })]);
    const p = sim.planes[0];
    expect(sim.events.at(-1)).toMatchObject({ kind: 'entered', callsigns: [p.callsign] });
    sim.setRoute(p.id, [rwy31R.threshold]);
    expect(sim.events.at(-1)).toMatchObject({ kind: 'cleared', runway: '31R', callsigns: [p.callsign] });
    sim.step(120); // 5,000 ft at 2 nm is far too high: it goes around
    const ga = sim.events.find((e) => e.kind === 'goAround');
    expect(ga).toMatchObject({ runway: '31R', callsigns: [p.callsign] });
    expect(ga?.reason).toMatch(/too high|not aligned|not lined up/);
    const seqs = sim.events.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((x, y) => x - y));
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it('keeps every scored incident of the session, even past the event log limit', () => {
    const sim = simWith(
      [{ name: 'E', pos: { x: 31.5, y: 0 }, heading: 90 }],
      Array.from({ length: 30 }, (_, i) => flight('E', { time: i, callsign: `X${i}` })),
    );
    sim.step(60);
    expect(sim.stats.exited).toBe(30);
    expect(sim.events.length).toBeLessThanOrEqual(20);
    expect(sim.incidents.filter((e) => e.kind === 'exited')).toHaveLength(30);
    expect(sim.incidents.every((e) => ['landed', 'conflict', 'goAround', 'exited'].includes(e.kind))).toBe(true);
  });

  it('keeps trails and the event log bounded', () => {
    const traffic = generateRandomTraffic(LHBP, { seed: 1, durationSec: 3000, meanIntervalSec: 30 });
    const sim = new Sim(LHBP, traffic);
    for (let t = 0; t < 3000; t += 10) {
      sim.step(10);
      for (const p of sim.planes) expect(p.trail.length).toBeLessThanOrEqual(TRAIL_LENGTH);
      expect(sim.events.length).toBeLessThanOrEqual(20);
    }
  });

  it('skips flights whose entry point the airport does not have', () => {
    const sim = new Sim(LHBP, [flight('NOPE', { callsign: 'BAD1' })]);
    sim.step(1);
    expect(sim.planes).toHaveLength(0);
    expect(sim.events.at(-1)?.text).toContain('BAD1 skipped');
  });

  it('drops path points closer together than the minimum spacing', () => {
    const sim = simWith([{ name: 'A', pos: { x: 0, y: -20 }, heading: 0 }], [flight('A')]);
    const p = sim.planes[0];
    const dense = Array.from({ length: 50 }, (_, i) => ({ x: 0, y: -20 + i * 0.1 })); // every 0.1 nm
    sim.setRoute(p.id, dense);
    for (let i = 1; i < p.route.length; i++) {
      expect(dist(p.route[i - 1], p.route[i])).toBeGreaterThanOrEqual(RULES.minRouteSpacingNm - 1e-9);
    }
  });
});
