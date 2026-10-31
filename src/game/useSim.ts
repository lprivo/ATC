import { useCallback, useEffect, useRef, useState } from 'react';
import { Sim } from '../engine/sim';
import { generateRandomTraffic } from '../engine/traffic';
import type { Airport } from '../engine/types';

export const TIME_SCALES = [1, 2, 4, 8];
const RENDER_INTERVAL_MS = 1000 / 30;

function newSim(airport: Airport, seed: number) {
  const traffic = generateRandomTraffic(airport, { seed, durationSec: 3600, meanIntervalSec: 75 });
  return new Sim(airport, traffic);
}

/**
 * Owns the Sim instance and drives it from requestAnimationFrame. The sim is
 * mutated in place; `frame` bumps ~30x/s so React re-renders the radar.
 */
export function useSim(airport: Airport) {
  const simRef = useRef<Sim | null>(null);
  if (!simRef.current) simRef.current = newSim(airport, Math.floor(Math.random() * 1e9));
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const [timeScale, setTimeScale] = useState(2);

  const state = useRef({ paused, timeScale });
  state.current = { paused, timeScale };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastRender = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); // cap so a background tab doesn't jump
      last = now;
      if (!state.current.paused) simRef.current!.step(dt * state.current.timeScale);
      if (now - lastRender >= RENDER_INTERVAL_MS) {
        lastRender = now;
        setFrame((f) => f + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Dev hook so the sim can be inspected/driven from a browser console or test.
  if (__DEV__ && typeof window !== 'undefined') (window as any).__sim = simRef.current;

  const restart = useCallback(() => {
    simRef.current = newSim(airport, Math.floor(Math.random() * 1e9));
    setPaused(false);
  }, [airport]);

  const cycleTimeScale = useCallback(
    () => setTimeScale((s) => TIME_SCALES[(TIME_SCALES.indexOf(s) + 1) % TIME_SCALES.length]),
    [],
  );

  return { sim: simRef.current, frame, paused, setPaused, timeScale, cycleTimeScale, restart };
}
