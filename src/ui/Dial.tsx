import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const REPEAT_DELAY_MS = 350;
const REPEAT_EVERY_MS = 90;

interface Props {
  label: string;
  /** The commanded value (what the arrows change). */
  value: string;
  /** What the plane is actually doing right now. */
  current: string;
  onStep: (direction: 1 | -1) => void;
  testID?: string;
}

/** A vertical up/down stepper. Hold an arrow to keep stepping. */
export function Dial({ label, value, current, onStep, testID }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.dial, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} testID={testID}>
      <Text style={[theme.type.caps, styles.center, { color: c.textDim }]}>{label}</Text>
      <StepButton glyph="▲" onStep={() => onStep(1)} testID={testID && `${testID}-up`} />
      <Text style={[theme.type.stepperValue, styles.center, { color: c.text }]}>{value}</Text>
      <Text style={[theme.type.smallTight, styles.center, { color: c.textDim }]}>{current}</Text>
      <StepButton glyph="▼" onStep={() => onStep(-1)} testID={testID && `${testID}-down`} />
    </View>
  );
}

function StepButton({ glyph, onStep, testID }: { glyph: string; onStep: () => void; testID?: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const timers = useRef<{ delay?: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>({});
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  // Step immediately on press-in (feels responsive, enables hold-to-repeat).
  // react-native-web delays onPressIn by 50 ms and skips it for very quick
  // taps, so onPress steps too unless press-in already did.
  const steppedOnPressIn = useRef(false);

  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
  };
  useEffect(() => stop, []);

  return (
    <Pressable
      testID={testID}
      onPressIn={() => {
        steppedOnPressIn.current = true;
        stepRef.current();
        timers.current.delay = setTimeout(() => {
          timers.current.repeat = setInterval(() => stepRef.current(), REPEAT_EVERY_MS);
        }, REPEAT_DELAY_MS);
      }}
      onPress={() => {
        if (!steppedOnPressIn.current) stepRef.current();
        steppedOnPressIn.current = false;
      }}
      onPressOut={stop}
      style={({ pressed }) => [styles.button, { backgroundColor: pressed ? c.buttonPressed : c.button }]}
    >
      <Text style={[theme.type.button, { color: c.buttonText }]}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dial: { flex: 1, alignItems: 'stretch', padding: 8, gap: 4 },
  center: { textAlign: 'center' },
  button: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
