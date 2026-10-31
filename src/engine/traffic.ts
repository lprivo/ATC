import { createRng } from './rng';
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
}

/**
 * Generates a session's worth of random arrivals. A real-schedule replay will
 * produce the same TrafficEntry[] shape from a downloaded traffic file.
 */
export function generateRandomTraffic(airport: Airport, opts: RandomTrafficOptions): TrafficEntry[] {
  const rng = createRng(opts.seed);
  const out: TrafficEntry[] = [];
  const used = new Set<string>();
  let t = opts.firstAtSec ?? 2;
  while (t < opts.durationSec) {
    let callsign: string;
    do {
      callsign = `${rng.pick(airport.airlines)}${rng.int(10, 9999)}`;
    } while (used.has(callsign));
    used.add(callsign);
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
