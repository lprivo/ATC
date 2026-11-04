import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { adjust, percent, valueAt } from './sliderMath';

/**
 * A volume slider in the Settings style (square, like the Toggle): a thin
 * track that fills with `accent` up to a square knob. Tap or drag anywhere
 * along it; `onChange` follows the finger, `onRelease` comes once it lets go
 * (to play a sample at the new level). VoiceOver adjusts it by 10 %.
 */
export function Slider({
  value,
  onChange,
  onRelease,
  label,
  disabled,
  testID,
}: {
  value: number;
  onChange: (v: number) => void;
  onRelease?: (v: number) => void;
  label: string;
  disabled?: boolean;
  testID?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [width, setWidth] = useState(0);
  // The responder is made once: it reads the latest props and size from here.
  const live = useRef({ value, width, onChange, onRelease, disabled, start: value, last: value, dragging: false });
  live.current = { ...live.current, value, width, onChange, onRelease, disabled };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !live.current.disabled,
      // A drag along the track is the slider's; an up-and-down one stays the page's scroll.
      onMoveShouldSetPanResponder: (_, g) => !live.current.disabled && Math.abs(g.dx) > Math.abs(g.dy),
      // Once it's being dragged sideways, the page can't take the touch for a scroll.
      onPanResponderTerminationRequest: () => !live.current.dragging,
      onPanResponderGrant: (e) => {
        const v = valueAt(e.nativeEvent.locationX - KNOB / 2, live.current.width - KNOB);
        live.current.start = v;
        live.current.last = v;
        live.current.dragging = false;
        live.current.onChange(v);
      },
      onPanResponderMove: (_, g) => {
        const w = live.current.width - KNOB;
        if (Math.abs(g.dx) > 4) live.current.dragging = true;
        const v = valueAt(live.current.start * w + g.dx, w);
        live.current.last = v;
        live.current.onChange(v);
      },
      onPanResponderRelease: () => live.current.onRelease?.(live.current.last),
    }),
  ).current;

  const travel = Math.max(0, width - KNOB);
  return (
    <View
      testID={testID}
      accessible
      role="slider"
      aria-label={label}
      aria-disabled={disabled}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent(value)}
      aria-valuetext={`${percent(value)} percent`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (disabled) return;
        const v = adjust(value, e.nativeEvent.actionName as 'increment' | 'decrement');
        onChange(v);
        onRelease?.(v);
      }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.hit, { opacity: disabled ? 0.5 : 1 }]}
      {...responder.panHandlers}
    >
      {/* Children take no touches, so the touch position is always the track's own. */}
      <View pointerEvents="none" style={[styles.track, { backgroundColor: c.button, borderColor: c.panelBorder, borderWidth: theme.hairline }]}>
        <View style={[styles.fill, { width: KNOB / 2 + value * travel, backgroundColor: c.accent }]} />
      </View>
      <View pointerEvents="none" style={[styles.knob, { left: value * travel, backgroundColor: c.accent, borderColor: c.background, borderWidth: theme.hairline }]} />
    </View>
  );
}

const KNOB = 22;

const styles = StyleSheet.create({
  hit: { height: 36, justifyContent: 'center' },
  track: { height: 6 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  knob: { position: 'absolute', width: KNOB, height: KNOB, top: (36 - KNOB) / 2 },
});
