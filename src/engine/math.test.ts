import { describe, expect, it } from 'vitest';
import { trackOffsets } from './math';

describe('trackOffsets', () => {
  it('along is ahead of the origin, cross is positive to the right of the track', () => {
    // Track due north from the origin.
    const ahead = trackOffsets({ x: 0, y: 5 }, { x: 0, y: 0 }, 0);
    expect(ahead.along).toBeCloseTo(5);
    expect(ahead.cross).toBeCloseTo(0);
    const right = trackOffsets({ x: 2, y: 0 }, { x: 0, y: 0 }, 0);
    expect(right.cross).toBeCloseTo(2);
    expect(trackOffsets({ x: -2, y: 0 }, { x: 0, y: 0 }, 0).cross).toBeCloseTo(-2);
    // Track due east: north of it is left (negative), behind the origin is negative along.
    const p = trackOffsets({ x: -1, y: 3 }, { x: 0, y: 0 }, 90);
    expect(p.along).toBeCloseTo(-1);
    expect(p.cross).toBeCloseTo(-3);
  });
});
