import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SimStats } from '../engine/types';
import { kv } from '../storage/kv';
import { score } from '../engine/scoring';
import { parseBests, resolveResult, type Best, type BestScores } from './bestScores';
import type { Session } from './session';

const KEY = 'bests.v1';

/** A finished session, as the summary shows it. */
export interface SessionResult {
  session: Session;
  stats: SimStats;
  score: number;
  isNewBest: boolean;
  previousBest: Best | null;
  /** The player quit before the session's length. */
  endedEarly: boolean;
  /** Whether it counted towards best scores (a timed session quit early doesn't). */
  counted: boolean;
}

interface ResultsCtx {
  bests: BestScores;
  /** The last finished session, for the summary screen. */
  last: SessionResult | null;
  /** Records a finished session for the summary; best scores are saved on the device. */
  finish: (session: Session, stats: SimStats, endedEarly: boolean) => void;
}

const Ctx = createContext<ResultsCtx | null>(null);

/**
 * Best scores (saved on the device) and the last finished session. With
 * `initialBests` / `initialLast` (stories, tests) it starts from those instead
 * and never reads or writes the device.
 */
export function ResultsProvider({ children, initialBests, initialLast = null }: { children: ReactNode; initialBests?: BestScores; initialLast?: SessionResult | null }) {
  const persist = initialBests === undefined;
  const [bests, setBests] = useState<BestScores>(() => (persist ? parseBests(kv.get(KEY)) : initialBests));
  const [last, setLast] = useState<SessionResult | null>(initialLast);
  // finish reads the latest table through a ref, never a stale closure.
  const bestsRef = useRef(bests);
  const value = useMemo<ResultsCtx>(
    () => ({
      bests,
      last,
      finish: (session, stats, endedEarly) => {
        const total = score(stats);
        const r = resolveResult(bestsRef.current, session, total, endedEarly, Date.now());
        if (r.isNewBest) {
          bestsRef.current = r.bests;
          setBests(r.bests);
          if (persist) kv.set(KEY, JSON.stringify(r.bests));
        }
        setLast({ session, stats: { ...stats }, score: total, isNewBest: r.isNewBest, previousBest: r.previousBest, endedEarly, counted: r.counted });
      },
    }),
    [bests, last, persist],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResults() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResults must be used inside ResultsProvider');
  return ctx;
}
