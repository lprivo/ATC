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
    <View style={[styles.dial, { borderColor: c.panelBorder }]} testID={testID}>
      <Text style={[styles.label, { color: c.textDim, fontFamily: theme.font.mono }]}>{label}</Text>
      <StepButton glyph="▲" onStep={() => onStep(1)} testID={testID && `${testID}-up`} />
      <Text style={[styles.value, { color: c.text, fontFamily: theme.font.mono }]}>{value}</Text>
      <Text style={[styles.current, { color: c.textDim, fontFamily: theme.font.mono }]}>{current}</Text>
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
      <Text style={[styles.glyph, { color: c.buttonText }]}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dial: { flex: 1, alignItems: 'stretch', borderWidth: 1, borderRadius: 10, padding: 6, gap: 4 },
  label: { fontSize: 11, textAlign: 'center', letterSpacing: 1 },
  value: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  current: { fontSize: 11, textAlign: 'center' },
  button: { height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 16 },
});
