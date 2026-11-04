// Builds a Sim with planes placed exactly where a scene needs them: the
// tutorial's mini-session (tutorial.ts) and the stories' prepared game states
// (fixtures.ts). Pure (no React / React Native imports).
import { LHBP } from '../engine/airports/lhbp';
import { add, dirOf } from '../engine/math';
import { Sim } from '../engine/sim';
import type { Airport, SimStats, TrafficEntry, Vec2 } from '../engine/types';

export interface PlaneSpec {
  callsign: string;
  type?: string;
  pos: Vec2;
  heading: number;
  altitude: number;
  speed: number;
  /** Commanded values (default: what it's doing now). */
  target?: Partial<{ heading: number; altitude: number; speed: number }>;
  /** Cleared to land on this runway end, flying straight to its threshold. */
  clearedTo?: string;
}

export interface SceneOptions {
  airport?: Airport;
  /** Sim time, seconds (e.g. near the end of a 30-minute session). */
  time?: number;
  /** Arrivals still to come (scheduled after `time`). */
  toCome?: number;
  stats?: Partial<SimStats>;
}

const HISTORY_EVERY_SEC = 2;
const HISTORY_SAMPLES = 60;
/** Every plane spawns at the same entry point; each at its own level up here, so they aren't in conflict while stacked there. */
const SPAWN_FT = 30000;
/** Arrivals still to come: one every two minutes after the scene's time. */
const TO_COME = { everySec: 120, altitude: 9000, speed: 250 };

/**
 * A sim with exactly these planes in the air, each with a straight flown
 * history behind it (so tails draw) and the given stats, clock and arrivals
 * still to come. Separation is checked as in a real session, so planes placed
 * close together are in conflict.
 */
export function scene(planes: PlaneSpec[], opts: SceneOptions = {}): Sim {
  const airport = opts.airport ?? LHBP;
  const entry = airport.entries[0].name;
  const now = opts.time ?? 0;
  const arrivals: TrafficEntry[] = planes.map((p, i) => ({ time: 0, callsign: p.callsign, aircraftType: p.type ?? 'A320', kind: 'arrival', entry, altitude: SPAWN_FT + i * 1000, speed: p.speed }));
  const sim = new Sim(airport, arrivals);
  sim.step(0.01); // spawns them
  sim.time = now;
  planes.forEach((spec, i) => {
    const p = sim.planes[i];
    p.pos = { ...spec.pos };
    p.heading = spec.heading;
    p.altitude = spec.altitude;
    p.speed = spec.speed;
    p.target = { heading: spec.heading, altitude: spec.altitude, speed: spec.speed, ...spec.target };
    const back = dirOf(spec.heading);
    const step = (spec.speed / 3600) * HISTORY_EVERY_SEC;
    p.trail = Array.from({ length: HISTORY_SAMPLES }, (_, k) => add(spec.pos, back, -step * (HISTORY_SAMPLES - k)));
    if (spec.clearedTo) {
      const end = sim.runwayEnd(spec.clearedTo);
      if (!end) throw new Error(`scene: ${airport.icao} has no runway end ${spec.clearedTo}`);
      sim.setRoute(p.id, [end.threshold], end.id);
    }
  });
  // Setting the scene up isn't part of it: no "cleared to land" toast for a plane that starts out cleared.
  sim.events = [];
  if (opts.toCome) {
    sim.appendTraffic(
      Array.from({ length: opts.toCome }, (_, k) => ({ time: now + TO_COME.everySec * (k + 1), callsign: `FIX${100 + k}`, aircraftType: 'A320', kind: 'arrival' as const, entry, altitude: TO_COME.altitude, speed: TO_COME.speed })),
    );
  }
  Object.assign(sim.stats, opts.stats);
  sim.step(0.001); // flags conflicts (and logs separation lost) for the placed positions, at the scene's time
  return sim;
}
