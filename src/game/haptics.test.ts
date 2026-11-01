import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  impactAsync: (s: string) => (calls.push(`impact:${s}`), Promise.resolve()),
  selectionAsync: () => (calls.push('selection'), Promise.resolve()),
  notificationAsync: (t: string) => (calls.push(`notification:${t}`), Promise.resolve()),
}));

const { haptic, setHapticsEnabled } = await import('./haptics');

describe('haptic()', () => {
  beforeEach(() => {
    calls.length = 0;
    setHapticsEnabled(true);
  });

  it('calls the expo-haptics function the design table names', () => {
    haptic('select');
    haptic('step');
    haptic('drawStart');
    haptic('snap');
    haptic('landingConfirmed');
    haptic('conflict');
    expect(calls).toEqual(['impact:light', 'selection', 'impact:medium', 'impact:rigid', 'notification:success', 'notification:warning']);
  });

  it('does nothing when haptics are switched off', () => {
    setHapticsEnabled(false);
    haptic('select');
    expect(calls).toEqual([]);
  });

  it('ignores failures (no hardware, web without vibration)', async () => {
    const mod = await import('expo-haptics');
    const spy = vi.spyOn(mod, 'selectionAsync').mockRejectedValueOnce(new Error('unavailable'));
    // The rejection is caught (an unhandled one would fail the run).
    haptic('step');
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
