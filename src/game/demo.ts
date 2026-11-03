// The main menu's living background (#40): a random playable airport whose
// arrivals fly themselves in and land. Pure (no React / React Native imports),
// so it is unit tested; the menu only steps it and draws it.
import { add, angleDiff, dirOf } from '../engine/math';
import { createRng, type Rng } from '../engine/rng';
import { Sim } from '../engine/sim';
import { generateRandomTraffic } from '../engine/traffic';
import type { Airport, RunwayEnd, TrafficEntry, Vec2 } from '../engine/types';

/**
 * Demo tuning. At most `maxPlanes` in the air (it's a background, not a busy
 * sector). A new arrival is let in only once every plane already flying has
 * turned onto final, and `spawnGapSec` after the last one, so arrivals never
 * catch each other up; it goes on for as long as the menu stays open.
 */
export const DEMO = {
  maxPlanes: 2,
  spawnGapSec: 60,
  warmUpSec: 6 * 60,
  finalNm: 12,
  /** How far out to the side the circuit's downwind and base legs fly. */
  circuitNm: 5,
  /** Each runway's stream at its own altitude. */
  altitudeFt: [4000, 5000],
  speedKt: 220,
  /** Runway ends within this many degrees of each other land the same way (parallels). */
  parallelDeg: 20,
  /** Each refill of the arrivals pool: an hour of random flights, about one a minute. */
  pool: { durationSec: 3600, meanIntervalSec: 60 },
};

/** A random airport from the playable layouts. */
export function pickDemoAirport(airports: readonly Airport[], rng: Pick<Rng, 'pick'>): Airport {
  if (airports.length === 0) throw new Error('pickDemoAirport: no airports');
  return rng.pick(airports);
}

/**
 * The runway ends in use: one landing direction, chosen at random, with every
 * end facing that way (both of a pair of parallels).
 */
export function landingEnds(airport: Airport, rng: Pick<Rng, 'pick'>): RunwayEnd[] {
  const all = airport.runways.flatMap((r) => r.ends);
  const lead = rng.pick(all);
  return all.filter((e) => Math.abs(angleDiff(lead.heading, e.heading)) < DEMO.parallelDeg);
}

export interface Demo {
  sim: Sim;
  ends: RunwayEnd[];
  /** Sim time the next arrival may appear. */
  nextSpawn: number;
  /** Seed for the next batch of random arrivals to draw from. */
  seed: number;
  /** Arrivals not yet released into the sim (refilled as it empties). */
  pool: TrafficEntry[];
}

/** A fresh demo at `airport`, warmed up so planes are already in the air. */
export function createDemo(airport: Airport, seed: number): Demo {
  const rng = createRng(seed);
  // Scenery: no conflict flags or scoring (the sequencing keeps planes apart; demo.test.ts checks it).
  const demo: Demo = {
    sim: new Sim(airport, [], { separation: false }),
    ends: landingEnds(airport, rng),
    nextSpawn: 0,
    seed,
    pool: [],
  };
  for (let t = 0; t < DEMO.warmUpSec; t++) stepDemo(demo, 1);
  return demo;
}

/**
 * The autopilot: each new arrival is given a circuit on its own side of the
 * approach to the runway on that side (so it never crosses another plane's
 * final), then cleared to land; each runway's stream at its own altitude.
 * New arrivals are let in first; then the sim steps.
 */
export function stepDemo(demo: Demo, dtSec: number) {
  const { sim } = demo;
  releaseArrival(demo);
  for (const p of sim.planes) {
    if (p.clearedRunway || p.route.length > 0) continue;
    const { end, side } = runwayForSide(demo.ends, p.pos);
    sim.setAltitude(p.id, DEMO.altitudeFt[demo.ends.indexOf(end) % DEMO.altitudeFt.length]);
    sim.setSpeed(p.id, DEMO.speedKt);
    sim.setRoute(p.id, circuit(p.pos, end, side), end.id);
  }
  sim.step(dtSec);
}

/** Unit vectors along a runway end's landing direction and to its right. */
function axes(end: RunwayEnd) {
  const u = dirOf(end.heading);
  return { u, right: { x: u.y, y: -u.x } };
}

/**
 * Which side of the approach a point is on (+1 right of the landing direction,
 * −1 left, measured from the middle of the runways in use), and the runway on
 * that side: the left one of a pair of parallels for the left side, and so on.
 */
export function runwayForSide(ends: readonly RunwayEnd[], pos: Vec2): { end: RunwayEnd; side: 1 | -1 } {
  const { right } = axes(ends[0]);
  const mid = ends.reduce((m, e) => ({ x: m.x + e.threshold.x / ends.length, y: m.y + e.threshold.y / ends.length }), { x: 0, y: 0 });
  const across = (q: Vec2) => (q.x - mid.x) * right.x + (q.y - mid.y) * right.y;
  const side: 1 | -1 = across(pos) >= 0 ? 1 : -1;
  const end = ends.reduce((best, e) => (across(e.threshold) * side > across(best.threshold) * side ? e : best), ends[0]);
  return { end, side };
}

/**
 * A circuit that stays on the plane's own side of the extended centreline
 * until it turns onto final, so it never crosses another plane's approach:
 * downwind abeam the threshold if it comes from beyond the airport, then base,
 * then the joining point `finalNm` out, then the threshold.
 */
export function circuit(pos: Vec2, end: RunwayEnd, side: 1 | -1): Vec2[] {
  const { u, right } = axes(end);
  const t = end.threshold;
  const along = (pos.x - t.x) * u.x + (pos.y - t.y) * u.y; // negative: on the approach side of the threshold
  const out = (q: Vec2) => add(q, right, side * DEMO.circuitNm);
  const join = add(t, u, -DEMO.finalNm);
  const base = out(join);
  return along > -DEMO.finalNm / 2 ? [out(t), base, join, t] : [base, join, t];
}

/**
 * Lets one more arrival in when there's room (fewer than `maxPlanes` flying or
 * about to appear), every plane already flying is on final, and `spawnGapSec`
 * has passed since the last. Arrivals come from a pool of random flights,
 * refilled when it runs dry, so the demo never ends.
 */
function releaseArrival(demo: Demo) {
  const { sim } = demo;
  if (sim.time < demo.nextSpawn || sim.remainingTraffic > 0 || sim.planes.length >= DEMO.maxPlanes) return;
  if (!sim.planes.every((p) => p.clearedRunway && p.route.length <= 1)) return;
  if (demo.pool.length === 0) {
    demo.pool = generateRandomTraffic(sim.airport, { seed: demo.seed++, ...DEMO.pool, exclude: sim.callsignsInUse });
    if (demo.pool.length === 0) return;
  }
  const next = demo.pool.shift()!;
  sim.appendTraffic([{ ...next, time: sim.time }]);
  demo.nextSpawn = sim.time + DEMO.spawnGapSec;
}
