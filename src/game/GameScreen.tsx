import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { airportByIcao } from '../engine/airports';
import type { Sim } from '../engine/sim';
import type { SimStats } from '../engine/types';
import { LHBP } from '../engine/airports/lhbp';
import { FREE_SESSION, lengthSec, meanIntervalSec, sessionOver, trafficHorizonSec, type Session } from './session';
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
import { usePreventPageZoom } from '../ui/useWebZoom';
import type { Viewport } from '../ui/viewport';
import { haptic } from './haptics';
import { LABEL_SCALE } from '../theme/themes';
import { useSettings } from './SettingsContext';
import { sessionClock } from './hud';
import { useHud } from './useHud';
import { usePendingLanding } from './usePendingLanding';
import { useSim, type SimStart } from './useSim';

/** What an overlay drawn over the game (the tutorial's coach marks) can see. */
export interface CoachState {
  sim: Sim;
  selectedId: string | null;
  /** The radar camera as drawn (null until it has laid out). */
  vp: Viewport | null;
  /** Height of the bottom sheet, measured. */
  sheetHeight: number;
  /** Starts the session again (from the prepared start, if there is one). */
  restart: () => void;
  /** Clears the selection (closes the plane's controls). */
  deselect: () => void;
}

export function GameScreen({
  session = FREE_SESSION,
  onQuit,
  onSessionEnd,
  start,
  coach,
}: {
  session?: Session;
  onQuit?: () => void;
  /**
   * The session is over: it reached its length, or the player quit
   * (`endedEarly`). Without it, Quit just calls `onQuit`.
   */
  onSessionEnd?: (stats: SimStats, endedEarly: boolean) => void;
  /** Start from a prepared state instead of a fresh random session (stories): the sim, paused or not, and a selected plane. */
  start?: SimStart & { selectedCallsign?: string };
  /** Drawn over the game (not while paused), e.g. the tutorial's coach marks; touches pass through it unless it handles them. */
  coach?: (state: CoachState) => ReactNode;
} = {}) {
  const airport = airportByIcao(session.icao) ?? LHBP;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sim, paused, setPaused, end, timeScale, setTimeScale, setDrawing, restart, refresh } = useSim(airport, {
    meanIntervalSec: meanIntervalSec(session.traffic),
    durationSec: trafficHorizonSec(session.length),
    endless: session.length === 'endless',
  }, start);
  const [selectedId, setSelectedId] = useState<string | null>(() => sim.planes.find((p) => p.callsign === start?.selectedCallsign)?.id ?? null);
  const { settings } = useSettings();
  const { toasts, banner } = useHud(sim, { paused, timeScale, setTimeScale, refresh, distUnit: settings.distUnit, altUnit: settings.altUnit });
  // Design height until the banner has measured itself, so its first frame doesn't overlap the toasts.
  const [bannerHeight, setBannerHeight] = useState(56);
  const [sheetHeight, setSheetHeight] = useState(0);
  // Only tracked for an overlay: the radar reports every camera change.
  const [vp, setVp] = useState<Viewport | null>(null);
  const landing = usePendingLanding(sim);
  usePreventPageZoom();
  const sessionSec = lengthSec(session.length);
  // Arrivals still to come; an endless session's traffic never runs out.
  const toCome = sessionSec == null ? null : sim.remainingTraffic;
  // Screen readers hear the last minute begin, once per session. (Kept here, not in the top
  // bar, which unmounts while paused and would announce again on every resume.)
  const lastMinute = sessionClock(sim.time, sessionSec).lastMinute;
  const announcedLastMinute = useRef(false);
  useEffect(() => {
    if (lastMinute && !announcedLastMinute.current) AccessibilityInfo.announceForAccessibility('One minute left');
    announcedLastMinute.current = lastMinute;
  }, [lastMinute]);
  /** Selecting a plane (by tap, label or the banner's SELECT) gives a light tap. */
  const select = (id: string | null, opts?: { silent?: boolean }) => {
    if (id && id !== selectedId && !opts?.silent) haptic('select');
    setSelectedId(id);
  };

  // A session ends at its length or on Quit: freeze the sim and hand over the final stats (once).
  const ended = useRef(false);
  const endSession = (endedEarly: boolean) => {
    if (ended.current || !onSessionEnd) return;
    ended.current = true;
    end();
    onSessionEnd({ ...sim.stats }, endedEarly);
  };
  useEffect(() => {
    if (sessionOver(session.length, sim.time)) endSession(false);
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
          onViewport={coach ? setVp : undefined}
        />
        {/* The pause menu replaces the HUD (its own header shows the session and score). */}
        {!paused && (
          <>
          <View style={[styles.hud, side, { top }]} pointerEvents="box-none">
            <TopBar sim={sim} paused={paused} onTogglePause={() => setPaused((p) => !p)} sessionSec={sessionSec} toCome={toCome} />
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
          toCome={toCome}
        />
        {coach && !paused && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {coach({ sim, selectedId, vp: vp && vp.w > 0 ? vp : null, sheetHeight, restart: onRestart, deselect: () => setSelectedId(null) })}
          </View>
        )}
      </View>
      {paused && (
        <PauseMenu sim={sim} sessionSec={sessionSec} topInset={insets.top} bottomInset={insets.bottom} onResume={() => setPaused(false)} onRestart={onRestart} onQuit={onSessionEnd ? () => endSession(true) : onQuit}
          quitLabel={onSessionEnd ? 'End session' : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Web: no browser pinch-zoom anywhere on the game screen (the radar has its own); panning inside scroll views still works.
  screen: { flex: 1, ...Platform.select({ web: { touchAction: 'pan-x pan-y' as const }, default: {} }) },
  radarArea: { flex: 1 },
  hud: { position: 'absolute' },
});
