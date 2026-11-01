import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import { add, dirOf, dist } from '../engine/math';
import { alignment, candidates, centrelineOffsetPt, DRAW, finalisePath, loupeFor, parallelEnd, remainingPoints, snapTarget } from './drawing';
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
    // At k = 12 both 31L and 31R are within the 28 pt (2.3 nm) reach of a finger between them.
    const k = defaultViewport(390, 844, 12);
    // 31L's threshold is staggered 1.6 nm further along than 31R's. A path down 31L's
    // centreline lifting abeam 31R's threshold is nearer 31R (0.86 nm) than 31L (1.6 nm)...
    const finger = out('31L', 1.6);
    expect(dist(finger, end('31R').threshold)).toBeLessThan(dist(finger, end('31L').threshold));
    const path = [out('31L', 7), out('31L', 5.5), out('31L', 4), out('31L', 2.5), finger];
    // ...and still lands 31L: the path's centreline wins over the nearer threshold.
    expect(snapTarget(LHBP, k, path)).toBe('31L');
    // Down 31R's centreline to its threshold lands 31R.
    expect(snapTarget(LHBP, k, [out('31R', 7), out('31R', 5.5), out('31R', 4), out('31R', 0.3)])).toBe('31R');
  });

  it('a path flown the wrong way (from the far end) never snaps to that runway end', () => {
    const k = defaultViewport(390, 844, 12);
    // Flying 132° down the runway towards 31L's threshold: that's landing 13R's way.
    const wrongWay = [out('13R', 3), out('13R', 1), end('13R').threshold, add(end('31L').threshold, dirOf(132), -0.3)];
    expect(snapTarget(LHBP, k, wrongWay)).not.toBe('31L');
  });

  it('centreline offset is the mean sideways distance of the last points, in pt', () => {
    expect(centrelineOffsetPt([out('31R', 5), out('31R', 3)], end('31R'), 10)).toBeCloseTo(0);
    expect(centrelineOffsetPt([out('31R', 5), out('31R', 3)], end('31L'), 10)).toBeGreaterThan(8);
  });

  it('no snap away from thresholds; the snap radius is max(28 pt, 0.8 nm)', () => {
    expect(snapTarget(LHBP, vp, [out('31L', 5)])).toBeNull();
    expect(snapTarget(LHBP, vp, [out('31L', 0.5)])).toBe('31L');
    expect(snapTarget(LHBP, vp, [])).toBeNull();
  });

  it('finalised path trims only the tail inside 3.2 nm and ends at the 3 nm final fix', () => {
    const drawn = [out('31L', 8), out('31L', 5), out('31L', 3.1), out('31L', 1), end('31L').threshold];
    const path = finalisePath(drawn, end('31L'));
    expect(path).toHaveLength(3);
    expect(dist(path[2], end('31L').threshold)).toBeCloseTo(DRAW.finalFixNm);
    expect(dist(path[1], out('31L', 5))).toBeCloseTo(0);
  });

  it('keeps earlier legs on the far side of the field (a downwind), trimming only the end', () => {
    const downwind = [add(end('31L').threshold, dirOf(132), 3), add(out('31L', 2), dirOf(42), 3), out('31L', 6)];
    const path = finalisePath([...downwind, out('31L', 2), out('31L', 0.5)], end('31L'));
    expect(path.slice(0, 3)).toEqual(downwind);
    expect(path).toHaveLength(4);
  });

  it('a plane already on final inside the fix goes straight to the threshold', () => {
    const plane = out('31L', 2);
    expect(finalisePath([out('31L', 1.5), out('31L', 0.5)], end('31L'), plane)).toEqual([end('31L').threshold]);
    // Off the centreline, it still gets the final fix.
    const wide = add(out('31L', 2), dirOf(42), 2);
    expect(finalisePath([out('31L', 1)], end('31L'), wide)).toHaveLength(1);
    expect(dist(finalisePath([out('31L', 1)], end('31L'), wide)[0], end('31L').threshold)).toBeCloseTo(3);
  });

  it('remaining points drop everything up to the one nearest the plane', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    expect(remainingPoints(pts, { x: 1.2, y: 0.1 })).toEqual([{ x: 2, y: 0 }, { x: 3, y: 0 }]);
    expect(remainingPoints([], { x: 0, y: 0 })).toEqual([]);
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
    // The HUD counts as no room: a finger 200 pt down with a 150 pt HUD puts the loupe below.
    const mid = { x: 0, y: (400 - 200) / 8 };
    expect(loupeFor(v, mid, { top: 150, bottom: 0 }).cy).toBeGreaterThan(toScreen(v, mid).y);
    // And it never goes under the bottom sheet.
    const low = { x: 0, y: -45 };
    expect(loupeFor(v, low, { top: 0, bottom: 300 }).cy).toBeLessThanOrEqual(844 - 300 - 62 - 4);
  });
});
