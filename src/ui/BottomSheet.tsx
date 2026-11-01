import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { airlineOf } from '../engine/data/airlines';
import type { Sim } from '../engine/sim';
import type { Plane } from '../engine/types';
import { atLimit, isFollowingRoute, nextAltitude, nextHeading, nextSpeed, statusChip, trend } from '../game/controls';
import { useTheme } from '../theme/ThemeContext';
import { feet, pad3 } from './format';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CloseIcon } from './icons';
import { SpeedControl } from './SpeedControl';
import { Stepper } from './Stepper';

export type SheetState = 'peek' | 'expanded' | 'compact';

/** Design: sheet transitions run 220 ms, ease-out, transform only. */
const TRANSITION_MS = 220;
/** Vertical drag needed on the sheet's top to switch between expanded and compact. */
const SWIPE_PT = 24;

interface Props {
  sim: Sim;
  selectedId: string | null;
  onClose: () => void;
  /** Called after a stepper changes the sim, so the screen can redraw while paused. */
  onCommand: () => void;
  timeScale: number;
  onTimeScale: (s: number) => void;
  /** Bottom safe-area inset (home indicator). */
  bottomInset: number;
  /** Reports the sheet's height (including the inset), so the radar can keep planes and buttons above it. */
  onHeight: (h: number) => void;
}

/**
 * Design option 1a: the bottom sheet over the radar.
 * - Peek (nothing selected): sim speed and a hint.
 * - Expanded (a plane selected): header and three steppers.
 * - Compact (swipe down while selected): callsign and three read-only values; tap to expand.
 */
export function BottomSheet({ sim, selectedId, onClose, onCommand, timeScale, onTimeScale, bottomInset, onHeight }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const plane = selectedId ? sim.plane(selectedId) : undefined;
  const [compact, setCompact] = useState(false);
  // A new selection always opens expanded.
  useEffect(() => setCompact(false), [selectedId]);
  const state: SheetState = !plane ? 'peek' : compact ? 'compact' : 'expanded';

  // Slide the content up into place whenever the state changes (transform only).
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    slide.setValue(24);
    Animated.timing(slide, { toValue: 0, duration: TRANSITION_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [state, slide]);

  // Swipe down on the sheet's top to go compact, up to expand again.
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > SWIPE_PT) setCompact(true);
        else if (g.dy < -SWIPE_PT) setCompact(false);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height);

  return (
    <View
      onLayout={onLayout}
      testID="sheet"
      style={[styles.sheet, { backgroundColor: c.panel, borderTopColor: c.panelBorder, borderTopWidth: theme.hairline, paddingBottom: bottomInset + 8 }]}
    >
      <View {...swipe.panHandlers} style={styles.grabArea}>
        <View style={[styles.grabber, { backgroundColor: c.panelBorder }]} />
      </View>
      <Animated.View style={{ transform: [{ translateY: slide }] }}>
        {state === 'peek' && <Peek sim={sim} timeScale={timeScale} onTimeScale={onTimeScale} />}
        {state === 'expanded' && plane && (
          <View {...swipe.panHandlers}>
            <Expanded sim={sim} plane={plane} onClose={onClose} onCommand={onCommand} />
          </View>
        )}
        {state === 'compact' && plane && <Compact plane={plane} onExpand={() => setCompact(false)} swipe={swipe.panHandlers} />}
      </Animated.View>
    </View>
  );
}

function Peek({ sim, timeScale, onTimeScale }: { sim: Sim; timeScale: number; onTimeScale: (s: number) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  return (
    <View style={styles.peek} testID="sheet-peek">
      <Text style={[t.capsSmall, { color: c.textDim }]}>SIM SPEED · HOW FAST TIME RUNS</Text>
      <View style={styles.peekRow}>
        <SpeedControl value={timeScale} onChange={onTimeScale} />
        <Text style={[t.small, styles.hint, { color: c.textDim }]}>
          <Text style={{ color: c.text }}>{sim.planes.length} airborne</Text>
          {'\n'}Tap a plane · hold to draw
        </Text>
      </View>
    </View>
  );
}

function Expanded({ sim, plane: p, onClose, onCommand }: { sim: Sim; plane: Plane; onClose: () => void; onCommand: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const chip = statusChip(p, sim.time);
  const chipColor = chip ? { danger: c.danger, good: c.good, info: c.snapHalo }[chip.tone] : c.text;
  const airline = airlineOf(p.callsign);
  const command = (fn: () => void) => {
    fn();
    onCommand();
  };
  const following = isFollowingRoute(p);
  const iconColor = c.buttonText;

  return (
    <View style={styles.expanded} testID="plane-panel">
      <View style={styles.header}>
        <View>
          <Text style={[t.callsign, { color: c.planeSelected }]}>{p.callsign}</Text>
          <Text style={[t.small, { color: c.textDim, marginTop: 5 }]}>{airline ? `${p.aircraftType} · ${airline}` : p.aircraftType}</Text>
        </View>
        {chip && (
          <Text style={[t.chip, styles.status, { color: chipColor, borderColor: chipColor, borderWidth: theme.hairline }]} testID="status-chip">
            {chip.text}
          </Text>
        )}
        <Pressable
          onPress={onClose}
          testID="close-panel"
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [styles.close, { borderColor: c.panelBorder, borderWidth: theme.hairline }, pressed && { backgroundColor: c.buttonPressed }]}
        >
          <CloseIcon color={c.text} />
        </Pressable>
      </View>
      <View style={styles.steppers}>
        <Stepper
          testID="step-hdg"
          label="HDG"
          value={following ? '———' : pad3(p.target.heading)}
          now={`now ${pad3(p.heading)} ${trend('heading', p)}`.trim()}
          dec={{ icon: <ChevronLeft color={iconColor} />, a11y: 'Turn left 5 degrees' }}
          inc={{ icon: <ChevronRight color={iconColor} />, a11y: 'Turn right 5 degrees' }}
          onStep={(d) => command(() => sim.setHeading(p.id, nextHeading(p, d)))}
        />
        <Stepper
          testID="step-alt"
          label="ALT FT"
          value={feet(p.target.altitude)}
          now={`now ${feet(p.altitude)} ${trend('altitude', p)}`.trim()}
          dec={{ icon: <ChevronDown color={iconColor} />, a11y: 'Descend 1,000 feet', atLimit: atLimit('altitude', p, -1) }}
          inc={{ icon: <ChevronUp color={iconColor} />, a11y: 'Climb 1,000 feet', atLimit: atLimit('altitude', p, 1) }}
          onStep={(d) => command(() => sim.setAltitude(p.id, nextAltitude(p, d)))}
        />
        <Stepper
          testID="step-spd"
          label="SPD KT"
          value={String(Math.round(p.target.speed))}
          now={`now ${Math.round(p.speed)} ${trend('speed', p)}`.trim()}
          dec={{ icon: <ChevronDown color={iconColor} />, a11y: 'Slow down 10 knots', atLimit: atLimit('speed', p, -1) }}
          inc={{ icon: <ChevronUp color={iconColor} />, a11y: 'Speed up 10 knots', atLimit: atLimit('speed', p, 1) }}
          onStep={(d) => command(() => sim.setSpeed(p.id, nextSpeed(p, d)))}
        />
      </View>
    </View>
  );
}

function Compact({ plane: p, onExpand, swipe }: { plane: Plane; onExpand: () => void; swipe: object }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const cell = (label: string, value: string) => (
    <View style={[styles.compactCell, { borderColor: c.panelBorder, borderWidth: theme.hairline }]}>
      <Text style={[t.capsSmall, { color: c.textDim }]}>{label}</Text>
      <Text style={[t.barTitle, { color: c.text }]}>{value}</Text>
    </View>
  );
  return (
    <Pressable {...swipe} onPress={onExpand} testID="sheet-compact" accessibilityRole="button" accessibilityLabel={`${p.callsign}, show controls`} style={styles.compact}>
      <Text style={[t.callsign, { color: c.planeSelected }]}>{p.callsign}</Text>
      <View style={styles.compactCells}>
        {cell('HDG', pad3(p.target.heading))}
        {cell('ALT', feet(p.target.altitude))}
        {cell('SPD', String(Math.round(p.target.speed)))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // userSelect: a drag on the sheet is a swipe, not a text selection (web).
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, userSelect: 'none' },
  grabArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 8 },
  grabber: { width: 36, height: 4 },
  peek: { gap: 8 },
  peekRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { flex: 1 },
  expanded: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: { marginLeft: 6, alignSelf: 'flex-start', marginTop: 3, paddingVertical: 4, paddingHorizontal: 6 },
  close: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  steppers: { flexDirection: 'row', gap: 8 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compactCells: { flex: 1, flexDirection: 'row', gap: 6 },
  compactCell: { flex: 1, height: 48, paddingHorizontal: 6, justifyContent: 'center' },
});
