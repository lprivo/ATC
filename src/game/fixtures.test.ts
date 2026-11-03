import { describe, expect, it } from 'vitest';
import { busy, conflict, idle, lastMinute, scene } from './fixtures';

describe('story fixtures', () => {
  it('places planes exactly as specified, with a history behind them', () => {
    const sim = scene([{ callsign: 'AAA1', pos: { x: 3, y: 4 }, heading: 90, altitude: 5000, speed: 240 }], { time: 100, toCome: 2 });
    const [p] = sim.planes;
    expect(p.callsign).toBe('AAA1');
    expect(p.pos.x).toBeCloseTo(3, 2);
    expect(p.pos.y).toBeCloseTo(4, 2);
    expect(p.trail.length).toBeGreaterThan(10);
    expect(p.trail[p.trail.length - 1].x).toBeLessThan(3); // behind an eastbound plane
    // Oldest first, as the sim keeps it: each point closer to the plane than the one before.
    const gap = p.trail.map((q) => Math.hypot(q.x - 3, q.y - 4));
    for (let i = 1; i < gap.length; i++) expect(gap[i]).toBeLessThan(gap[i - 1]);
    expect(sim.time).toBeCloseTo(100, 1);
    expect(sim.remainingTraffic).toBe(2);
  });

  it('sets the type, commanded values and stats it is given', () => {
    const sim = idle();
    const wzz = sim.planes.find((p) => p.callsign === 'WZZ8638')!; // the plane the A2 stories select
    expect(wzz.aircraftType).toBe('A21N');
    expect(wzz.target).toMatchObject({ altitude: 5000, heading: 135, speed: 250 });
    expect(sim.stats).toMatchObject({ landed: 2, separationViolations: 0 });
    expect(lastMinute().stats).toMatchObject({ landed: 9, separationViolations: 1 });
  });

  it('counts no separation loss for planes that only met while the scene was set up', () => {
    // All planes spawn at one entry point before they're moved: two at the same level, 40 nm apart, are not a loss.
    const sim = scene([
      { callsign: 'AAA1', pos: { x: -20, y: 0 }, heading: 90, altitude: 5000, speed: 240 },
      { callsign: 'BBB2', pos: { x: 20, y: 0 }, heading: 270, altitude: 5000, speed: 240 },
    ]);
    expect(sim.stats.separationViolations).toBe(0);
    expect(sim.incidents).toHaveLength(0);
  });

  it('starts with no setup events: no toast for a plane that starts out cleared, and incidents at the scene time', () => {
    expect(idle().events).toHaveLength(0);
    const c = conflict();
    expect(c.incidents).toHaveLength(1);
    expect(c.incidents[0].time).toBeCloseTo(512, 0);
  });

  it('fails loudly on a runway end the airport does not have', () => {
    expect(() => scene([{ callsign: 'AAA1', pos: { x: 0, y: 0 }, heading: 0, altitude: 5000, speed: 240, clearedTo: '13X' }])).toThrow(/13X/);
  });

  it('builds each scene in the state its story shows', () => {
    expect(idle().planes).toHaveLength(4);
    expect(idle().conflicts).toHaveLength(0); // A1: no banner
    expect(idle().planes.some((p) => p.clearedRunway?.id === '13L')).toBe(true);
    const c = conflict();
    expect(c.conflicts).toHaveLength(1);
    expect(c.planes.filter((p) => p.conflict).map((p) => p.callsign).sort()).toEqual(['LOT537', 'WZZ8638']);
    expect(busy().planes).toHaveLength(13);
    expect(busy().conflicts).toHaveLength(0);
    // Busy stays busy, not a pile-up: no separation lost in the first two minutes of it running.
    const b = busy();
    for (let t = 0; t < 120; t++) b.step(1);
    expect(b.stats.separationViolations).toBe(0);
    expect(lastMinute().remainingTraffic).toBe(0);
    expect(30 * 60 - lastMinute().time).toBeLessThan(60);
  });
});
