import { describe, expect, it } from 'vitest';
import { adjust, percent, snap, valueAt } from './sliderMath';

describe('slider', () => {
  it('keeps values between 0 and 1, in 5 % steps', () => {
    expect(snap(-0.3)).toBe(0);
    expect(snap(1.4)).toBe(1);
    expect(snap(0.62)).toBeCloseTo(0.6);
    expect(snap(0.63)).toBeCloseTo(0.65);
  });

  it('a touch along the track sets the value; off either end, the end', () => {
    expect(valueAt(150, 300)).toBeCloseTo(0.5);
    expect(valueAt(-20, 300)).toBe(0);
    expect(valueAt(320, 300)).toBe(1);
    expect(valueAt(10, 0)).toBe(0);
  });

  it('VoiceOver adjusts by 10 % and reads a percentage', () => {
    expect(adjust(0.5, 'increment')).toBeCloseTo(0.6);
    expect(adjust(0.05, 'decrement')).toBe(0);
    expect(adjust(1, 'increment')).toBe(1);
    expect(percent(0.65)).toBe(65);
  });
});
