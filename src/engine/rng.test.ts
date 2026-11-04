import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('rng', () => {
  it('is reproducible per seed and stays in range', () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 100; i++) {
      const n = a.int(3, 5);
      expect(n).toBe(b.int(3, 5));
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('pick refuses an empty list rather than returning undefined', () => {
    expect(() => createRng(1).pick([])).toThrow('empty');
  });
});
