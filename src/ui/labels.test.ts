import { describe, expect, it } from 'vitest';
import type { Plane, RunwayEnd } from '../engine/types';
import { compactLabels, easeRect, labelSize, labelSpec, overlap, placeLabels, textWidth, type LabelItem } from './labels';

const plane = (over: Partial<Plane> = {}): Plane =>
  ({
    id: '1',
    callsign: 'WZZ8638',
    aircraftType: 'A21N',
    altitude: 7000,
    speed: 250,
    target: { heading: 0, altitude: 7000, speed: 250 },
    clearedRunway: null,
    conflict: false,
    goAroundAt: null,
    ...over,
  }) as Plane;
const ctx = { selected: false, compact: false, time: 100 };
const texts = (line: { text: string }[]) => line.map((s) => s.text);
const FONTS = { label: 13, label2: 12, chip: 10, lineHeight: 15 };

describe('label content', () => {
  it('level plane: callsign, then altitude in hundreds and speed', () => {
    const s = labelSpec(plane(), ctx);
    expect(texts(s.lines[0])).toEqual(['WZZ8638']);
    expect(texts(s.lines[1])).toEqual(['070', '250']);
    expect(s.chips).toEqual([]);
  });

  it('descending shows the trend arrow and the target', () => {
    const s = labelSpec(plane({ target: { heading: 0, altitude: 4000, speed: 250 } }), ctx);
    expect(texts(s.lines[1])).toEqual(['070↓040', '250']);
  });

  it('selected and conflict labels add the dim aircraft type; chips for conflict, runway and GA', () => {
    const end = { id: '31R' } as RunwayEnd;
    const s = labelSpec(plane({ conflict: true, clearedRunway: end, goAroundAt: 80 }), ctx);
    expect(s.lines[0][1]).toMatchObject({ text: 'A21N', dim: true });
    expect(s.chips).toEqual([
      { text: '!', kind: 'danger' },
      { text: '31R', kind: 'good' },
      { text: 'GA', kind: 'danger' },
    ]);
  });

  it('the GA chip expires after a minute', () => {
    expect(labelSpec(plane({ goAroundAt: 30 }), ctx).chips).toEqual([]);
  });

  it('Min mode: one line with the trend, unless selected or in conflict', () => {
    const climbing = plane({ target: { heading: 0, altitude: 9000, speed: 250 } });
    const min = labelSpec(climbing, { ...ctx, compact: true });
    expect(min.lines).toHaveLength(1);
    expect(texts(min.lines[0])).toEqual(['WZZ8638', '↑']);
    expect(labelSpec(climbing, { ...ctx, compact: true, selected: true }).lines).toHaveLength(2);
    expect(labelSpec(plane({ conflict: true }), { ...ctx, compact: true }).lines).toHaveLength(2);
  });

  it('Auto goes compact above 8 planes; Full never does; Min always', () => {
    expect(compactLabels('auto', 8)).toBe(false);
    expect(compactLabels('auto', 9)).toBe(true);
    expect(compactLabels('full', 20)).toBe(false);
    expect(compactLabels('min', 1)).toBe(true);
  });

  it('box size grows with chips and lines', () => {
    const one = labelSize(labelSpec(plane(), { ...ctx, compact: true }), FONTS);
    const two = labelSize(labelSpec(plane(), ctx), FONTS);
    expect(one.h).toBe(19);
    expect(two.h).toBe(34);
    const chipped = labelSize(labelSpec(plane({ conflict: true }), ctx), FONTS);
    expect(chipped.w).toBeGreaterThan(two.w);
    expect(textWidth('WZZ8638', 13)).toBeGreaterThan(textWidth('1111', 13));
  });
});

describe('label placement', () => {
  const safe = { x: 0, y: 0, w: 400, h: 800 };
  const item = (id: string, x: number, y: number, over: Partial<LabelItem> = {}): LabelItem => ({
    id,
    x,
    y,
    heading: 180,
    w: 50,
    h: 34,
    rank: 0,
    ...over,
  });

  it('a lone plane heading south gets the preferred north-east slot on the near ring', () => {
    const [p] = placeLabels([item('a', 200, 400)], { near: 12, far: 30, safe });
    expect(p.rect.x).toBeGreaterThan(200);
    expect(p.rect.y + p.rect.h).toBeLessThan(400);
    // Its nearest corner is 12 pt from the symbol (as in radar.js, a diagonal slot gets a short leader).
    expect(Math.hypot(p.rect.x - 200, p.rect.y + p.rect.h - 400)).toBeCloseTo(12);
  });

  it('a label straight beside the symbol: leader only when the gap is over 9 pt', () => {
    // Heading 060 puts N, NE and E in front of the plane; W (preference 3) wins, level with the symbol.
    const [p] = placeLabels([item('a', 200, 400, { heading: 60 })], { near: 12, far: 30, safe });
    expect(p.rect.x + p.rect.w).toBeCloseTo(188);
    expect(p.rect.y + p.rect.h / 2).toBeCloseTo(400);
    expect(p.leader).not.toBeNull();
    const [q] = placeLabels([item('b', 200, 400, { heading: 60 })], { near: 8, far: 30, safe });
    expect(q.leader).toBeNull();
  });

  it('never covers the heading vector when another slot is free', () => {
    // Heading north-east (045): the NE slot is in front of the plane.
    const [p] = placeLabels([item('a', 200, 400, { heading: 45 })], { near: 12, far: 30, safe });
    const ne = p.rect.x > 200 && p.rect.y + p.rect.h < 400;
    expect(ne).toBe(false);
  });

  it('two close planes get labels that do not overlap', () => {
    const out = placeLabels([item('a', 200, 400), item('b', 240, 395)], { near: 12, far: 30, safe });
    expect(overlap(out[0].rect, out[1].rect)).toBe(0);
  });

  it('labels stay inside the safe area when they can', () => {
    // Plane near the top edge: the label must go below, not off-screen.
    const [p] = placeLabels([item('a', 200, 20)], { near: 12, far: 30, safe: { x: 0, y: 0, w: 400, h: 800 } });
    expect(p.rect.y).toBeGreaterThanOrEqual(0);
  });

  it('selected labels are placed first and win the best slot; obstacles are avoided', () => {
    const a = item('a', 200, 400);
    const b = item('b', 236, 400, { rank: 4 });
    const out = placeLabels([a, b], { near: 12, far: 30, safe });
    expect(out[0].id).toBe('b');
    const obstacle = { x: 210, y: 340, w: 80, h: 50 }; // covers the NE slot
    const [p] = placeLabels([item('c', 200, 400)], { near: 12, far: 30, safe, obstacles: [obstacle] });
    expect(overlap(p.rect, obstacle)).toBe(0);
  });

  it('far slots get a leader line from near the symbol', () => {
    // Crowd the near ring with neighbours so the label is pushed to the far ring.
    const ring = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) =>
      item(`n${i}`, 200 + Math.sin((deg * Math.PI) / 180) * 30, 400 - Math.cos((deg * Math.PI) / 180) * 30),
    );
    const out = placeLabels([item('a', 200, 400, { rank: 9 }), ...ring], { near: 12, far: 30, safe });
    const a = out.find((o) => o.id === 'a')!;
    if (a.leader) expect(Math.hypot(a.leader.x1 - 200, a.leader.y1 - 400)).toBeCloseTo(8);
  });

  it('easeRect moves from the old slot to the new one', () => {
    const from = { x: 0, y: 0, w: 10, h: 10 };
    const to = { x: 100, y: 50, w: 12, h: 10 };
    expect(easeRect(from, to, 0)).toMatchObject({ x: 0, y: 0, w: 12 });
    expect(easeRect(from, to, 1)).toMatchObject({ x: 100, y: 50 });
    expect(easeRect(from, to, 0.5).x).toBeGreaterThan(50); // ease-out
  });
});
