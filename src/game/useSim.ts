import { useCallback, useEffect, useRef, useState } from 'react';
import { randomSeed } from '../engine/rng';
import { Sim } from '../engine/sim';
import { generateRandomTraffic } from '../engine/traffic';
import type { Airport } from '../engine/types';
import { useFrameLoop } from '../ui/useFrameLoop';

export const TIME_SCALES = [1, 2, 4, 8];
const RENDER_INTERVAL_MS = 1000 / 30;

declare global {
  // Dev-only handle so the running sim can be inspected from a browser console or test.
  var __sim: Sim | undefined;
}

/** Traffic for a session: its traffic level over its length (or, for endless, topped up as it runs). */
export interface SimOptions {
  meanIntervalSec: number;
  durationSec: number;
  /** Keep generating traffic so the session never runs dry. */
  endless?: boolean;
}

/** Start from a prepared sim instead of fresh random traffic, optionally paused (stories, fixtures, the tutorial). */
export interface SimStart {
  sim: () => Sim;
  paused?: boolean;
  /**
   * Restart builds the prepared sim again (unpaused) instead of a fresh random
   * session (the tutorial plays its scene again). Without it, a restart starts
   * a random session, as from the menu.
   */
  restartFromStart?: boolean;
}

/** An endless session tops up when less than this much scheduled traffic is left (sim seconds). */
const TOP_UP_AHEAD_SEC = 600;

/** Tops up an endless session's traffic, one more horizon at a time, before it runs out. */
export function topUpTraffic(sim: Sim, opts: SimOptions, seed: number) {
  if (!opts.endless) return false;
  const last = sim.lastScheduledTime ?? sim.time;
  if (last - sim.time > TOP_UP_AHEAD_SEC) return false;
  const more = generateRandomTraffic(sim.airport, {
    seed,
    durationSec: opts.durationSec,
    meanIntervalSec: opts.meanIntervalSec,
    firstAtSec: 0,
    exclude: sim.callsignsInUse,
  });
  sim.appendTraffic(more.map((t) => ({ ...t, time: t.time + last + opts.meanIntervalSec })));
  return true;
}

function newSim(airport: Airport, opts: SimOptions, seed = randomSeed()) {
  const traffic = generateRandomTraffic(airport, { seed, durationSec: opts.durationSec, meanIntervalSec: opts.meanIntervalSec });
  return new Sim(airport, traffic);
}

/**
 * Owns the Sim instance and drives it from requestAnimationFrame (useFrameLoop).
 * The sim is mutated in place; ~30x/s it steps and a state bump re-renders the
 * screen while running.
 * While paused nothing re-renders on its own, so callers that change the sim
 * (dials, drawn routes) call `refresh()` afterwards.
 */
export function useSim(airport: Airport, opts: SimOptions, start?: SimStart) {
  const [sim, setSim] = useState(() => start?.sim() ?? newSim(airport, opts));
  const [, setFrame] = useState(0);
  const [paused, setPaused] = useState(start?.paused ?? false);
  const [timeScale, setTimeScale] = useState(1);
  /** Design: while a path is being drawn the sim runs at half speed. */
  const [drawing, setDrawing] = useState(false);
  /** The session is over: the sim stays frozen (without the pause menu) until a restart. */
  const [over, setOver] = useState(false);

  // The rAF loop reads these through a ref so it never needs restarting.
  const live = useRef({ sim, paused, over, timeScale, drawing, opts });
  live.current = { sim, paused, over, timeScale, drawing, opts };

  const refresh = useCallback(() => setFrame((f) => f + 1), []);

  useFrameLoop(
    (dt) => {
      const { sim, paused, over, timeScale, drawing, opts } = live.current;
      if (paused || over) return;
      sim.step(dt * timeScale * (drawing ? 0.5 : 1));
      topUpTraffic(sim, opts, randomSeed());
      refresh();
    },
    { everyMs: RENDER_INTERVAL_MS },
  );

  useEffect(() => {
    if (__DEV__) globalThis.__sim = sim;
  }, [sim]);

  // Reads the latest options (and start) through refs, so a restart always uses the current session:
  // a fresh random one, or the prepared start again when it asks for that (`restartFromStart`).
  const latestStart = useRef(start);
  latestStart.current = start;
  const restart = useCallback(() => {
    const s = latestStart.current;
    setSim(s?.restartFromStart ? s.sim() : newSim(airport, live.current.opts));
    setPaused(false);
    setOver(false);
  }, [airport]);
  const end = useCallback(() => {
    live.current.over = true; // stop stepping now, not at the next render
    setOver(true);
  }, []);

  return { sim, paused, setPaused, end, timeScale, setTimeScale, setDrawing, restart, refresh };
}
