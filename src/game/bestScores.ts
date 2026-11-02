// Best scores per airport and session type, kept on the device. Pure: storage
// is passed in as JSON strings so this can be tested.
import { countsForBest, LENGTHS, lengthLabel, TRAFFIC_LABEL, type Session, type SessionLength, type Traffic } from './session';

export interface Best {
  score: number;
  /** When it was set (ms since epoch). */
  at: number;
}

export type BestScores = Readonly<Record<string, Best>>;

/** One best per airport + traffic + length: "LHBP|steady|30". */
export const bestKey = (s: Session) => `${s.icao}|${s.traffic}|${s.length}`;

/** The session a key stands for, or null for a key this version doesn't understand. */
export function sessionFromKey(key: string): Session | null {
  const [icao, traffic, length] = key.split('|');
  const t = (Object.keys(TRAFFIC_LABEL) as Traffic[]).find((x) => x === traffic);
  const n = length === 'endless' ? 'endless' : Number(length);
  const l = LENGTHS.find((x): x is SessionLength => x === n);
  return icao && t && l !== undefined ? { icao, traffic: t, length: l } : null;
}

export function parseBests(json: string | null): BestScores {
  if (!json) return {};
  try {
    const raw = JSON.parse(json) as unknown;
    if (typeof raw !== 'object' || raw === null) return {};
    const out: Record<string, Best> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const b = v as Partial<Best> | null;
      if (b && typeof b.score === 'number' && typeof b.at === 'number') out[k] = { score: b.score, at: b.at };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Records a finished session's score. Returns the updated table, the previous
 * best for that session type (if any) and whether this is a new best. A first
 * score has to be above zero to count as a best.
 */
export function recordScore(bests: BestScores, s: Session, score: number, at: number) {
  const key = bestKey(s);
  const previous = bests[key];
  const isNew = score > (previous?.score ?? 0);
  return { bests: isNew ? { ...bests, [key]: { score, at } } : bests, previous: previous ?? null, isNew };
}

/**
 * A finished session's result: its score against the bests. A timed session
 * quit early is shown but never saved as a best, however high it scored.
 */
export function resolveResult(bests: BestScores, session: Session, score: number, endedEarly: boolean, at: number) {
  const counted = countsForBest(session.length, endedEarly);
  const r = recordScore(bests, session, score, at);
  const isNewBest = counted && r.isNew;
  return { bests: isNewBest ? r.bests : bests, isNewBest, previousBest: r.previous, counted };
}

/** The menu line for the highest best of all, e.g. "Best · 1,240 at LHBP, Steady, 30 min". */
export function bestLine(bests: BestScores): string | null {
  const top = bestList(bests)[0];
  if (!top) return null;
  const s = top.session;
  return `Best · ${top.score.toLocaleString('en-GB')} at ${s.icao}, ${TRAFFIC_LABEL[s.traffic]}, ${lengthLabel(s.length)}`;
}

/** All bests, highest first, for the Best scores screen. */
export function bestList(bests: BestScores) {
  return Object.entries(bests)
    .flatMap(([key, b]) => {
      const session = sessionFromKey(key);
      return session ? [{ key, session, ...b }] : [];
    })
    .sort((a, b) => b.score - a.score);
}
