import { describe, expect, it } from 'vitest';
import { score, scoreLines, SCORING } from './scoring';

describe('scoring', () => {
  it('adds up landings and subtracts losses, go-arounds and exits', () => {
    const stats = { landed: 10, separationViolations: 1, goArounds: 2, exited: 1 };
    expect(score(stats)).toBe(10 * SCORING.landed + SCORING.separationLoss + 2 * SCORING.goAround + SCORING.exit);
    expect(score(stats)).toBe(800 - 150 - 50 - 50);
  });

  it('breakdown lines carry count, per-item value and total', () => {
    const lines = scoreLines({ landed: 3, separationViolations: 0, goArounds: 1, exited: 0 });
    expect(lines[0]).toEqual({ key: 'landed', count: 3, each: 80, total: 240 });
    expect(lines[2]).toEqual({ key: 'goAround', count: 1, each: -25, total: -25 });
  });

  it('an empty session scores 0', () => {
    expect(score({ landed: 0, separationViolations: 0, goArounds: 0, exited: 0 })).toBe(0);
  });
});
