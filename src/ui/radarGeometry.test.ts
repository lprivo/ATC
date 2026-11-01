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
  trailAlpha,
  trailDots,
} from './radarGeometry';
import { toScreen, type Viewport } from './viewport';

const vp = (scale: number): Viewport => ({ w: 400, h: 400, ox: 200, oy: 200, scale });
const plane = (over: Partial<Plane> = {}) => ({ pos: { x: 0, y: 0 }, heading: 90, speed: 240, trail: [], ...over }) as Plane;
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
    c.ticks.forEach((tk, i) => {
      const mid = { x: (tk.x1 + tk.x2) / 2, y: (tk.y1 + tk.y2) / 2 };
      expect(Math.hypot(mid.x - t.x, mid.y - t.y)).toBeCloseTo([5, 10][i] * 8);
      // Perpendicular to the centreline, 8 pt long.
      expect(Math.hypot(tk.x2 - tk.x1, tk.y2 - tk.y1)).toBeCloseTo(8);
      const along = { x: c.to.x - t.x, y: c.to.y - t.y };
      expect((tk.x2 - tk.x1) * along.x + (tk.y2 - tk.y1) * along.y).toBeCloseTo(0);
    });
  });

  it('parallel runway labels go on opposite sides, away from each other', () => {
    const v = vp(26);
    const l = runwayLabelPos(v, LHBP, ends['13L']);
    const r = runwayLabelPos(v, LHBP, ends['13R']);
    const tl = toScreen(v, ends['13L'].threshold);
    const tr = toScreen(v, ends['13R'].threshold);
    // 13L/31R is the north-east runway: its label shifts 9 pt north-east (along the runway normal, 042°), 13R's 9 pt the other way.
    const ne = screenDir(42);
    const proj = (p: { x: number; y: number }, o: { x: number; y: number }, d: { x: number; y: number }) => (p.x - o.x) * d.x + (p.y - o.y) * d.y;
    expect(proj(l, tl, ne)).toBeCloseTo(9);
    expect(proj(r, tr, ne)).toBeCloseTo(-9);
    // ...and 13 pt beyond the threshold on the approach side (312° for a 132° landing).
    expect(proj(l, tl, screenDir(312))).toBeCloseTo(13);
    expect(proj(r, tr, screenDir(312))).toBeCloseTo(13);
  });

  it('heading vector is one minute of flight, at least 14 pt', () => {
    const long = headingVector(plane({ speed: 240 }), vp(8), 1, 14); // 4 nm × 8 = 32 pt
    expect(long.x2 - 200).toBeCloseTo(32);
    const short = headingVector(plane({ speed: 240 }), vp(2), 1, 14); // 8 pt → clamped to 14
    expect(short.x2 - 200).toBeCloseTo(14);
  });

  it('trail: dots along the flown path, spaced max(5 pt, 0.45 nm), fading', () => {
    // Flew east along y = 0, history every 0.1 nm (oldest first).
    const trail = Array.from({ length: 40 }, (_, i) => ({ x: -4 + i * 0.1, y: 0 }));
    const dots = trailDots(plane({ heading: 90, trail }), vp(20), 5);
    expect(dots).toHaveLength(5);
    expect(dots[0].x).toBeCloseTo(200 - 9); // 0.45 nm × 20
    expect(dots[4].x).toBeCloseTo(200 - 45);
    expect(dots[0].opacity).toBeCloseTo(0.84);
    expect(dots[4].opacity).toBeCloseTo(0.2);
    expect(trailDots(plane({ trail }), vp(2), 5)[0].x).toBeCloseTo(195); // 5 pt minimum
  });

  it('trail follows a turn instead of the current heading', () => {
    // Came north up x = 0, then turned east; now at (1, 0) heading east.
    const trail = [{ x: 0, y: -2 }, { x: 0, y: -1 }, { x: 0, y: 0 }];
    const dots = trailDots(plane({ pos: { x: 1, y: 0 }, heading: 90, trail }), vp(20), 5);
    // 1 nm = 20 pt back to the corner (dots at 9 and 18 pt), then down the northbound leg.
    expect(dots[1].y).toBeCloseTo(200);
    expect(dots[2].x).toBeCloseTo(200);
    expect(dots[2].y).toBeGreaterThan(200); // south of the corner on screen
  });

  it('trail has fewer dots while the history is short, and alpha works for any count', () => {
    expect(trailDots(plane({ trail: [] }), vp(20), 5)).toHaveLength(0);
    expect(trailDots(plane({ trail: [{ x: -1, y: 0 }] }), vp(20), 5)).toHaveLength(2);
    expect(trailAlpha(0, 7)).toBeCloseTo(0.84);
    expect(trailAlpha(6, 7)).toBeCloseTo(0.2);
    expect(trailAlpha(3, 7)).toBeCloseTo(0.52);
  });

  it('trail copes with repeated history points (spawned or sampled in place)', () => {
    const at = { x: 0, y: 0 };
    const dots = trailDots(plane({ pos: at, trail: [at, at, at] }), vp(20), 5);
    expect(dots).toHaveLength(0);
    const mixed = trailDots(plane({ pos: at, trail: [{ x: -1, y: 0 }, at, at] }), vp(20), 5);
    expect(mixed.every((d) => Number.isFinite(d.x) && Number.isFinite(d.y))).toBe(true);
    expect(mixed).toHaveLength(2);
  });

  it('conflict ring is max(16 pt, 1.5 nm)', () => {
    expect(conflictRingRadius(vp(8), 1.5, 16)).toBe(16);
    expect(conflictRingRadius(vp(20), 1.5, 16)).toBe(30);
  });

  it('bracket path has four L-shaped corners', () => {
    const d = bracketPath(0, 0, 26, 5);
    expect(d.match(/M/g)).toHaveLength(4);
    expect(d).toContain('M-13,-8L-13,-13L-8,-13'); // top-left corner: 5 pt arms
    expect(d).toContain('M13,8L13,13L8,13'); // bottom-right corner
  });

  it('chevron tip is the end point', () => {
    const pts = chevron({ x: 0, y: 0 }, { x: 10, y: 0 }).split(' ').map((q) => q.split(',').map(Number));
    expect(pts[1]).toEqual([10, 0]);
    // Both arms point back from the tip, one either side.
    expect(pts[0][0]).toBeLessThan(10);
    expect(pts[2][0]).toBeLessThan(10);
    expect(Math.sign(pts[0][1])).toBe(-Math.sign(pts[2][1]));
  });

  it('pair tag shows distance and rounded vertical separation', () => {
    expect(pairTag(vp(8), { x: 0, y: 0 }, { x: 2.7, y: 0 }, 2.7, 420).text).toBe('2.7 NM · 400 FT');
    // Rounds down: a conflict never reads as the 3.0 nm / 1,000 ft minimum.
    expect(pairTag(vp(8), { x: 0, y: 0 }, { x: 1, y: 0 }, 2.97, 960).text).toBe('2.9 NM · 900 FT');
  });
});
