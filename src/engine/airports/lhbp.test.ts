import { describe, expect, it } from 'vitest';
import { angleDiff, dist, headingTo, trackOffsets } from '../math';
import { LHBP } from './lhbp';

const end = (id: string) => LHBP.runways.flatMap((r) => r.ends).find((e) => e.id === id)!;
const NM = 1852;
/** Metres the computed lengths may differ by: thresholds are rounded to 0.001 nm and the degree→nm factors are approximate. */
const LENGTH_TOLERANCE_M = 25;

describe('LHBP geometry', () => {
  it('runway lengths match the published 3,707 m and 3,010 m', () => {
    expect(Math.abs(dist(end('13L').threshold, end('31R').threshold) * NM - 3707)).toBeLessThan(LENGTH_TOLERANCE_M);
    expect(Math.abs(dist(end('13R').threshold, end('31L').threshold) * NM - 3010)).toBeLessThan(LENGTH_TOLERANCE_M);
  });

  it('each runway lies along its landing heading (132° / 312°)', () => {
    for (const r of LHBP.runways) {
      const [a, b] = r.ends;
      expect(Math.abs(angleDiff(headingTo(a.threshold, b.threshold), a.heading))).toBeLessThan(1);
      expect(Math.abs(angleDiff(headingTo(b.threshold, a.threshold), b.heading))).toBeLessThan(1);
    }
  });

  it('centrelines are ~0.86 nm apart, with 13L/31R the north-east one', () => {
    // Signed: 13L sits to the left of a plane landing on 13R (heading 132), i.e. to the north-east.
    const { cross } = trackOffsets(end('13L').threshold, end('13R').threshold, 132);
    expect(cross).toBeLessThan(-0.8);
    expect(cross).toBeGreaterThan(-0.92);
  });

  it('13R is staggered ~1.2 nm north-west of 13L', () => {
    const { along } = trackOffsets(end('13L').threshold, end('13R').threshold, 132);
    expect(along).toBeGreaterThan(1.0);
    expect(along).toBeLessThan(1.4);
  });

  it('is plain serialisable data (no functions), so it can come from a backend later', () => {
    expect(JSON.parse(JSON.stringify(LHBP))).toEqual(LHBP);
  });

  it('every entry point is on the sector edge (inside the exit limit) and points inbound', () => {
    for (const e of LHBP.entries) {
      const edge = Math.max(Math.abs(e.pos.x), Math.abs(e.pos.y));
      expect(edge).toBeGreaterThan(LHBP.rangeNm - 3);
      // The sim removes planes beyond rangeNm + 2, so an entry out there would exit on arrival.
      expect(edge).toBeLessThan(LHBP.rangeNm + 2);
      expect(Math.abs(angleDiff(e.heading, headingTo(e.pos, { x: 0, y: 0 })))).toBeLessThan(60);
    }
  });
});
