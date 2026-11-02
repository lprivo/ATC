import { describe, expect, it } from 'vitest';
import { bestKey, bestLine, bestList, parseBests, recordScore, resolveResult, sessionFromKey } from './bestScores';

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

  it('a first score has to be above zero to be a best', () => {
    expect(recordScore({}, steady, -300, 1)).toMatchObject({ isNew: false, bests: {} });
    expect(recordScore({}, steady, 0, 1).isNew).toBe(false);
  });

  it('keys turn back into sessions; unknown keys are skipped', () => {
    expect(sessionFromKey(bestKey(steady))).toEqual(steady);
    expect(sessionFromKey('EGLL|busy|endless')).toEqual({ icao: 'EGLL', traffic: 'busy', length: 'endless' });
    expect(sessionFromKey('LHBP|rush|30')).toBeNull();
    expect(sessionFromKey('LHBP|steady|45')).toBeNull();
    expect(bestList({ 'LHBP|steady|30': { score: 5, at: 1 }, junk: { score: 9, at: 1 } }).map((b) => b.key)).toEqual(['LHBP|steady|30']);
  });

  it('a timed session quit early is never saved, even above the best; an endless quit is', () => {
    const one = recordScore({}, steady, 640, 1).bests;
    const early = resolveResult(one, steady, 900, true, 2);
    expect(early).toMatchObject({ isNewBest: false, counted: false, previousBest: { score: 640, at: 1 } });
    expect(early.bests).toBe(one);
    expect(resolveResult(one, steady, 900, false, 2)).toMatchObject({ isNewBest: true, counted: true });
    const endless = { ...steady, length: 'endless' as const };
    expect(resolveResult({}, endless, 300, true, 2)).toMatchObject({ isNewBest: true, counted: true, bests: { [bestKey(endless)]: { score: 300, at: 2 } } });
  });

  it('bests are kept per airport, traffic and length', () => {
    const a = recordScore({}, steady, 640, 1).bests;
    expect(recordScore(a, { ...steady, length: 60 }, 100, 2).isNew).toBe(true);
  });

  it('menu line names the overall best; list is highest first', () => {
    let b = recordScore({}, steady, 1240, 1).bests;
    b = recordScore(b, { ...steady, traffic: 'busy', length: 'endless' }, 300, 2).bests;
    expect(bestLine(b)).toEqual({ score: '1,240', where: ' at LHBP, Steady, 30 min' });
    expect(bestLine({})).toBeNull();
    expect(bestList(b).map((x) => x.score)).toEqual([1240, 300]);
  });

  it('broken storage reads as no bests; bad entries are dropped', () => {
    expect(parseBests('nope')).toEqual({});
    expect(parseBests(JSON.stringify({ a: { score: 1, at: 2 }, b: { score: 'x' } }))).toEqual({ a: { score: 1, at: 2 } });
  });
});
