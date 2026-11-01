import { describe, expect, it } from 'vitest';
import type { Plane } from '../engine/types';
import { atLimit, nextAltitude, nextHeading, nextRepeatDelay, nextSpeed, statusChip, STEP_LIMITS, trend } from './controls';

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

describe('stepper limits and repeat', () => {
  it('altitude stays within 2,000–15,000 ft and speed within 140–300 kt', () => {
    expect(nextAltitude(plane({ target: { heading: 0, altitude: 15000, speed: 250 } }), 1)).toBe(15000);
    expect(nextAltitude(plane({ target: { heading: 0, altitude: 2000, speed: 250 } }), -1)).toBe(2000);
    expect(nextSpeed(plane({ target: { heading: 0, altitude: 5000, speed: 300 } }), 1)).toBe(300);
    expect(nextSpeed(plane({ target: { heading: 0, altitude: 5000, speed: 140 } }), -1)).toBe(140);
  });

  it('atLimit is true only for the button that can no longer move', () => {
    const top = plane({ target: { heading: 0, altitude: STEP_LIMITS.altitude.max, speed: STEP_LIMITS.speed.min } });
    expect(atLimit('altitude', top, 1)).toBe(true);
    expect(atLimit('altitude', top, -1)).toBe(false);
    expect(atLimit('speed', top, -1)).toBe(true);
    expect(atLimit('speed', top, 1)).toBe(false);
  });

  it('hold to repeat: first after 400 ms, then every 120 ms, every 60 ms after 1.5 s', () => {
    expect(nextRepeatDelay(0)).toBe(400);
    expect(nextRepeatDelay(400)).toBe(120);
    expect(nextRepeatDelay(1499)).toBe(120);
    expect(nextRepeatDelay(1500)).toBe(60);
  });
});

describe('sheet status', () => {
  const at = (target: Partial<Plane['target']>, over: Partial<Plane> = {}) =>
    plane({ target: { heading: 0, altitude: 5000, speed: 250, ...target }, ...over });

  it('priority: conflict, go-around (a minute), cleared, then climb/descent, else none', () => {
    expect(statusChip(at({ altitude: 3000 }, { conflict: true }), 0)?.text).toBe('! CONFLICT');
    expect(statusChip(at({}, { goAroundAt: 10 }), 30)?.text).toBe('GO-AROUND');
    expect(statusChip(at({}, { goAroundAt: 10 }), 100)).toBeNull();
    expect(statusChip(at({}, { clearedRunway: { id: '31R', heading: 312, threshold: { x: 0, y: 0 } } }), 0)).toEqual({ text: 'CLEARED 31R', tone: 'good' });
    expect(statusChip(at({ altitude: 7000 }), 0)?.text).toBe('↑ CLIMBING');
    expect(statusChip(at({ altitude: 3000 }), 0)?.text).toBe('↓ DESCENDING');
    expect(statusChip(at({}), 0)).toBeNull();
  });

  it('trend arrows for the stepper "now" line', () => {
    expect(trend('altitude', at({ altitude: 3000 }))).toBe('↓');
    expect(trend('speed', at({ speed: 280 }))).toBe('↑');
    expect(trend('heading', at({ heading: 30 }))).toBe('↻');
    expect(trend('heading', at({ heading: 330 }))).toBe('↺');
    expect(trend('altitude', at({}))).toBe('');
  });
});
