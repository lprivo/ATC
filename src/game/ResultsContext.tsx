import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SimStats } from '../engine/types';
import { kv } from '../storage/kv';
import { memoryKv } from '../storage/memory';
import type { KV } from '../storage/types';
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
 * Best scores (saved in `storage`, the device by default) and the last
 * finished session. `initialBests` / `initialLast` (stories, tests) start
 * from those instead, and unless a `storage` is given too, new bests go to an
 * in-memory store: starting values never reach the device.
 */
export function ResultsProvider({
  children,
  initialBests,
  initialLast = null,
  storage: given,
}: {
  children: ReactNode;
  initialBests?: BestScores;
  initialLast?: SessionResult | null;
  storage?: KV;
}) {
  const [storage] = useState<KV>(() => given ?? (initialBests || initialLast ? memoryKv() : kv));
  const [bests, setBests] = useState<BestScores>(() => initialBests ?? parseBests(storage.get(KEY)));
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
          storage.set(KEY, JSON.stringify(r.bests));
        }
        setLast({ session, stats: { ...stats }, score: total, isNewBest: r.isNewBest, previousBest: r.previousBest, endedEarly, counted: r.counted });
      },
    }),
    [bests, last, storage],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useResults() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResults must be used inside ResultsProvider');
  return ctx;
}
