import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import type { Plane } from '../engine/types';
import {
  bracketPath,
  centreline,
  chevron,
  conflictRingRadius,
  pairTag,
  ringLabels,
  runwayLabelPos,
  runwayWidth,
  screenDir,
  planeTail,
  type TailPiece,
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

  const TAIL = { minutes: 1, minPt: 14, startPt: 6, pieces: 8, width: 2, widthEnd: 0.75 };
  const tailLength = (pieces: TailPiece[]) =>
    pieces.reduce((sum, pc) => sum + pc.points.slice(1).reduce((t, q, i) => t + Math.hypot(q.x - pc.points[i].x, q.y - pc.points[i].y), 0), 0);
  // Flew east along y = 0 for 6 nm, history every 0.1 nm (oldest first); now at (0, 0).
  const eastbound = Array.from({ length: 60 }, (_, i) => ({ x: -6 + i * 0.1, y: 0 }));

  it('tail is one minute of flight at the current speed: twice as fast, twice as long', () => {
    const fast = planeTail(plane({ speed: 240, trail: eastbound }), vp(8), TAIL); // 4 nm × 8 = 32 pt
    const slow = planeTail(plane({ speed: 120, trail: eastbound }), vp(8), TAIL); // 16 pt
    expect(tailLength(fast) + TAIL.startPt).toBeCloseTo(32, 6);
    expect(tailLength(slow) + TAIL.startPt).toBeCloseTo(16, 6);
  });

  it('tail is behind the plane, not in front', () => {
    const pieces = planeTail(plane({ heading: 90, trail: eastbound }), vp(8), TAIL);
    const pts = pieces.flatMap((pc) => pc.points);
    expect(pts.every((q) => q.x <= 200 - TAIL.startPt + 1e-6 && Math.abs(q.y - 200) < 1e-6)).toBe(true);
  });

  it('tail is at least 14 pt, so a slow plane at low zoom still shows one', () => {
    expect(tailLength(planeTail(plane({ speed: 140, trail: eastbound }), vp(2), TAIL)) + TAIL.startPt).toBeCloseTo(14, 6);
  });

  it('tail follows a turn instead of the current heading', () => {
    // Came north up x = 0, then turned east; now at (1, 0) heading east, 240 kt at 8 pt/nm = 32 pt of tail.
    const trail = [{ x: 0, y: -4 }, { x: 0, y: -2 }, { x: 0, y: 0 }];
    const pts = planeTail(plane({ pos: { x: 1, y: 0 }, heading: 90, trail }), vp(8), TAIL).flatMap((pc) => pc.points);
    const far = pts[pts.length - 1];
    expect(far.x).toBeCloseTo(200); // round the corner (8 pt back)...
    expect(far.y).toBeCloseTo(200 + 24); // ...and 24 pt down the northbound leg
  });

  it('tail carries on straight back where the history is too short (just spawned)', () => {
    const none = planeTail(plane({ heading: 90, trail: [] }), vp(8), TAIL).flatMap((pc) => pc.points);
    expect(none[none.length - 1]).toEqual({ x: 200 - 32, y: 200 });
    // One step of history from the south-west (flying north-east): the extension continues that line, not the heading.
    const one = planeTail(plane({ heading: 90, trail: [{ x: -0.5, y: -0.5 }] }), vp(8), TAIL).flatMap((pc) => pc.points);
    const end = one[one.length - 1];
    expect(end.x).toBeLessThan(200); // west...
    expect(end.y).toBeGreaterThan(200); // ...and south (screen y down)
    expect(end.x - 200).toBeCloseTo(-(end.y - 200)); // along the diagonal
    expect(Math.hypot(end.x - 200, end.y - 200)).toBeCloseTo(32, 6);
  });

  it('tail fades and narrows away from the plane, in gap-free pieces', () => {
    const pieces = planeTail(plane({ trail: eastbound }), vp(8), TAIL);
    expect(pieces).toHaveLength(8);
    expect(pieces[0].opacity).toBeCloseTo(0.9);
    expect(pieces[7].opacity).toBeCloseTo(0.1);
    expect(pieces[0].width).toBeCloseTo(2);
    expect(pieces[7].width).toBeCloseTo(0.75);
    for (let i = 1; i < pieces.length; i++) {
      expect(pieces[i].opacity).toBeLessThan(pieces[i - 1].opacity);
      expect(pieces[i].points[0].x).toBeCloseTo(pieces[i - 1].points[pieces[i - 1].points.length - 1].x, 6);
    }
    expect(pieces[0].points[0].x).toBeCloseTo(200 - TAIL.startPt, 6);
  });

  it('tail copes with repeated history points (spawned or sampled in place)', () => {
    const at = { x: 0, y: 0 };
    const pieces = planeTail(plane({ pos: at, trail: [at, { x: -1, y: 0 }, at, at] }), vp(8), TAIL);
    expect(pieces.flatMap((pc) => pc.points).every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true);
    expect(tailLength(pieces) + TAIL.startPt).toBeCloseTo(32, 6);
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
    // Metric settings: km floored, metres floored to 10 (never the ~5.5 km / 305 m limits).
    expect(pairTag(vp(8), { x: 0, y: 0 }, { x: 1, y: 0 }, 2.97, 999, 10, { dist: 'km', alt: 'm' }).text).toBe('5.5 KM · 300 M');
    // Its chip is centred under the pair's midpoint, 26 pt down, and sized to the text.
    const t = pairTag(vp(8), { x: 0, y: 0 }, { x: 2, y: 0 }, 2, 0, 10);
    expect(t.rect.x + t.rect.w / 2).toBeCloseTo(208);
    expect(t.rect.y).toBeCloseTo(200 + 26 - 7);
    expect(t.rect.h).toBe(14);
    expect(t.rect.w).toBeGreaterThan(40);
  });
});
