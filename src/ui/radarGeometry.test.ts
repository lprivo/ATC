import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import type { Plane } from '../engine/types';
import {
  bracketPath,
  centreline,
  chevron,
  conflictRingRadius,
  headingVector,
  pairTag,
  ringLabels,
  runwayLabelPos,
  runwayWidth,
  screenDir,
  trailDots,
} from './radarGeometry';
import { toScreen, type Viewport } from './viewport';

const vp = (scale: number): Viewport => ({ w: 400, h: 400, ox: 200, oy: 200, scale });
const plane = (over: Partial<Plane> = {}) => ({ pos: { x: 0, y: 0 }, heading: 90, speed: 240, ...over }) as Plane;
const ends = Object.fromEntries(LHBP.runways.flatMap((r) => r.ends).map((e) => [e.id, e]));

describe('radar geometry', () => {
  it('screen directions: north is up, east is right', () => {
    expect(screenDir(0).y).toBeCloseTo(-1);
    expect(screenDir(90).x).toBeCloseTo(1);
  });

  it('runway width is clamp(3, 0.22 nm, 7)', () => {
    expect(runwayWidth(8)).toBe(3);
    expect(runwayWidth(20)).toBeCloseTo(4.4);
    expect(runwayWidth(48)).toBe(7);
  });

  it('ring labels only for rings inside the sector, up and to the right of centre', () => {
    const l = ringLabels(vp(8), 20);
    expect(l.map((x) => x.r)).toEqual([5, 10, 20]);
    expect(l[0].x).toBeGreaterThan(200);
    expect(l[0].y).toBeLessThan(200);
  });

  it('centreline runs 12 nm out on the approach side, with ticks at 5 and 10 nm', () => {
    const e = ends['31R']; // landing 312: approach comes from the south-east
    const c = centreline(vp(8), e);
    const t = toScreen(vp(8), e.threshold);
    expect(Math.hypot(c.to.x - t.x, c.to.y - t.y)).toBeCloseTo(12 * 8);
    expect(c.to.x).toBeGreaterThan(t.x); // south-east of the threshold on screen
    expect(c.to.y).toBeGreaterThan(t.y);
    expect(c.ticks).toHaveLength(2);
  });

  it('parallel runway labels go on opposite sides, away from each other', () => {
    const v = vp(26);
    const l = runwayLabelPos(v, LHBP, ends['13L']);
    const r = runwayLabelPos(v, LHBP, ends['13R']);
    const tl = toScreen(v, ends['13L'].threshold);
    const tr = toScreen(v, ends['13R'].threshold);
    // 13L/31R is the north-east runway: its label shifts further north-east than its threshold, 13R's the other way.
    const ne = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
    const proj = (p: { x: number; y: number }, o: { x: number; y: number }) => (p.x - o.x) * ne.x + (p.y - o.y) * ne.y;
    expect(proj(l, tl)).toBeGreaterThan(0);
    expect(proj(r, tr)).toBeLessThan(0);
  });

  it('heading vector is one minute of flight, at least 14 pt', () => {
    const long = headingVector(plane({ speed: 240 }), vp(8), 1, 14); // 4 nm × 8 = 32 pt
    expect(long.x2 - 200).toBeCloseTo(32);
    const short = headingVector(plane({ speed: 240 }), vp(2), 1, 14); // 8 pt → clamped to 14
    expect(short.x2 - 200).toBeCloseTo(14);
  });

  it('trail: five dots behind the plane, spaced max(5 pt, 0.45 nm), fading', () => {
    const dots = trailDots(plane({ heading: 90 }), vp(20), 5);
    expect(dots).toHaveLength(5);
    expect(dots[0].x).toBeCloseTo(200 - 9); // 0.45 × 20
    expect(dots[0].opacity).toBeCloseTo(0.84);
    expect(dots[4].opacity).toBeCloseTo(0.2);
    expect(trailDots(plane(), vp(2), 5)[0].x).toBeCloseTo(195); // 5 pt minimum
  });

  it('conflict ring is max(16 pt, 1.5 nm)', () => {
    expect(conflictRingRadius(vp(8), 1.5, 16)).toBe(16);
    expect(conflictRingRadius(vp(20), 1.5, 16)).toBe(30);
  });

  it('bracket path has four L-shaped corners', () => {
    expect(bracketPath(0, 0, 26, 5).match(/M/g)).toHaveLength(4);
  });

  it('chevron tip is the end point', () => {
    expect(chevron({ x: 0, y: 0 }, { x: 10, y: 0 })).toContain('10.0,0.0');
  });

  it('pair tag shows distance and rounded vertical separation', () => {
    expect(pairTag(vp(8), { x: 0, y: 0 }, { x: 2.7, y: 0 }, 2.7, 420).text).toBe('2.7 NM · 400 FT');
  });
});
