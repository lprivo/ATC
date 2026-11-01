import { useCallback, useEffect, useRef, useState } from 'react';
import { Sim } from '../engine/sim';
import { generateRandomTraffic } from '../engine/traffic';
import type { Airport } from '../engine/types';

export const TIME_SCALES = [1, 2, 4, 8];
const RENDER_INTERVAL_MS = 1000 / 30;

declare global {
  // Dev-only handle so the running sim can be inspected from a browser console or test.
  var __sim: Sim | undefined;
}

function newSim(airport: Airport, seed = Math.floor(Math.random() * 1e9)) {
  const traffic = generateRandomTraffic(airport, { seed, durationSec: 3600, meanIntervalSec: 75 });
  return new Sim(airport, traffic);
}

/**
 * Owns the Sim instance and drives it from requestAnimationFrame. The sim is
 * mutated in place; a state bump ~30x/s re-renders the screen while running.
 * While paused nothing re-renders on its own, so callers that change the sim
 * (dials, drawn routes) call `refresh()` afterwards.
 */
export function useSim(airport: Airport) {
  const [sim, setSim] = useState(() => newSim(airport));
  const [, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  /** Design: while a path is being drawn the sim runs at half speed. */
  const [drawing, setDrawing] = useState(false);

  // The rAF loop reads these through a ref so it never needs restarting.
  const live = useRef({ sim, paused, timeScale, drawing });
  live.current = { sim, paused, timeScale, drawing };

  const refresh = useCallback(() => setFrame((f) => f + 1), []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastRender = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); // cap so a background tab doesn't jump
      last = now;
      const { sim, paused, timeScale, drawing } = live.current;
      if (!paused) {
        sim.step(dt * timeScale * (drawing ? 0.5 : 1));
        if (now - lastRender >= RENDER_INTERVAL_MS) {
          lastRender = now;
          refresh();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [refresh]);

  useEffect(() => {
    if (__DEV__) globalThis.__sim = sim;
  }, [sim]);

  const restart = useCallback(() => {
    setSim(newSim(airport));
    setPaused(false);
  }, [airport]);

  return { sim, paused, setPaused, timeScale, setTimeScale, setDrawing, restart, refresh };
}
