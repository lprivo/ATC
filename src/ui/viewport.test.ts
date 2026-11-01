import { describe, expect, it } from 'vitest';
import type { Plane } from '../engine/types';
import {
  clampScale,
  defaultViewport,
  ensureVisible,
  hitTest,
  panBy,
  polylinePoints,
  resizeViewport,
  tagLayout,
  toggleRunwayZoom,
  toScreen,
  toWorld,
  zoomAt,
  ZOOM,
  type Viewport,
} from './viewport';

/** A camera with the airport centred, like the proof of concept's fixed fit. */
const centred = (w: number, h: number, scale: number): Viewport => ({ w, h, ox: w / 2, oy: h / 2, scale });

const at = (id: string, x: number, y: number) => ({ id, pos: { x, y } }) as Plane;

describe('viewport', () => {
  const vp = centred(390, 500, 6.5);

  it('places the airport at the origin, north up', () => {
    expect(toScreen(vp, { x: 0, y: 0 })).toEqual({ x: 195, y: 250 });
    expect(toScreen(vp, { x: 0, y: 10 }).y).toBeCloseTo(185); // north is up
  });

  it('default view: airport a little above centre at 8 pt/nm', () => {
    const d = defaultViewport(390, 844);
    expect(d.scale).toBe(ZOOM.sector);
    expect(d.ox).toBe(195);
    expect(d.oy).toBeCloseTo(400);
  });

  it('zoom is clamped to 5–48 pt/nm', () => {
    expect(clampScale(1)).toBe(5);
    expect(clampScale(100)).toBe(48);
    expect(defaultViewport(100, 100, 100).scale).toBe(48);
  });

  it('zoomAt keeps the world point under the focal point fixed', () => {
    const before = toWorld(vp, 300, 120);
    const z = zoomAt(vp, 20, 300, 120);
    expect(z.scale).toBe(20);
    const after = toWorld(z, 300, 120);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('zoomAt clamps the scale but still keeps the focal point', () => {
    const z = zoomAt(vp, 1000, 50, 60);
    expect(z.scale).toBe(48);
    expect(toWorld(z, 50, 60).x).toBeCloseTo(toWorld(vp, 50, 60).x);
  });

  it('panBy moves the origin', () => {
    expect(panBy(vp, 10, -5)).toMatchObject({ ox: 205, oy: 245, scale: 6.5 });
  });

  it('double-tap toggles between sector (8) and runway (26) zoom, re-centred', () => {
    const sector = defaultViewport(390, 844);
    const runway = toggleRunwayZoom(panBy(sector, 50, 50));
    expect(runway.scale).toBe(ZOOM.runway);
    expect(runway.ox).toBe(195);
    expect(toggleRunwayZoom(runway).scale).toBe(ZOOM.sector);
    expect(toggleRunwayZoom(zoomAt(sector, 40, 0, 0)).scale).toBe(ZOOM.sector);
  });

  it('resizing keeps the camera anchored on the screen centre', () => {
    const r = resizeViewport(vp, 410, 520);
    expect(r).toMatchObject({ w: 410, h: 520, ox: 205, oy: 260, scale: 6.5 });
    expect(resizeViewport(centred(0, 0, 8), 390, 844)).toEqual(defaultViewport(390, 844));
  });

  it('ensureVisible pans a point into the band between top and bottom', () => {
    const d = defaultViewport(390, 844);
    const low = { x: 0, y: -50 }; // 400 pt below the airport → off the bottom
    const v = ensureVisible(d, low, 120, 560);
    expect(toScreen(v, low).y).toBeCloseTo(560);
    expect(v.scale).toBe(d.scale);
    const high = { x: 0, y: 40 };
    expect(toScreen(ensureVisible(d, high, 120, 560), high).y).toBeCloseTo(120);
    const inside = { x: 0, y: 0 };
    expect(ensureVisible(d, inside, 120, 560)).toBe(d);
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
  const vp = centred(390, 500, 6.5);
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
