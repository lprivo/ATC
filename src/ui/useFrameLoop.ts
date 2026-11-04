import { useEffect, useRef } from 'react';
import { frameClock } from './frameClock';

/**
 * Drives `onTick` from requestAnimationFrame while `running`: about once
 * every `everyMs`, with the (capped) real seconds since the last tick
 * (frameClock). The callers step their sim and re-render in it, so a screen
 * that draws at 15 or 30 fps also only steps that often, whatever the
 * display's refresh rate.
 * `onTick` is read through a ref, so passing a new function doesn't restart
 * the loop.
 */
export function useFrameLoop(onTick: (dtSec: number) => void, { running = true, everyMs }: { running?: boolean; everyMs: number }) {
  const tick = useRef(onTick);
  tick.current = onTick;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const clock = frameClock(everyMs);
    const loop = (now: number) => {
      const dt = clock(now - last);
      last = now;
      if (dt !== null) tick.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, everyMs]);
}
