import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LHBP } from '../engine/airports/lhbp';
import { useTheme } from '../theme/ThemeContext';
import type { Vec2 } from '../engine/types';
import { ConfirmCard } from '../ui/ConfirmCard';
import { ConflictBanner } from '../ui/ConflictBanner';
import { DRAW, parallelEnd } from '../ui/drawing';
import { HUD_EDGE, HUD_GAP, TOP_BAR_HEIGHT } from '../ui/hudLayout';
import { PauseOverlay } from '../ui/PauseOverlay';
import { BottomSheet } from '../ui/BottomSheet';
import { Radar } from '../ui/Radar';
import { Toasts } from '../ui/Toasts';
import { TopBar } from '../ui/TopBar';
import { haptic } from './haptics';
import { useHud } from './useHud';
import { useSim } from './useSim';

export function GameScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sim, paused, setPaused, timeScale, setTimeScale, setDrawing, restart, refresh } = useSim(LHBP);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toasts, banner } = useHud(sim, { paused, timeScale, setTimeScale, refresh });
  // Design height until the banner has measured itself, so its first frame doesn't overlap the toasts.
  const [bannerHeight, setBannerHeight] = useState(56);
  const [sheetHeight, setSheetHeight] = useState(0);
  // A path that snapped to a runway, waiting on the confirm card (Swap or ✓; auto-confirms).
  const [pending, setPending] = useState<{ planeId: string; points: Vec2[]; runway: string } | null>(null);
  const onLanding = (planeId: string, points: Vec2[], runway: string) => {
    sim.setRoute(planeId, points, runway);
    setPending({ planeId, points, runway });
  };
  const swap = () => {
    if (!pending) return;
    const other = parallelEnd(sim.airport, pending.runway);
    if (!other) return;
    sim.setRoute(pending.planeId, pending.points, other.id);
    setPending({ ...pending, runway: other.id });
    refresh();
  };
  const pendingPlane = pending ? sim.plane(pending.planeId) : undefined;
  /** Selecting a plane (by tap, label or the banner's SELECT) gives a light tap. */
  const select = (id: string | null) => {
    if (id && id !== selectedId) haptic('select');
    setSelectedId(id);
  };

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
      <StatusBar style={theme.statusBar} />
      {/* While paused, hide the game from TalkBack (accessibilityViewIsModal on the overlay is iOS-only). */}
      <View style={styles.radarArea} importantForAccessibility={paused ? 'no-hide-descendants' : 'auto'}>
        <Radar
          sim={sim}
          selectedId={selectedId}
          onSelect={select}
          onCommand={refresh}
          paused={paused}
          insets={{ top: toastTop, bottom: sheetHeight }}
          onLanding={onLanding}
          onDrawing={setDrawing}
        />
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
        {pending && pendingPlane && (
          <View style={[styles.hud, side, { bottom: sheetHeight + HUD_GAP }]} pointerEvents="box-none">
            <ConfirmCard
              key={pending.planeId}
              callsign={pendingPlane.callsign}
              runway={pending.runway}
              swapTo={parallelEnd(sim.airport, pending.runway)?.id ?? null}
              durationMs={DRAW.confirmMs}
              onSwap={swap}
              onConfirm={() => {
                haptic('landingConfirmed');
                setPending(null);
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
          onHeight={setSheetHeight}
        />
      </View>
      {paused && (
        <PauseOverlay sim={sim} onResume={() => setPaused(false)} onRestart={onRestart} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  radarArea: { flex: 1 },
  hud: { position: 'absolute' },
});
