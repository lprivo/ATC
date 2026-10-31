import { add, dirOf, normDeg } from '../math';
import type { Airport, EntryPoint, Fix, Runway, Vec2 } from '../types';

/**
 * Builds both ends of a runway from its centre, the heading of its lower-
 * numbered end, and its length. Landing on "13" means flying heading ~130 and
 * touching down at the north-west end, so each end's threshold is placed on
 * the side the plane arrives from.
 */
function makeRunway(name: string, centre: Vec2, heading: number, lengthNm: number): Runway {
  const [a, b] = name.split('/');
  const d = dirOf(heading);
  const half = lengthNm / 2;
  return {
    name,
    ends: [
      { id: a, heading, threshold: add(centre, d, -half) },
      { id: b, heading: normDeg(heading + 180), threshold: add(centre, d, half) },
    ],
  };
}

// The legacy sim positioned fixes as fractions of a ~60 x 36 nm screen with the
// BUD VOR at (0.506, 0.462). Convert those to nm so the layout feels familiar.
// Approximate — good enough for a proof of concept, not for navigation.
const W = 60;
const H = 36;
const legacy = (fx: number, fy: number): Vec2 => ({ x: (fx - 0.506) * W, y: -(fy - 0.462) * H });
const fix = (name: string, fx: number, fy: number): Fix => ({ name, pos: legacy(fx, fy) });
const entry = (name: string, fx: number, fy: number, heading: number): EntryPoint => ({
  name,
  pos: legacy(fx, fy),
  heading,
});

// Perpendicular offset between the parallel runways (13L/31R is the north-east one).
const sideways = dirOf(40);

export const LHBP: Airport = {
  icao: 'LHBP',
  name: 'Budapest Liszt Ferenc',
  rangeNm: 30,
  runways: [
    makeRunway('13L/31R', add({ x: 0, y: 0 }, sideways, 0.5), 130, 2.0),
    makeRunway('13R/31L', add({ x: 0, y: 0 }, sideways, -0.5), 130, 1.63),
  ],
  fixes: [
    fix('BADOV', 0.343, 0.008),
    fix('NALAG', 0.64, 0.008),
    fix('BABOX', 0.669, 0.992),
    fix('ABONY', 0.824, 0.666),
    fix('VEBOS', 0.224, 0.625),
    fix('NIPUR', 0.836, 0.186),
    fix('JBR', 0.785, 0.421),
    fix('TPS', 0.586, 0.424),
    fix('MNR', 0.567, 0.6),
    fix('BALUX', 0.443, 0.591),
    fix('ETARO', 0.387, 0.421),
    fix('EPARI', 0.378, 0.21),
    fix('NORAH', 0.746, 0.292),
    fix('ERLOS', 0.508, 0.889),
  ],
  entries: [
    entry('N', 0.3, 0, 150),
    entry('NE', 1.0, 0.08, 248),
    entry('SE', 0.85, 1, 353),
    entry('SW', 0.15, 1, 18),
    entry('W', 0, 0.45, 80),
  ],
  airlines: ['WZZ', 'WZZ', 'WZZ', 'RYR', 'RYR', 'DLH', 'AFR', 'BAW', 'EZY', 'KLM', 'LOT', 'AUA', 'SWR', 'THY', 'QTR', 'EWG'],
};
