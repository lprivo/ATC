import { describe, expect, it } from 'vitest';
import type { Plane } from '../engine/types';
import { hitTest, makeViewport, polylinePoints, tagLayout, toScreen, toWorld } from './viewport';

const at = (id: string, x: number, y: number) => ({ id, pos: { x, y } }) as Plane;

describe('viewport', () => {
  const vp = makeViewport(390, 500, 30); // 6.5 px per nm, limited by the width

  it('fits the sector into the shorter side, centred, north up', () => {
    expect(vp.scale).toBeCloseTo(6.5);
    expect(toScreen(vp, { x: 0, y: 0 })).toEqual({ x: 195, y: 250 });
    expect(toScreen(vp, { x: 0, y: 10 }).y).toBeCloseTo(185); // north is up
  });

  it('a zero-size layout (before the first measure) still gives a usable scale', () => {
    expect(makeViewport(0, 0, 30).scale).toBe(1);
    expect(Number.isFinite(toWorld(makeViewport(0, 0, 30), 10, 10).x)).toBe(true);
  });

  it('formats polyline points in screen space', () => {
    expect(polylinePoints(vp, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe('195.0,250.0 201.5,243.5');
  });

  it('screen and world conversions round-trip', () => {
    const w = toWorld(vp, 123, 456);
    const s = toScreen(vp, w);
    expect(s.x).toBeCloseTo(123);
    expect(s.y).toBeCloseTo(456);
  });

  it('tag layout scales with the font size', () => {
    const small = tagLayout(11);
    const big = tagLayout(16);
    expect(big.width).toBeGreaterThan(small.width);
    expect(big.height).toBeGreaterThan(small.height);
    expect(big.line2).toBeGreaterThan(big.line1);
    expect(big.line2).toBeLessThanOrEqual(big.height);
  });
});

describe('hitTest', () => {
  const vp = makeViewport(390, 500, 30);
  const tag = tagLayout(11);

  it('picks the nearest blip within the radius, or nothing', () => {
    const planes = [at('a', 0, 0), at('b', 0, -5)]; // b well clear of a's tag (tags sit up and right)
    const b = toScreen(vp, { x: 0, y: -5 });
    expect(hitTest(planes, vp, tag, b.x - 2, b.y + 2, 28)).toBe('b');
    expect(hitTest(planes, vp, tag, 10, 10, 28)).toBeNull();
  });

  it("a touch on a plane's data tag selects that plane even if another blip is closer", () => {
    const planes = [at('a', 0, 0), at('b', 6, 4)];
    const a = toScreen(vp, { x: 0, y: 0 });
    // Middle of a's tag.
    const x = a.x + tag.offsetX + tag.width / 2;
    const y = a.y + tag.offsetY + tag.height / 2;
    const b = toScreen(vp, { x: 6, y: 4 });
    expect(Math.hypot(b.x - x, b.y - y)).toBeLessThan(Math.hypot(a.x - x, a.y - y)); // b's blip is closer
    expect(hitTest(planes, vp, tag, x, y, 28)).toBe('a');
  });

  it('the tag sits up and to the right of the blip, at fixed pixel offsets for an 11 pt font', () => {
    const planes = [at('a', 0, 0)];
    const a = toScreen(vp, { x: 0, y: 0 });
    expect(tag).toMatchObject({ offsetX: 9, offsetY: -26, width: 78, height: 30 });
    expect(hitTest(planes, vp, tag, a.x + 60, a.y - 20, 28)).toBe('a'); // on the tag, beyond the 28 px radius
    expect(hitTest(planes, vp, tag, a.x - 40, a.y - 20, 28)).toBeNull(); // left of the blip, no tag there
  });
});
