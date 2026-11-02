// Best scores per airport and session type, kept on the device. Pure: storage
// is passed in as JSON strings so this can be tested.
import { lengthLabel, TRAFFIC_LABEL, type Session } from './session';

export interface Best {
  score: number;
  /** When it was set (ms since epoch). */
  at: number;
}

export type BestScores = Readonly<Record<string, Best>>;

/** One best per airport + traffic + length: "LHBP|steady|30". */
export const bestKey = (s: Session) => `${s.icao}|${s.traffic}|${s.length}`;

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
 * best for that session type (if any) and whether this is a new best.
 */
export function recordScore(bests: BestScores, s: Session, score: number, at: number) {
  const key = bestKey(s);
  const previous = bests[key];
  const isNew = !previous || score > previous.score;
  return { bests: isNew ? { ...bests, [key]: { score, at } } : bests, previous: previous ?? null, isNew };
}

/** The menu line for the highest best of all, e.g. "Best · 1,240 at LHBP, Steady, 30 min". */
export function bestLine(bests: BestScores): string | null {
  let top: [string, Best] | null = null;
  for (const e of Object.entries(bests)) if (!top || e[1].score > top[1].score) top = e;
  if (!top) return null;
  const [icao, traffic, length] = top[0].split('|');
  const tl = TRAFFIC_LABEL[traffic as keyof typeof TRAFFIC_LABEL] ?? traffic;
  const len = length === 'endless' ? lengthLabel('endless') : lengthLabel(Number(length) as 15 | 30 | 60);
  return `Best · ${top[1].score.toLocaleString('en-GB')} at ${icao}, ${tl}, ${len}`;
}

/** All bests, highest first, for the Best scores screen. */
export function bestList(bests: BestScores) {
  return Object.entries(bests)
    .map(([key, b]) => {
      const [icao, traffic, length] = key.split('|');
      return { key, icao, traffic, length, ...b };
    })
    .sort((a, b) => b.score - a.score);
}
