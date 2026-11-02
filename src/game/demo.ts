// The main menu's living background (#40): a random playable airport whose
// arrivals fly themselves in and land. Pure (no React / React Native imports),
// so it is unit tested; the menu only steps it and draws it.
import { add, clamp, dirOf, dist } from '../engine/math';
import { createRng } from '../engine/rng';
import { Sim } from '../engine/sim';
import { generateRandomTraffic } from '../engine/traffic';
import type { Airport, RunwayEnd } from '../engine/types';

/**
 * Demo tuning. Traffic: an arrival every ~70 s on average, generated for 6
 * hours (far longer than anyone sits on the menu). Sequencing: arrivals reach
 * the point where they join final `slotSec` apart, on the runway on their side, at
 * `minSpeedKt`–`maxSpeedKt`; a plane that would still be early takes a dog-leg.
 */
export const DEMO = {
  meanIntervalSec: 70,
  durationSec: 6 * 3600,
  warmUpSec: 9 * 60,
  finalNm: 12,
  altitudeFt: [4000, 5000],
  slotSec: 60,
  minSpeedKt: 170,
  maxSpeedKt: 250,
};

/** A random airport from the playable layouts. */
export function pickDemoAirport(airports: readonly Airport[], rand: () => number): Airport {
  if (airports.length === 0) throw new Error('pickDemoAirport: no airports');
  return airports[Math.min(airports.length - 1, Math.floor(rand() * airports.length))];
}

/**
 * The runway ends in use: one landing direction, chosen at random, with every
 * end facing that way (both of a pair of parallels).
 */
export function landingEnds(airport: Airport, rand: () => number): RunwayEnd[] {
  const all = airport.runways.flatMap((r) => r.ends);
  const lead = all[Math.min(all.length - 1, Math.floor(rand() * all.length))];
  return all.filter((e) => Math.abs(((e.heading - lead.heading + 540) % 360) - 180) < 20);
}

export interface Demo {
  sim: Sim;
  ends: RunwayEnd[];
  /** How many arrivals have been sent in so far. */
  assigned: number;
  /** Sim time the next arrival may reach its joining point. */
  nextSlot: number;
}

/** A fresh demo at `airport`, warmed up so planes are already in the air. */
export function createDemo(airport: Airport, seed: number): Demo {
  const rng = createRng(seed);
  const traffic = generateRandomTraffic(airport, { seed, durationSec: DEMO.durationSec, meanIntervalSec: DEMO.meanIntervalSec });
  // Scenery: no conflict flags or scoring (the sequencing keeps planes apart; demo.test.ts checks it).
  const demo: Demo = { sim: new Sim(airport, traffic, { separation: false }), ends: landingEnds(airport, rng.next), assigned: 0, nextSlot: 0 };
  for (let t = 0; t < DEMO.warmUpSec; t++) stepDemo(demo, 1);
  return demo;
}

/**
 * The autopilot, sequencing like an approach controller: each new arrival gets
 * the next slot at the point `finalNm` out on the extended centreline of the
 * runway in use on its side of the approach. It flies there at the speed that makes the slot (with a
 * dog-leg if it would still be early at the slowest speed), then down final,
 * cleared to land. Each runway's stream flies at its own altitude. Then the sim steps.
 */
export function stepDemo(demo: Demo, dtSec: number) {
  const { sim } = demo;
  for (const p of sim.planes) {
    if (p.clearedRunway || p.route.length > 0) continue;
    // The runway on the plane's own side of the approach (the nearest joining point), so the streams never cross.
    const joins = demo.ends.map((e) => add(e.threshold, dirOf(e.heading), -DEMO.finalNm));
    let k = 0;
    for (let i = 1; i < joins.length; i++) if (dist(p.pos, joins[i]) < dist(p.pos, joins[k])) k = i;
    const end = demo.ends[k];
    const join = joins[k];
    demo.assigned++;
    const direct = dist(p.pos, join);
    const slot = Math.max(sim.time, demo.nextSlot);
    const wantNm = ((slot - sim.time) * DEMO.minSpeedKt) / 3600; // distance flown at the slowest speed until the slot
    const route = [join, end.threshold];
    let pathNm = direct;
    if (wantNm > direct) {
      // Too early even at the slowest speed: a dog-leg out to the side, half-way, to make up the distance.
      const half = direct / 2;
      const out = Math.sqrt((wantNm / 2) ** 2 - half ** 2);
      const mid = { x: (p.pos.x + join.x) / 2, y: (p.pos.y + join.y) / 2 };
      const ux = (join.x - p.pos.x) / direct;
      const uy = (join.y - p.pos.y) / direct;
      route.unshift({ x: mid.x - uy * out, y: mid.y + ux * out });
      pathNm = wantNm;
    }
    const speed = slot > sim.time ? clamp((pathNm * 3600) / (slot - sim.time), DEMO.minSpeedKt, DEMO.maxSpeedKt) : DEMO.maxSpeedKt;
    demo.nextSlot = sim.time + (pathNm * 3600) / speed + DEMO.slotSec;
    sim.setAltitude(p.id, DEMO.altitudeFt[k % DEMO.altitudeFt.length]);
    sim.setSpeed(p.id, speed);
    sim.setRoute(p.id, route, end.id);
  }
  sim.step(dtSec);
}
