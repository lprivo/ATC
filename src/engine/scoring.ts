import type { SimStats } from './types';

/**
 * Points per outcome, as plain data (placeholder values from the design; could
 * later come from a backend).
 */
export const SCORING = {
  landed: 80,
  separationLoss: -150,
  goAround: -25,
  exit: -50,
} as const;

export interface ScoreLine {
  key: keyof typeof SCORING;
  count: number;
  /** Points per item. */
  each: number;
  total: number;
}

/** The score breakdown for a session's stats. */
export function scoreLines(s: SimStats): ScoreLine[] {
  const line = (key: keyof typeof SCORING, count: number): ScoreLine => ({ key, count, each: SCORING[key], total: count * SCORING[key] });
  return [line('landed', s.landed), line('separationLoss', s.separationViolations), line('goAround', s.goArounds), line('exit', s.exited)];
}

/** Total score for a session's stats. */
export const score = (s: SimStats) => scoreLines(s).reduce((sum, l) => sum + l.total, 0);
