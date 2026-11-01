import { useEffect, useRef } from 'react';
import type { Sim } from '../engine/sim';
import { haptic } from './haptics';
import { conflictBanner, conflictSetKey, hasNewConflict, nextToastExpiry, pairKey, stepToastState, type ToastState } from './hud';

/**
 * HUD state for the game screen: event toasts (per sim, so a restart starts
 * clean in the same render), the conflict banner, and the design rule that a
 * new conflict drops the sim to ×1.
 */
export function useHud(sim: Sim, opts: { paused: boolean; timeScale: number; setTimeScale: (s: number) => void; refresh: () => void }) {
  const { paused, timeScale, setTimeScale, refresh } = opts;

  const toastState = useRef<ToastState>({ owner: sim, toasts: [], lastSeq: 0 });
  toastState.current = stepToastState(toastState.current, sim, sim.events, Date.now());
  const toasts = toastState.current.toasts;

  // Paused: nothing re-renders on its own, so wake up when the oldest toast is due to expire.
  const expiry = nextToastExpiry(toasts);
  useEffect(() => {
    if (!paused || expiry == null) return;
    const t = setTimeout(refresh, Math.max(0, expiry - Date.now()));
    return () => clearTimeout(t);
  }, [paused, expiry, refresh]);

  // A new conflict pair drops the sim to ×1. Runs only when the set of pairs (or the sim) changes.
  const known = useRef({ sim, pairs: new Set<string>() });
  const setKey = conflictSetKey(sim.conflicts);
  useEffect(() => {
    if (known.current.sim !== sim) known.current = { sim, pairs: new Set() };
    if (hasNewConflict(known.current.pairs, sim.conflicts)) {
      haptic('conflict');
      if (timeScale !== 1) setTimeScale(1);
    }
    known.current.pairs = new Set(sim.conflicts.map(pairKey));
    // timeScale is read, not reacted to: changing speed must not re-run the check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, setKey]);

  return { toasts, banner: conflictBanner(sim) };
}
