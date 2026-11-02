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
    expect(sim.time).toBeCloseTo(100, 1);
    expect(sim.remainingTraffic).toBe(2);
  });

  it('builds each scene in the state its story shows', () => {
    expect(idle().planes).toHaveLength(4);
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
