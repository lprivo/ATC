import { describe, expect, it } from 'vitest';
import { frameClock, MAX_FRAME_SEC } from './frameClock';

describe('frameClock', () => {
  it('ticks every other frame for 30 fps on a 60 Hz display, even with jittery frames', () => {
    const tick = frameClock(1000 / 30);
    const frames = [16.5, 16.9, 16.4, 16.8, 16.6, 16.7, 16.2, 17.1];
    const ticks = frames.map(tick);
    expect(ticks.map((t) => t !== null)).toEqual([false, true, false, true, false, true, false, true]);
  });

  it('hands each tick all the time since the last one', () => {
    const tick = frameClock(1000 / 15);
    let total = 0;
    for (let i = 0; i < 120; i++) total += tick(1000 / 120) ?? 0; // one second at 120 Hz
    expect(total).toBeCloseTo(1, 1);
  });

  it('caps a long frame (a backgrounded tab), so the sim does not jump', () => {
    const tick = frameClock(1000 / 30);
    expect(tick(5000)).toBe(MAX_FRAME_SEC);
  });

  it('does not tick on every frame to catch up after a long one', () => {
    const tick = frameClock(1000 / 30);
    tick(5000);
    expect(tick(16.7)).toBeNull();
  });
});
