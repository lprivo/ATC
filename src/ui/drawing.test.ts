import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import { add, dirOf, dist } from '../engine/math';
import { alignment, candidates, DRAW, finalisePath, loupeFor, parallelEnd, snapTarget } from './drawing';
import { defaultViewport, toScreen } from './viewport';

const end = (id: string) => LHBP.runways.flatMap((r) => r.ends).find((e) => e.id === id)!;
const out = (id: string, nm: number) => add(end(id).threshold, dirOf(end(id).heading), -nm);
const vp = defaultViewport(390, 844, 26); // runway zoom

describe('route drawing', () => {
  it('candidate rings for thresholds within 3 nm (or 60 pt) of the finger', () => {
    expect(candidates(LHBP, vp, out('31L', 1)).sort()).toEqual(expect.arrayContaining(['31L', '31R']));
    expect(candidates(LHBP, vp, { x: 20, y: 20 })).toEqual([]);
    // Zoomed far out, 60 pt is more than 3 nm.
    expect(candidates(LHBP, defaultViewport(390, 844, 5), { x: 8, y: -8 }).length).toBeGreaterThan(0); // ~10 nm out
  });

  it('alignment: 1 straight down the approach, negative going the other way', () => {
    const down = [out('31L', 6), out('31L', 5), out('31L', 4), out('31L', 3)];
    expect(alignment(down, end('31L'))).toBeCloseTo(1);
    expect(alignment([...down].reverse(), end('31L'))).toBeCloseTo(-1);
    expect(alignment([out('31L', 3)], end('31L'))).toBe(0);
  });

  it('snaps to the runway whose centreline the path follows, even if the parallel threshold is nearer', () => {
    // Coming down 31R's centreline, ending between the two thresholds but closer to 31L.
    const finger = add(end('31L').threshold, dirOf(end('31L').heading + 90), 0.3);
    expect(dist(finger, end('31L').threshold)).toBeLessThan(dist(finger, end('31R').threshold));
    const path = [out('31R', 6), out('31R', 4.5), out('31R', 3), finger];
    const k = defaultViewport(390, 844, 48);
    expect(snapTarget(LHBP, k, [out('31L', 6), out('31L', 4.5), out('31L', 3), out('31L', 0.1)])).toBe('31L');
    expect(['31L', '31R']).toContain(snapTarget(LHBP, k, path));
  });

  it('no snap away from thresholds; the snap radius is max(28 pt, 0.8 nm)', () => {
    expect(snapTarget(LHBP, vp, [out('31L', 5)])).toBeNull();
    expect(snapTarget(LHBP, vp, [out('31L', 0.5)])).toBe('31L');
    expect(snapTarget(LHBP, vp, [])).toBeNull();
  });

  it('finalised path drops points inside 3.2 nm and ends at the 3 nm final fix', () => {
    const drawn = [out('31L', 8), out('31L', 5), out('31L', 3.1), out('31L', 1), end('31L').threshold];
    const path = finalisePath(drawn, end('31L'));
    expect(path).toHaveLength(3);
    expect(dist(path[2], end('31L').threshold)).toBeCloseTo(DRAW.finalFixNm);
    expect(dist(path[1], out('31L', 5))).toBeCloseTo(0);
  });

  it('swap goes to the parallel runway landing the same way', () => {
    expect(parallelEnd(LHBP, '31L')?.id).toBe('31R');
    expect(parallelEnd(LHBP, '13R')?.id).toBe('13L');
    expect(parallelEnd(LHBP, 'XX')).toBeNull();
  });

  it('loupe: ~150 pt above the finger, on the side away from it, magnified at least 26 pt/nm', () => {
    const v = defaultViewport(390, 844, 8);
    const finger = { x: -10, y: -5 }; // left half of the screen
    const s = toScreen(v, finger);
    const l = loupeFor(v, finger);
    expect(l.cy).toBeCloseTo(s.y - 150);
    expect(l.cx).toBeGreaterThan(s.x);
    expect(l.cam.scale).toBe(26);
    // The finger's world point is at the loupe's centre.
    const c = toScreen(l.cam, finger);
    expect(c.x).toBeCloseTo(l.cx);
    expect(c.y).toBeCloseTo(l.cy);
    // Near the top there's no room above, so it goes below.
    const high = { x: 0, y: 40 };
    expect(loupeFor(v, high).cy).toBeGreaterThan(toScreen(v, high).y);
  });
});
