import * as Haptics from 'expo-haptics';
import { HAPTIC_FOR, type HapticKind, type HapticMoment } from './hapticMap';

/**
 * Fires the design's haptic for a game moment. Never for ambient events (only
 * call it in response to the player). Off when the Haptics setting is off
 * (wired with Settings, #15). Failures (no hardware, web without vibration) are ignored.
 */
let enabled = true;
export const setHapticsEnabled = (on: boolean) => {
  enabled = on;
};

const run: Record<HapticKind, () => Promise<void>> = {
  impactLight: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  impactMedium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  impactRigid: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  selection: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

export function haptic(moment: HapticMoment) {
  if (!enabled) return;
  run[HAPTIC_FOR[moment]]().catch(() => {});
}
