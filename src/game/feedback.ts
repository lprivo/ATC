import { playSound } from './audio';
import type { HapticMoment } from './hapticMap';
import { haptic } from './haptics';

/** A player action's feedback: its haptic and its sound (each off with its own setting). */
export function feedback(moment: HapticMoment) {
  haptic(moment);
  playSound(moment);
}
