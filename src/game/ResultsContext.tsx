import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SimStats } from '../engine/types';
import { kv } from '../storage/kv';
import { score } from '../engine/scoring';
import { parseBests, recordScore, type Best, type BestScores } from './bestScores';
import type { Session } from './session';

const KEY = 'bests.v1';

/** A finished session, as the summary shows it. */
export interface SessionResult {
  session: Session;
  stats: SimStats;
  score: number;
  isNewBest: boolean;
  previousBest: Best | null;
}

interface ResultsCtx {
  bests: BestScores;
  /** The last finished session, for the summary screen. */
  last: SessionResult | null;
  /** Records a finished session (best scores are saved on the device) and returns its result. */
  finish: (session: Session, stats: SimStats) => SessionResult;
}

const Ctx = createContext<ResultsCtx | null>(null);

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [bests, setBests] = useState<BestScores>(() => parseBests(kv.get(KEY)));
  const [last, setLast] = useState<SessionResult | null>(null);
  const value = useMemo<ResultsCtx>(
    () => ({
      bests,
      last,
      finish: (session, stats) => {
        const total = score(stats);
        const r = recordScore(bests, session, total, Date.now());
        if (r.isNew) {
          setBests(r.bests);
          kv.set(KEY, JSON.stringify(r.bests));
        }
        const result = { session, stats: { ...stats }, score: total, isNewBest: r.isNew, previousBest: r.previous };
        setLast(result);
        return result;
      },
    }),
    [bests, last],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResults() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResults must be used inside ResultsProvider');
  return ctx;
}
