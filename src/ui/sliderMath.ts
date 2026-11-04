// Slider maths (the volume sliders in Settings). Pure: no React Native imports.

/** A value 0–1 kept in range and on the step (0.05: 5 % steps). */
export function snap(v: number, step = SLIDER_STEP): number {
  const clamped = Math.min(1, Math.max(0, v));
  return Math.round(clamped / step) * step;
}

/** Where a touch at `x` (0 = the track's left end) puts the value, on a track `width` wide. */
export const valueAt = (x: number, width: number) => (width > 0 ? snap(x / width) : 0);

/** The value after VoiceOver's swipe up / down (10 % at a time). */
export const adjust = (v: number, action: 'increment' | 'decrement') => snap(v + (action === 'increment' ? 0.1 : -0.1));

/** As VoiceOver reads it: "70 percent". */
export const percent = (v: number) => Math.round(v * 100);

export const SLIDER_STEP = 0.05;
