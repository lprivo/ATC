import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { nextRepeatDelay } from '../game/controls';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  /** Caps label, e.g. "ALT FT". */
  label: string;
  /** Commanded value. */
  value: string;
  /** What the plane is doing now, e.g. "now 7,000 ↓". */
  now: string;
  /** Left/down and right/up buttons: icon, accessibility label, and whether it is at its limit. */
  dec: { icon: ReactNode; a11y: string; atLimit?: boolean };
  inc: { icon: ReactNode; a11y: string; atLimit?: boolean };
  onStep: (dir: 1 | -1) => void;
  testID?: string;
}

/**
 * Design stepper: a bordered cell with caps label, the commanded value and the
 * current value, over two side-by-side buttons (≥56×52). Hold a button to
 * repeat (400 ms, then 120 ms, then 60 ms after 1.5 s). A button at its limit
 * drops to 45% opacity.
 */
export function Stepper({ label, value, now, dec, inc, onStep, testID }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  return (
    <View style={[styles.cell, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} testID={testID}>
      <View style={styles.readout}>
        <Text style={[t.caps, { color: c.textDim }]}>{label}</Text>
        <Text style={[t.stepperValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={[t.smallTight, { color: c.textDim }]} numberOfLines={1}>
          {now}
        </Text>
      </View>
      <View style={[styles.buttons, { borderTopColor: c.panelBorder, borderTopWidth: theme.hairline }]}>
        <StepButton {...dec} onStep={() => onStep(-1)} divider testID={testID && `${testID}-dec`} />
        <StepButton {...inc} onStep={() => onStep(1)} testID={testID && `${testID}-inc`} />
      </View>
    </View>
  );
}

function StepButton({
  icon,
  a11y,
  atLimit,
  onStep,
  divider,
  testID,
}: {
  icon: ReactNode;
  a11y: string;
  atLimit?: boolean;
  onStep: () => void;
  divider?: boolean;
  testID?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  // react-native-web delays onPressIn and skips it for very quick taps, so
  // onPress steps too unless press-in already did.
  const steppedOnPressIn = useRef(false);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const start = () => {
    steppedOnPressIn.current = true;
    stepRef.current();
    const t0 = Date.now();
    const loop = () => {
      stepRef.current();
      timer.current = setTimeout(loop, nextRepeatDelay(Date.now() - t0));
    };
    timer.current = setTimeout(loop, nextRepeatDelay(0));
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!atLimit }}
      onPressIn={start}
      onPress={() => {
        if (!steppedOnPressIn.current) stepRef.current();
        steppedOnPressIn.current = false;
      }}
      onPressOut={stop}
      style={({ pressed }) => [
        styles.button,
        divider && { borderRightColor: c.panelBorder, borderRightWidth: theme.hairline },
        { backgroundColor: pressed ? c.buttonPressed : c.button, opacity: atLimit ? 0.45 : 1 },
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, minWidth: 0 },
  readout: { padding: 8, gap: 4 },
  buttons: { flexDirection: 'row' },
  button: { flex: 1, minWidth: 0, height: 52, alignItems: 'center', justifyContent: 'center' },
});
