import { describe, expect, it } from 'vitest';
import { isDoubleTap, isTap, isTrackpadPinch, pinchOf, wheelDeltaPx, wheelZoomFactor } from './gestures';

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
    // Boundaries are inclusive: 300 ms and 30 pt still count.
    expect(isDoubleTap(prev, 1300, { x: 130, y: 100 })).toBe(true);
    expect(isDoubleTap(prev, 1301, { x: 100, y: 100 })).toBe(false);
  });

  it('pinch distance and midpoint', () => {
    expect(pinchOf({ x: 0, y: 0 }, { x: 30, y: 40 })).toEqual({ dist: 50, mid: { x: 15, y: 20 } });
  });

  it('wheel down zooms out, wheel up zooms in', () => {
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(0)).toBe(1);
  });

  it('wheel deltas in lines or pages are converted to pixels', () => {
    expect(wheelDeltaPx({ deltaY: 3, deltaMode: 1 })).toBe(48);
    expect(wheelDeltaPx({ deltaY: 1, deltaMode: 2 })).toBe(800);
    expect(wheelDeltaPx({ deltaY: 53, deltaMode: 0 })).toBe(53);
  });
});

describe('Safari gesture events', () => {
  it('zooms for a macOS trackpad pinch (it carries the pointer position)', () => {
    expect(isTrackpadPinch({ scale: 1.2, clientX: 100, clientY: 200 })).toBe(true);
  });
  it('ignores iOS touch-pinch gesture events (no position; the touch pinch handles them)', () => {
    expect(isTrackpadPinch({ scale: 1.2 })).toBe(false);
    expect(isTrackpadPinch({ scale: 1.2, clientX: undefined, clientY: undefined })).toBe(false);
  });
  it('ignores events without a scale', () => {
    expect(isTrackpadPinch({ clientX: 1, clientY: 2 })).toBe(false);
  });
});
