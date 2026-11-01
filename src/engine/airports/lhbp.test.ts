import { describe, expect, it } from 'vitest';
import { angleDiff, dist, dirOf, headingTo } from '../math';
import { LHBP } from './lhbp';

const end = (id: string) => LHBP.runways.flatMap((r) => r.ends).find((e) => e.id === id)!;
const NM = 1852;

/** Perpendicular distance from a point to the line through `a` along `heading`. */
const crossTrack = (p: { x: number; y: number }, a: { x: number; y: number }, heading: number) => {
  const d = dirOf(heading);
  return Math.abs((p.x - a.x) * d.y - (p.y - a.y) * d.x);
};

describe('LHBP geometry', () => {
  it('runway lengths match the published 3,707 m and 3,010 m', () => {
    expect(dist(end('13L').threshold, end('31R').threshold) * NM).toBeCloseTo(3707, -1.5);
    expect(dist(end('13R').threshold, end('31L').threshold) * NM).toBeCloseTo(3010, -1.5);
  });

  it('each runway lies along its landing heading (132° / 312°)', () => {
    for (const r of LHBP.runways) {
      const [a, b] = r.ends;
      expect(Math.abs(angleDiff(headingTo(a.threshold, b.threshold), a.heading))).toBeLessThan(1);
      expect(Math.abs(angleDiff(headingTo(b.threshold, a.threshold), b.heading))).toBeLessThan(1);
    }
  });

  it('centrelines are ~0.86 nm apart, with 13L/31R the north-east one', () => {
    const sep = crossTrack(end('13R').threshold, end('13L').threshold, 132);
    expect(sep).toBeGreaterThan(0.8);
    expect(sep).toBeLessThan(0.92);
    // North-east of the 13R/31L line: east of it and north of it on a 132° runway.
    expect(end('13L').threshold.x).toBeGreaterThan(end('13R').threshold.x);
  });

  it('13R is staggered ~1.2 nm north-west of 13L', () => {
    const along = (end('13L').threshold.x - end('13R').threshold.x) * dirOf(132).x + (end('13L').threshold.y - end('13R').threshold.y) * dirOf(132).y;
    expect(along).toBeGreaterThan(1.0);
    expect(along).toBeLessThan(1.4);
  });

  it('is plain serialisable data (no functions), so it can come from a backend later', () => {
    expect(JSON.parse(JSON.stringify(LHBP))).toEqual(LHBP);
  });

  it('every entry point is near the sector edge and points inbound', () => {
    for (const e of LHBP.entries) {
      expect(Math.max(Math.abs(e.pos.x), Math.abs(e.pos.y))).toBeGreaterThan(LHBP.rangeNm * 0.5);
      expect(Math.abs(angleDiff(e.heading, headingTo(e.pos, { x: 0, y: 0 })))).toBeLessThan(60);
    }
  });
});
