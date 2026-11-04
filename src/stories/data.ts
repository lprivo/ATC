// Sample data shared by stories: best scores and finished-session results.
import { bestKey, type BestScores } from '../game/bestScores';
import type { SessionResult } from '../game/ResultsContext';
import { FREE_SESSION } from '../game/session';
import { score } from '../engine/scoring';
import type { SimStats } from '../engine/types';

const AT = Date.UTC(2026, 10, 1, 18, 30);

export const SOME_BESTS: BestScores = {
  [bestKey(FREE_SESSION)]: { score: 1240, at: AT },
  [bestKey({ icao: 'LHBP', traffic: 'busy', length: 60 })]: { score: 2310, at: AT - 86400000 },
  [bestKey({ icao: 'LHBP', traffic: 'light', length: 'endless' })]: { score: 880, at: AT - 3 * 86400000 },
};

const stats = (s: Partial<SimStats>): SimStats => ({ landed: 0, exited: 0, goArounds: 0, separationViolations: 0, ...s });

const result = (s: Partial<SimStats>, more: Partial<SessionResult> = {}): SessionResult => {
  const st = stats(s);
  return { session: FREE_SESSION, stats: st, score: score(st), isNewBest: false, previousBest: null, endedEarly: false, counted: true, ...more };
};

export const RESULTS = {
  firstEver: result({ landed: 12, goArounds: 1 }, { isNewBest: true }),
  newBest: result({ landed: 18, goArounds: 1, exited: 1 }, { isNewBest: true, previousBest: { score: 1240, at: AT } }),
  belowBest: result({ landed: 9, separationViolations: 2, goArounds: 2 }, { previousBest: { score: 1240, at: AT } }),
  endedEarly: result({ landed: 3 }, { endedEarly: true, counted: false, previousBest: { score: 1240, at: AT } }),
  endless: result({ landed: 41, separationViolations: 1, goArounds: 3, exited: 2 }, { session: { ...FREE_SESSION, length: 'endless' }, isNewBest: true }),
};
