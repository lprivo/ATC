import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { CheckIcon } from './icons';

interface Props {
  callsign: string;
  runway: string;
  /** The parallel runway to swap to, if there is one. */
  swapTo: string | null;
  /** Auto-confirm delay (design: 3 s), shown as a draining 3 pt bar. */
  durationMs: number;
  /** The countdown holds while the game is paused. */
  paused: boolean;
  onSwap: () => void;
  onConfirm: () => void;
}

/** Confirm card shown above the sheet after a path snaps to a runway: `Swap to 31R` or `✓ 31L`; auto-confirms. */
export function ConfirmCard({ callsign, runway, swapTo, durationMs, paused, onSwap, onConfirm }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const progress = useRef(new Animated.Value(1)).current;
  const confirm = useRef(onConfirm);
  confirm.current = onConfirm;

  // Screen-reader users get no countdown (WCAG 2.2.1): the card waits for them. Everyone hears it.
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader, () => {});
    AccessibilityInfo.announceForAccessibility(`${callsign}, land ${runway}?${swapTo ? ` Swap to ${swapTo} available.` : ''}`);
    // Announce once per card (the parent re-keys the card for each landing or swap).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown: holds while paused and resumes from where it was (the card is re-keyed per landing/swap).
  const left = useRef(1);
  useEffect(() => {
    if (paused || screenReader) return;
    progress.setValue(left.current);
    const anim = Animated.timing(progress, { toValue: 0, duration: durationMs * left.current, easing: Easing.linear, useNativeDriver: true });
    anim.start(({ finished }) => finished && confirm.current());
    return () => {
      anim.stop();
      progress.stopAnimation((v) => (left.current = v));
    };
  }, [paused, screenReader, durationMs, progress]);

  const box = { borderColor: c.panelBorder, borderWidth: theme.hairline };
  return (
    <View style={[styles.card, box, { backgroundColor: c.panel }]} testID="confirm-card">
      <Text style={[t.small, { color: c.textDim }]}>
        <Text style={{ color: c.text }}>{callsign}</Text> · land {runway}?
      </Text>
      <View style={styles.row}>
        {swapTo && (
          <Pressable
            testID="btn-swap"
            accessibilityRole="button"
            onPress={onSwap}
            style={({ pressed }) => [styles.button, styles.grow, box, { backgroundColor: pressed ? c.buttonPressed : c.button }]}
          >
            <Text style={[t.button, { color: c.buttonText }]}>Swap to {swapTo}</Text>
          </Pressable>
        )}
        <Pressable
          testID="btn-confirm"
          accessibilityRole="button"
          accessibilityLabel={`Confirm landing ${runway}`}
          onPress={onConfirm}
          style={({ pressed }) => [styles.button, styles.grow, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={styles.confirm}>
            <CheckIcon color={c.background} size={18} />
            <Text style={[t.button, { color: c.background }]}>{runway}</Text>
          </View>
        </Pressable>
      </View>
      <View style={[styles.track, { backgroundColor: c.rangeRing }]}>
        <Animated.View style={[styles.bar, { backgroundColor: c.snapHalo, transform: [{ scaleX: progress }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 10, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  button: { height: 48, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { height: 3, overflow: 'hidden' },
  // scaleX shrinks from the centre; anchor at the left by using full width and transformOrigin.
  bar: { height: 3, width: '100%', transformOrigin: 'left' },
});
