import { describe, expect, it } from 'vitest';
import { coachShape, holePath, PLANE_SPOT_R } from './coachGeometry';
import type { Viewport } from './viewport';

// Airport at (200, 400), 10 pt per nm; screen y grows downwards (north is up).
const vp: Viewport = { w: 400, h: 800, ox: 200, oy: 400, scale: 10 };
const runway = { x: 0, y: 0 };
const sheetHeight = 120;

describe('coachShape', () => {
  it('T1: a ringed circle round the plane', () => {
    expect(coachShape('plane', vp, { plane: { x: -10, y: 5 }, runway, sheetHeight })).toEqual({ kind: 'hole', cx: 100, cy: 350, rx: PLANE_SPOT_R, ry: PLANE_SPOT_R, ring: true });
  });

  it('T1: nothing while the plane is gone', () => {
    expect(coachShape('plane', vp, { plane: null, runway, sheetHeight })).toBeNull();
  });

  it('T2: scrim over the radar above the sheet', () => {
    expect(coachShape('sheet', vp, { plane: null, runway, sheetHeight })).toEqual({ kind: 'aboveSheet', bottom: 120 });
  });

  it('T3: an ellipse round both the plane and the runway end, with a margin', () => {
    expect(coachShape('route', vp, { plane: { x: -10, y: 5 }, runway, sheetHeight })).toEqual({ kind: 'hole', cx: 150, cy: 375, rx: 120, ry: 95, ring: false });
  });

  it('T4: two finger hints either side of the airport', () => {
    expect(coachShape('pinch', vp, { plane: null, runway, sheetHeight })).toEqual({
      kind: 'pinch',
      points: [
        { x: 123, y: 330 },
        { x: 277, y: 470 },
      ],
    });
  });
});

describe('holePath', () => {
  it('outlines the screen, then the ellipse as two arcs', () => {
    expect(holePath(400, 800, { cx: 100, cy: 350, rx: 46, ry: 46 })).toBe('M0 0H400V800H0Z M54 350a46 46 0 1 0 92 0a46 46 0 1 0 -92 0Z');
  });
});
