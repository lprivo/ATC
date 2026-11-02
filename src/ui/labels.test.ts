import { describe, expect, it } from 'vitest';
import type { Plane, RunwayEnd } from '../engine/types';
import {
  compactLabels,
  EASE_MS,
  easeRect,
  labelSize,
  labelSpec,
  needsPlacement,
  nextSlots,
  onScreen,
  overlap,
  PLACE_EVERY_MS,
  placeLabels,
  slotOffset,
  textWidth,
  type LabelItem,
} from './labels';

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

  it('no target is shown for the 0 ft glide target on final', () => {
    const s = labelSpec(plane({ altitude: 1000, target: { heading: 0, altitude: 0, speed: 150 } }), ctx);
    expect(texts(s.lines[1])).toEqual(['010↓', '250']);
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

  it('keeps clear of the way ahead when another slot is free', () => {
    // Heading north-east (045): the NE slot is in front of the plane.
    const [p] = placeLabels([item('a', 200, 400, { heading: 45 })], { near: 12, far: 30, safe });
    const ne = p.rect.x > 200 && p.rect.y + p.rect.h < 400;
    expect(ne).toBe(false);
  });

  it('never covers the tail when another slot is free', () => {
    // The tail is a line 32 pt straight back from the symbol; no label box may cross it.
    for (const heading of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const back = { x: -Math.sin((heading * Math.PI) / 180), y: Math.cos((heading * Math.PI) / 180) }; // screen, y down
      const tail = [6, 32].map((d) => ({ x: 200 + back.x * d, y: 400 + back.y * d }));
      const [p] = placeLabels([item('a', 200, 400, { heading, tail })], { near: 12, far: 30, safe });
      for (let d = 6; d <= 32; d += 1) {
        const x = 200 + back.x * d;
        const y = 400 + back.y * d;
        const inside = x > p.rect.x && x < p.rect.x + p.rect.w && y > p.rect.y && y < p.rect.y + p.rect.h;
        expect(inside, `heading ${heading}, ${d} pt back`).toBe(false);
      }
    }
  });

  it('keeps clear of a tail that bends after a turn', () => {
    // Heading north now, but it just turned from flying west: the tail runs south 6 pt, then east 36 pt.
    const tail = [{ x: 200, y: 406 }, { x: 200, y: 412 }, { x: 236, y: 412 }];
    const [p] = placeLabels([item('a', 200, 400, { heading: 0, tail })], { near: 12, far: 30, safe });
    const tailPts = [...Array.from({ length: 7 }, (_, i) => ({ x: 200, y: 406 + i })), ...Array.from({ length: 37 }, (_, i) => ({ x: 200 + i, y: 412 }))];
    for (const q of tailPts) {
      const inside = q.x > p.rect.x && q.x < p.rect.x + p.rect.w && q.y > p.rect.y && q.y < p.rect.y + p.rect.h;
      expect(inside, `${q.x},${q.y}`).toBe(false);
    }
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
    // ...and b takes the preferred north-east near slot.
    expect(out[0].rect.x).toBeGreaterThan(236);
    expect(out[0].rect.y + out[0].rect.h).toBeLessThan(400);
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
    expect(a.leader).not.toBeNull();
    expect(Math.hypot(a.leader!.x1 - 200, a.leader!.y1 - 400)).toBeCloseTo(8);
    // The box sits on the far ring: its nearest point is ~30 pt from the symbol.
    const nx = Math.max(a.rect.x, Math.min(200, a.rect.x + a.rect.w));
    const ny = Math.max(a.rect.y, Math.min(400, a.rect.y + a.rect.h));
    expect(Math.hypot(nx - 200, ny - 400)).toBeGreaterThan(20);
  });

  it('easeRect moves from the old slot to the new one', () => {
    const from = { x: 0, y: 0, w: 10, h: 10 };
    const to = { x: 100, y: 50, w: 12, h: 10 };
    expect(easeRect(from, to, 0)).toMatchObject({ x: 0, y: 0, w: 12 });
    expect(easeRect(from, to, 1)).toMatchObject({ x: 100, y: 50 });
    expect(easeRect(from, to, 0.5).x).toBeGreaterThan(50); // ease-out
  });
});

describe('label timing', () => {
  const r = (x: number) => ({ x, y: 0, w: 10, h: 10 });

  it('re-places at 2 Hz, or at once when the content changes', () => {
    expect(needsPlacement('k', 'k', 1000, 1000 + PLACE_EVERY_MS - 1)).toBe(false);
    expect(needsPlacement('k', 'k', 1000, 1000 + PLACE_EVERY_MS)).toBe(true);
    expect(needsPlacement('k', 'k2', 1000, 1001)).toBe(true);
  });

  it('a moved label eases from where it is drawn; new planes snap; gone planes are dropped', () => {
    const prev = nextSlots(new Map(), new Map([['a', r(0)], ['gone', r(5)]]), 0, true);
    expect(slotOffset(prev.get('a')!, 0).x).toBe(0); // new: snaps
    const next = nextSlots(prev, new Map([['a', r(100)], ['b', r(50)]]), 1000, true);
    expect(next.has('gone')).toBe(false);
    expect(slotOffset(next.get('b')!, 1000).x).toBe(50);
    expect(slotOffset(next.get('a')!, 1000).x).toBe(0);
    expect(slotOffset(next.get('a')!, 1000 + EASE_MS / 2).x).toBeGreaterThan(50);
    expect(slotOffset(next.get('a')!, 1000 + EASE_MS).x).toBe(100);
  });

  it('when not animating (paused), moves snap so no label is left mid-ease', () => {
    const prev = nextSlots(new Map(), new Map([['a', r(0)]]), 0, true);
    const next = nextSlots(prev, new Map([['a', r(100)]]), 1000, false);
    expect(slotOffset(next.get('a')!, 1000).x).toBe(100);
  });

  it('turning animation off mid-ease jumps the label to its target', () => {
    const prev = nextSlots(new Map(), new Map([['a', r(0)]]), 0, true);
    const moving = nextSlots(prev, new Map([['a', r(100)]]), 1000, true).get('a')!;
    expect(slotOffset(moving, 1000 + EASE_MS / 3).x).toBeLessThan(100);
    expect(slotOffset(moving, 1000 + EASE_MS / 3, false).x).toBe(100);
  });

  it('only planes on or near the screen get labels', () => {
    expect(onScreen(-29, 10, 390, 700)).toBe(true);
    expect(onScreen(-31, 10, 390, 700)).toBe(false);
    expect(onScreen(200, 731, 390, 700)).toBe(false);
  });
});
