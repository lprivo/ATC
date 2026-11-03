// The timing behind useFrameLoop, pure so it is unit tested.

/** Longest step one display frame may contribute, so a backgrounded tab or a hitch doesn't jump the sim ahead. */
export const MAX_FRAME_SEC = 0.1;

/**
 * Turns display frames into ticks at most every `everyMs`. Feed it each
 * frame's length; it returns the (capped) seconds since the last tick when
 * it's time for one, else null. The time past a tick carries over (up to half
 * a tick; none after a long frame, so it isn't followed by a catch-up tick), so at 60 Hz a 30 fps loop ticks every other frame rather
 * than slipping to every third on timer jitter.
 */
export function frameClock(everyMs: number) {
  let acc = 0;
  let sinceTick = 0;
  return (frameMs: number): number | null => {
    acc += Math.min(MAX_FRAME_SEC, frameMs / 1000);
    sinceTick += frameMs;
    // A little slack: two 16.67 ms frames make a 33.3 ms tick even when the timestamps jitter.
    if (sinceTick < everyMs - 1) return null;
    // Carry a jitter's worth over; after a frame longer than a whole tick, start afresh.
    sinceTick = frameMs >= everyMs ? 0 : Math.min(Math.max(0, sinceTick - everyMs), everyMs / 2);
    const dt = acc;
    acc = 0;
    return dt;
  };
}
