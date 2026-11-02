import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { airportByIcao } from '../engine/airports';
import type { SimStats } from '../engine/types';
import { LHBP } from '../engine/airports/lhbp';
import { FREE_SESSION, lengthSec, meanIntervalSec, trafficHorizonSec, type Session } from './session';
import { useTheme } from '../theme/ThemeContext';
import { ConfirmCard } from '../ui/ConfirmCard';
import { ConflictBanner } from '../ui/ConflictBanner';
import { DRAW } from '../ui/drawing';
import { HUD_EDGE, HUD_GAP, TOP_BAR_HEIGHT } from '../ui/hudLayout';
import { PauseMenu } from '../ui/PauseMenu';
import { BottomSheet } from '../ui/BottomSheet';
import { Radar } from '../ui/Radar';
import { Toasts } from '../ui/Toasts';
import { TopBar } from '../ui/TopBar';
import { haptic } from './haptics';
import { LABEL_SCALE } from '../theme/themes';
import { useSettings } from './SettingsContext';
import { useHud } from './useHud';
import { usePendingLanding } from './usePendingLanding';
import { useSim } from './useSim';

export function GameScreen({
  session = FREE_SESSION,
  onQuit,
  onSessionEnd,
}: {
  session?: Session;
  onQuit?: () => void;
  /** A timed session reached its length (endless sessions never end on their own). */
  onSessionEnd?: (stats: SimStats) => void;
} = {}) {
  const airport = airportByIcao(session.icao) ?? LHBP;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sim, paused, setPaused, timeScale, setTimeScale, setDrawing, restart, refresh } = useSim(airport, {
    meanIntervalSec: meanIntervalSec(session.traffic),
    durationSec: trafficHorizonSec(session.length),
    endless: session.length === 'endless',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { settings } = useSettings();
  const { toasts, banner } = useHud(sim, { paused, timeScale, setTimeScale, refresh, distUnit: settings.distUnit, altUnit: settings.altUnit });
  // Design height until the banner has measured itself, so its first frame doesn't overlap the toasts.
  const [bannerHeight, setBannerHeight] = useState(56);
  const [sheetHeight, setSheetHeight] = useState(0);
  const landing = usePendingLanding(sim);
  /** Selecting a plane (by tap, label or the banner's SELECT) gives a light tap. */
  const select = (id: string | null, opts?: { silent?: boolean }) => {
    if (id && id !== selectedId && !opts?.silent) haptic('select');
    setSelectedId(id);
  };

  // A timed session ends at its length: stop the sim and hand over the final stats (once).
  const endAt = lengthSec(session.length);
  const ended = useRef(false);
  useEffect(() => {
    if (ended.current || endAt == null || sim.time < endAt) return;
    ended.current = true;
    setPaused(true);
    onSessionEnd?.({ ...sim.stats });
  });
  useEffect(() => {
    ended.current = false;
  }, [sim]);

  // Android back opens the pause menu (and closes it again) instead of leaving a live game.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPaused((p) => !p);
      return true;
    });
    return () => sub.remove();
  }, [setPaused]);

  const onRestart = () => {
    // Clear the selection with the restart: plane ids start again at "1" in the new sim.
    setSelectedId(null);
    restart();
  };

  const top = insets.top + 3; // design: top bar at y = 50 with a 47 safe area
  const hudBottom = top + TOP_BAR_HEIGHT + HUD_GAP;
  const toastTop = hudBottom + (banner ? bannerHeight + HUD_GAP : 0);
  const side = { left: HUD_EDGE, right: HUD_EDGE };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* While paused, hide the game from TalkBack (accessibilityViewIsModal on the overlay is iOS-only). */}
      <View style={styles.radarArea} importantForAccessibility={paused ? 'no-hide-descendants' : 'auto'}>
        <Radar
          sim={sim}
          selectedId={selectedId}
          onSelect={select}
          onCommand={refresh}
          paused={paused}
          insets={{ top: toastTop, bottom: sheetHeight }}
          labelMode={settings.labelMode}
          labelScale={LABEL_SCALE[settings.labelSize]}
          handedness={settings.handedness}
          units={{ dist: settings.distUnit, alt: settings.altUnit }}
          onLanding={landing.land}
          onDrawing={setDrawing}
        />
        {/* The pause menu replaces the HUD (its own header shows the session and score). */}
        {!paused && (
          <>
          <View style={[styles.hud, side, { top }]} pointerEvents="box-none">
            <TopBar sim={sim} paused={paused} onTogglePause={() => setPaused((p) => !p)} />
          </View>
          {banner && (
            <View style={[styles.hud, side, { top: hudBottom }]} pointerEvents="box-none">
              <ConflictBanner banner={banner} onSelect={select} onHeight={setBannerHeight} />
            </View>
          )}
          <View style={[styles.hud, side, { top: toastTop }]} pointerEvents="none">
            <Toasts toasts={toasts} />
          </View>
          </>
        )}
        {landing.pending && landing.plane && (
          <View style={[styles.hud, side, { bottom: sheetHeight + HUD_GAP }]} pointerEvents="box-none">
            <ConfirmCard
              key={landing.pending.seq}
              callsign={landing.plane.callsign}
              runway={landing.pending.runway}
              swapTo={landing.swapTo}
              durationMs={DRAW.confirmMs}
              paused={paused}
              onSwap={() => {
                landing.swap();
                refresh();
              }}
              onConfirm={() => {
                haptic('landingConfirmed');
                landing.done();
              }}
            />
          </View>
        )}
        <BottomSheet
          sim={sim}
          selectedId={selectedId}
          onClose={() => setSelectedId(null)}
          onCommand={refresh}
          timeScale={timeScale}
          onTimeScale={setTimeScale}
          bottomInset={insets.bottom}
          altUnit={settings.altUnit}
          handedness={settings.handedness}
          onHeight={setSheetHeight}
        />
      </View>
      {paused && (
        <PauseMenu sim={sim} sessionSec={lengthSec(session.length) ?? undefined} topInset={insets.top} bottomInset={insets.bottom} onResume={() => setPaused(false)} onRestart={onRestart} onQuit={onQuit} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  radarArea: { flex: 1 },
  hud: { position: 'absolute' },
});
