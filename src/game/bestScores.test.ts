import { describe, expect, it } from 'vitest';
import { bestKey, bestLine, bestList, parseBests, recordScore } from './bestScores';

const steady = { icao: 'LHBP', traffic: 'steady' as const, length: 30 as const };

describe('best scores', () => {
  it('a first score is a new best with no previous', () => {
    const r = recordScore({}, steady, 640, 1);
    expect(r.isNew).toBe(true);
    expect(r.previous).toBeNull();
    expect(r.bests[bestKey(steady)]).toEqual({ score: 640, at: 1 });
  });

  it('a higher score replaces the best; a lower or equal one keeps it', () => {
    const one = recordScore({}, steady, 640, 1).bests;
    const better = recordScore(one, steady, 900, 2);
    expect(better.isNew).toBe(true);
    expect(better.previous).toEqual({ score: 640, at: 1 });
    const worse = recordScore(better.bests, steady, 500, 3);
    expect(worse.isNew).toBe(false);
    expect(worse.bests).toBe(better.bests);
    expect(recordScore(better.bests, steady, 900, 4).isNew).toBe(false);
  });

  it('bests are kept per airport, traffic and length', () => {
    const a = recordScore({}, steady, 640, 1).bests;
    expect(recordScore(a, { ...steady, length: 60 }, 100, 2).isNew).toBe(true);
  });

  it('menu line names the overall best; list is highest first', () => {
    let b = recordScore({}, steady, 1240, 1).bests;
    b = recordScore(b, { ...steady, traffic: 'busy', length: 'endless' }, 300, 2).bests;
    expect(bestLine(b)).toBe('Best · 1,240 at LHBP, Steady, 30 min');
    expect(bestLine({})).toBeNull();
    expect(bestList(b).map((x) => x.score)).toEqual([1240, 300]);
  });

  it('broken storage reads as no bests; bad entries are dropped', () => {
    expect(parseBests('nope')).toEqual({});
    expect(parseBests(JSON.stringify({ a: { score: 1, at: 2 }, b: { score: 'x' } }))).toEqual({ a: { score: 1, at: 2 } });
  });
});
