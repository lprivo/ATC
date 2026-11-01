import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LHBP } from '../engine/airports/lhbp';
import { useTheme } from '../theme/ThemeContext';
import { ConflictBanner } from '../ui/ConflictBanner';
import { HUD_EDGE, HUD_GAP, TOP_BAR_HEIGHT } from '../ui/hudLayout';
import { PauseOverlay } from '../ui/PauseOverlay';
import { PlanePanel } from '../ui/PlanePanel';
import { Radar } from '../ui/Radar';
import { Toasts } from '../ui/Toasts';
import { TopBar } from '../ui/TopBar';
import { useHud } from './useHud';
import { useSim } from './useSim';

export function GameScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { sim, paused, setPaused, timeScale, setTimeScale, restart, refresh } = useSim(LHBP);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toasts, banner } = useHud(sim, { paused, timeScale, setTimeScale, refresh });
  const [bannerHeight, setBannerHeight] = useState(0);

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
      <View style={styles.radarArea}>
        <Radar
          sim={sim}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCommand={refresh}
          paused={paused}
          insets={{ top: toastTop, bottom: 0 }}
        />
        <View style={[styles.hud, side, { top }]} pointerEvents="box-none">
          <TopBar sim={sim} paused={paused} onTogglePause={() => setPaused((p) => !p)} />
        </View>
        {banner && (
          <View style={[styles.hud, side, { top: hudBottom }]} pointerEvents="box-none">
            <ConflictBanner banner={banner} onSelect={setSelectedId} onHeight={setBannerHeight} />
          </View>
        )}
        <View style={[styles.hud, side, { top: toastTop }]} pointerEvents="none">
          <Toasts toasts={toasts} />
        </View>
      </View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: theme.colors.panel }}>
        <PlanePanel sim={sim} selectedId={selectedId} onClose={() => setSelectedId(null)} onCommand={refresh} />
      </View>
      {paused && (
        <PauseOverlay sim={sim} timeScale={timeScale} onTimeScale={setTimeScale} onResume={() => setPaused(false)} onRestart={onRestart} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  radarArea: { flex: 1 },
  hud: { position: 'absolute' },
});
