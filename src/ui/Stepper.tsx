import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { nextRepeatDelay, pressStepsOnPress, stepHapticDue } from '../game/controls';
import { haptic } from '../game/haptics';
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
  const atLimitRef = useRef(atLimit);
  atLimitRef.current = atLimit;
  // Press-ins step themselves; onPress only steps for a press that had none (see pressStepsOnPress).
  const pressIns = useRef(0);
  const consumed = useRef(0);
  const lastStepHaptic = useRef(0);
  const stepFeedback = () => {
    const now = Date.now();
    if (!stepHapticDue(lastStepHaptic.current, now)) return;
    lastStepHaptic.current = now;
    haptic('step');
  };

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const start = () => {
    stop();
    pressIns.current += 1;
    lastStepHaptic.current = 0; // the first step of every press always gets its haptic
    // At a limit the button only dims and gives the rigid limit haptic: no steps.
    if (atLimitRef.current) {
      haptic('limit');
      return;
    }
    stepFeedback();
    stepRef.current();
    const t0 = Date.now();
    const loop = () => {
      if (atLimitRef.current) {
        haptic('limit'); // reached the limit mid-hold
        return;
      }
      stepFeedback();
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
        const d = pressStepsOnPress(pressIns.current, consumed.current);
        consumed.current = d.consumed;
        if (!d.step) return;
        if (atLimitRef.current) haptic('limit');
        else {
          stepFeedback();
          stepRef.current();
        }
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
