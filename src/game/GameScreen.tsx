import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LHBP } from '../engine/airports/lhbp';
import { useTheme } from '../theme/ThemeContext';
import { BANNER_HEIGHT, ConflictBanner } from '../ui/ConflictBanner';
import { PauseOverlay } from '../ui/PauseOverlay';
import { PlanePanel } from '../ui/PlanePanel';
import { Radar } from '../ui/Radar';
import { Toasts } from '../ui/Toasts';
import { TOP_BAR_HEIGHT, TopBar } from '../ui/TopBar';
import { conflictBanner, hasNewConflict, pairKey, updateToasts, type Toast } from './hud';
import { useSim } from './useSim';

/** Design: HUD inset from the screen edges, and the gap under the top bar. */
const EDGE = 12;
const GAP = 8;

export function GameScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sim, paused, setPaused, timeScale, setTimeScale, restart, refresh } = useSim(LHBP);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Toasts: picked up from new sim events each render; expire after 4 s.
  const toastState = useRef({ toasts: [] as Toast[], lastSeq: 0 });
  const now = Date.now();
  toastState.current = updateToasts(toastState.current.toasts, sim.events, toastState.current.lastSeq, now);
  const toasts = toastState.current.toasts;
  // Paused: nothing re-renders, so schedule one to clear expired toasts.
  useEffect(() => {
    if (!paused || toasts.length === 0) return;
    const t = setTimeout(refresh, 4000);
    return () => clearTimeout(t);
  }, [paused, toasts.length, refresh]);

  // A new conflict pair drops the sim to ×1 (design).
  const knownPairs = useRef(new Set<string>());
  useEffect(() => {
    if (hasNewConflict(knownPairs.current, sim.conflicts) && timeScale !== 1) setTimeScale(1);
    knownPairs.current = new Set(sim.conflicts.map(pairKey));
  });

  // A restart brings a new sim: forget the old one's events and selection.
  useEffect(() => {
    toastState.current = { toasts: [], lastSeq: 0 };
    knownPairs.current = new Set();
    setSelectedId(null);
  }, [sim]);

  const banner = conflictBanner(sim);
  const top = insets.top + 3; // design: top bar at y = 50 with a 47 safe area
  const hudBottom = top + TOP_BAR_HEIGHT + GAP;
  const toastTop = hudBottom + (banner ? BANNER_HEIGHT + GAP : 0);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.statusBar} />
      <View style={styles.radarArea}>
        <Radar
          sim={sim}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCommand={refresh}
          paused={paused}
          insets={{ top: toastTop, bottom: 0 }}
        />
        <View style={[styles.hud, { top, left: EDGE, right: EDGE }]} pointerEvents="box-none">
          <TopBar sim={sim} paused={paused} onTogglePause={() => setPaused((p) => !p)} />
        </View>
        {banner && (
          <View style={[styles.hud, { top: hudBottom, left: EDGE, right: EDGE }]} pointerEvents="box-none">
            <ConflictBanner banner={banner} onSelect={setSelectedId} />
          </View>
        )}
        <View style={[styles.hud, { top: toastTop, left: EDGE, right: EDGE }]} pointerEvents="none">
          <Toasts toasts={toasts} />
        </View>
      </View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: theme.colors.panel }}>
        <PlanePanel sim={sim} selectedId={selectedId} onClose={() => setSelectedId(null)} onCommand={refresh} />
      </View>
      {paused && (
        <PauseOverlay
          timeScale={timeScale}
          onTimeScale={setTimeScale}
          onResume={() => setPaused(false)}
          onRestart={restart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  radarArea: { flex: 1 },
  hud: { position: 'absolute' },
});
