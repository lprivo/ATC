import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { stepLabel, TUTORIAL_STEPS, type StepIndex } from '../game/tutorial';
import { useTheme } from '../theme/ThemeContext';
import { holePath, TOUCH_HINT_R, type CoachShape } from './coachGeometry';

/** Card: bottom 56, inset 20 (design T1, T3, T4); above the sheet for T2. */
const CARD_INSET = 20;
const CARD_BOTTOM = 56;
const RING_WIDTH = 2;
const LEGEND_LINE = 28;

/**
 * The tutorial's coach mark for one step (design T1–T4): the scrim with its
 * spotlight and the step card. Touches pass through everything but the
 * START PLAYING button, so the player does the real gesture on the game below.
 * With `done`, the last card offers START PLAYING.
 */
export function CoachMarks({ step, shape, w, h, done, onStart }: { step: StepIndex; shape: CoachShape | null; w: number; h: number; done: boolean; onStart: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const copy = TUTORIAL_STEPS[Math.min(step, TUTORIAL_STEPS.length - 1)];
  const cardPos = shape?.kind === 'aboveSheet' ? { bottom: shape.bottom + CARD_INSET } : { bottom: CARD_BOTTOM };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={`coach-step-${step + 1}`}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        {shape?.kind === 'hole' && (
          <>
            <Path d={holePath(w, h, shape)} fill={c.coachScrim} fillRule="evenodd" />
            {shape.ring && <Circle cx={shape.cx} cy={shape.cy} r={shape.rx} stroke={c.coachMark} strokeWidth={RING_WIDTH} fill="none" />}
          </>
        )}
        {shape?.kind === 'aboveSheet' && <Path d={`M0 0H${w}V${Math.max(0, h - shape.bottom)}H0Z`} fill={c.coachScrim} />}
        {shape?.kind === 'pinch' &&
          shape.points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={TOUCH_HINT_R} fill={c.touchHint} stroke={c.touchHintBorder} strokeWidth={1.5} />)}
      </Svg>
      <View
        style={[styles.card, cardPos, { backgroundColor: c.panel, borderColor: c.accent, borderWidth: theme.hairline }]}
        pointerEvents={done ? 'box-none' : 'none'}
        accessibilityLiveRegion="polite"
        testID="coach-card"
      >
        <Text style={[t.caps, { color: c.coachMark }]}>{stepLabel(step)}</Text>
        <Text style={[t.title, { color: c.text }]} accessibilityRole="header">
          {copy.title}
        </Text>
        <Text style={[t.body, { color: c.coachBody }]}>{copy.body}</Text>
        {copy.legend && (
          <View style={styles.legend}>
            <Svg width={LEGEND_LINE} height={4}>
              <Line x1={0} y1={2} x2={LEGEND_LINE} y2={2} stroke={c.routeDraft} strokeWidth={2.5} strokeDasharray="2.5 3" />
            </Svg>
            <Text style={[t.small, { color: c.textDim }]}>your path</Text>
            <Svg width={LEGEND_LINE} height={4} style={styles.legendGap}>
              <Line x1={0} y1={2} x2={LEGEND_LINE} y2={2} stroke={c.routeCleared} strokeWidth={2.5} />
            </Svg>
            <Text style={[t.small, { color: c.textDim }]}>cleared</Text>
          </View>
        )}
        {done && (
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
            testID="coach-start"
            style={({ pressed }) => [styles.start, { backgroundColor: pressed ? c.buttonPressed : c.accent }]}
          >
            <Text style={[t.menuButton, { color: c.background }]}>START PLAYING</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: CARD_INSET, right: CARD_INSET, padding: 18, gap: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendGap: { marginLeft: 8 },
  start: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
