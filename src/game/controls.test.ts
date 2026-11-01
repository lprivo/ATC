import { describe, expect, it } from 'vitest';
import type { Plane } from '../engine/types';
import { nextAltitude, nextHeading, nextSpeed } from './controls';

function plane(over: Partial<Plane> = {}): Plane {
  return {
    id: '1', callsign: 'T1', aircraftType: 'A320', kind: 'arrival',
    pos: { x: 0, y: 0 }, heading: 0, altitude: 5000, speed: 250,
    target: { heading: 0, altitude: 5000, speed: 250 },
    route: [], clearedRunway: null, approachFrom: null, goAroundAt: null, status: 'active', conflict: false, trail: [],
    ...over,
  };
}

describe('dial stepping', () => {
  it('heading wraps through north both ways', () => {
    expect(nextHeading(plane({ target: { heading: 0, altitude: 5000, speed: 250 } }), -1)).toBe(355);
    expect(nextHeading(plane({ target: { heading: 355, altitude: 5000, speed: 250 } }), 1)).toBe(0);
  });

  it('heading steps from the commanded heading when flying headings', () => {
    expect(nextHeading(plane({ heading: 200, target: { heading: 90, altitude: 5000, speed: 250 } }), 1)).toBe(95);
  });

  it('while following a drawn path, heading steps from where the plane is pointing', () => {
    const p = plane({ heading: 213, route: [{ x: 5, y: 5 }], target: { heading: 40, altitude: 5000, speed: 250 } });
    expect(nextHeading(p, 1)).toBe(220); // 213 snaps to 215, +5
    expect(nextHeading(p, -1)).toBe(210);
  });

  it('altitude and speed snap to the step grid before stepping', () => {
    expect(nextAltitude(plane({ target: { heading: 0, altitude: 2544, speed: 250 } }), 1)).toBe(4000);
    expect(nextAltitude(plane(), -1)).toBe(4000);
    expect(nextSpeed(plane({ target: { heading: 0, altitude: 5000, speed: 147 } }), -1)).toBe(140);
    expect(nextSpeed(plane(), 1)).toBe(260);
  });
});
