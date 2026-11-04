import FLIGHTS from './data/flights.json';
import { createRng, type Rng } from './rng';
import type { Airport, TrafficEntry } from './types';

const AIRCRAFT_TYPES = ['A320', 'A20N', 'A21N', 'B738', 'B38M', 'E190', 'A319', 'B789'];
const ENTRY_ALTITUDES = [7000, 8000, 9000, 10000, 11000];

export interface RandomTrafficOptions {
  seed: number;
  /** Total length of the session in sim seconds. */
  durationSec: number;
  /** Average gap between arrivals in sim seconds. */
  meanIntervalSec: number;
  /** Delay before the first plane. */
  firstAtSec?: number;
  /** Callsigns already in use (e.g. flying or scheduled), which new flights must not repeat. */
  exclude?: Iterable<string>;
}

/**
 * Generates a session's worth of random arrivals. A real-schedule replay will
 * produce the same TrafficEntry[] shape from a downloaded traffic file.
 */
export function generateRandomTraffic(airport: Airport, opts: RandomTrafficOptions): TrafficEntry[] {
  const rng = createRng(opts.seed);
  const out: TrafficEntry[] = [];
  const inUse = new Set<string>(opts.exclude ?? []);
  const scheduled = new Map<string, number>();
  let t = opts.firstAtSec ?? 2;
  while (t < opts.durationSec) {
    const callsign = pickCallsign(rng, airport.airlines, inUse, scheduled);
    scheduled.set(callsign, t);
    out.push({
      time: t,
      callsign,
      aircraftType: rng.pick(AIRCRAFT_TYPES),
      kind: 'arrival',
      entry: rng.pick(airport.entries).name,
      altitude: rng.pick(ENTRY_ALTITUDES),
      speed: 250,
    });
    // Jitter the gap between 0.5x and 1.5x the mean.
    t += opts.meanIntervalSec * (0.5 + rng.next());
  }
  return out;
}

const FLIGHT_NUMBERS = FLIGHTS as unknown as Record<string, string[] | undefined>;

/**
 * A callsign for the next flight: an airline the airport has, and one of its
 * usual flight numbers (data/flights.json), because the radio voice only has
 * those recorded. Never one in use (`inUse`: flying, or scheduled earlier).
 * One not yet scheduled in this batch (`scheduled`: callsign → time) if the
 * airline has one left, else another airline's; once all are scheduled, the
 * one scheduled longest ago, whose flight is long gone by then. A random
 * number only when every airline's are in use.
 */
export function pickCallsign(rng: Rng, airlines: readonly string[], inUse: ReadonlySet<string>, scheduled: ReadonlyMap<string, number> = new Map()): string {
  const pool = (airline: string) => (FLIGHT_NUMBERS[airline] ?? []).map((n) => `${airline}${n}`).filter((c) => !inUse.has(c));
  const fresh = (airline: string) => pool(airline).filter((c) => !scheduled.has(c));
  const airline = rng.pick(airlines);
  if (fresh(airline).length) return rng.pick(fresh(airline));
  const others = [...new Set(airlines)].filter((a) => fresh(a).length);
  if (others.length) return rng.pick(fresh(rng.pick(others)));
  const all = [...new Set(airlines)].flatMap(pool);
  if (all.length) return all.reduce((a, b) => (scheduled.get(b)! < scheduled.get(a)! ? b : a));
  let callsign: string;
  do {
    callsign = `${airline}${rng.int(10, 9999)}`;
  } while (inUse.has(callsign) || scheduled.has(callsign));
  return callsign;
}
