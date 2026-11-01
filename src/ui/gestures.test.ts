import { describe, expect, it } from 'vitest';
import { isDoubleTap, isTap, pinchOf, wheelZoomFactor } from './gestures';

describe('radar gestures', () => {
  it('a tap is under 6 pt of movement and under 300 ms', () => {
    expect(isTap(2, 120)).toBe(true);
    expect(isTap(6, 120)).toBe(false);
    expect(isTap(2, 300)).toBe(false);
  });

  it('a double-tap needs a previous tap close in time and space', () => {
    const prev = { t: 1000, at: { x: 100, y: 100 } };
    expect(isDoubleTap(null, 1100, { x: 100, y: 100 })).toBe(false);
    expect(isDoubleTap(prev, 1250, { x: 110, y: 105 })).toBe(true);
    expect(isDoubleTap(prev, 1400, { x: 100, y: 100 })).toBe(false);
    expect(isDoubleTap(prev, 1100, { x: 200, y: 100 })).toBe(false);
  });

  it('pinch distance and midpoint', () => {
    expect(pinchOf({ x: 0, y: 0 }, { x: 30, y: 40 })).toEqual({ dist: 50, mid: { x: 15, y: 20 } });
  });

  it('wheel down zooms out, wheel up zooms in', () => {
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(0)).toBe(1);
  });
});
