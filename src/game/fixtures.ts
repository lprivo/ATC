// Prepared game states for stories (and tests): real Sims with planes placed
// exactly where a scene needs them, so every game-screen state (design A1–A5)
// can be shown without playing to it. Pure (no React / React Native imports).
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
  const arrivals: TrafficEntry[] = planes.map((p) => ({ time: 0, callsign: p.callsign, aircraftType: p.type ?? 'A320', kind: 'arrival', entry, altitude: p.altitude, speed: p.speed }));
  const sim = new Sim(airport, arrivals);
  sim.step(0.01); // spawns them
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
    if (spec.clearedTo) sim.setRoute(p.id, [airport.runways.flatMap((r) => r.ends).find((e) => e.id === spec.clearedTo)!.threshold], spec.clearedTo);
  });
  sim.time = now;
  if (opts.toCome) {
    sim.appendTraffic(
      Array.from({ length: opts.toCome }, (_, k) => ({ time: now + 120 * (k + 1), callsign: `FIX${100 + k}`, aircraftType: 'A320', kind: 'arrival' as const, entry, altitude: 9000, speed: 250 })),
    );
  }
  Object.assign(sim.stats, opts.stats);
  sim.step(0.001); // flag conflicts for the placed positions
  return sim;
}

/** A1, idle: four planes spread over the sector, one cleared to land. */
export const idle = (opts: SceneOptions = {}) =>
  scene(
    [
      { callsign: 'WZZ8638', type: 'A21N', pos: { x: -12, y: 14 }, heading: 135, altitude: 7000, speed: 250, target: { altitude: 5000 } },
      { callsign: 'LOT537', type: 'E195', pos: { x: 18, y: 6 }, heading: 250, altitude: 9000, speed: 260 },
      { callsign: 'RYR4UK', type: 'B38M', pos: { x: -6.5, y: 5.5 }, heading: 132, altitude: 3000, speed: 160, clearedTo: '13L' },
      { callsign: 'DLH1340', type: 'A320', pos: { x: 6, y: -18 }, heading: 340, altitude: 10000, speed: 280, target: { altitude: 8000 } },
    ],
    { time: 131, toCome: 6, stats: { landed: 2 }, ...opts },
  );

/** A4, conflict: two planes closing at the same level, 2.7 nm apart. */
export const conflict = (opts: SceneOptions = {}) =>
  scene(
    [
      { callsign: 'WZZ8638', type: 'A21N', pos: { x: -4, y: 12 }, heading: 90, altitude: 6000, speed: 250 },
      { callsign: 'LOT537', type: 'E195', pos: { x: -1.3, y: 12 }, heading: 270, altitude: 6400, speed: 250 },
      { callsign: 'DLH1340', type: 'A320', pos: { x: 14, y: -10 }, heading: 310, altitude: 9000, speed: 270 },
    ],
    { time: 512, toCome: 4, stats: { landed: 3 }, ...opts },
  );

/** A5, busy: 13 planes (labels drop to Min above 8), circling without losing separation for the first minutes. */
export const busy = (opts: SceneOptions = {}) => {
  const calls = ['WZZ1', 'RYR22', 'DLH340', 'AFR77', 'BAW99', 'EZY512', 'KLM16', 'LOT537', 'AUA81', 'SWR4', 'THY1F', 'QTR201', 'EWG93'];
  return scene(
    calls.map((callsign, i) => {
      const a = (i / calls.length) * 2 * Math.PI;
      const r = 9 + (i % 3) * 6;
      // Flying round the airport (at a tangent to their ring), each at its own level 1,000 ft apart, so the scene stays busy without losing separation.
      return { callsign, pos: { x: Math.sin(a) * r, y: Math.cos(a) * r }, heading: ((a * 180) / Math.PI + 90) % 360, altitude: 3000 + i * 1000, speed: 220 + (i % 4) * 15 };
    }),
    { time: 1260, toCome: 9, stats: { landed: 7, goArounds: 1 }, ...opts },
  );
};

/** Near the end of a 30-minute session: 40 s left, nothing more to come. */
export const lastMinute = () => idle({ time: 30 * 60 - 40, toCome: 0, stats: { landed: 9 } });
