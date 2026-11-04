import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { TutorialCopy } from '../game/tutorial';
import { useTheme } from '../theme/ThemeContext';
import { holePath, TOUCH_HINT_R, type CoachShape } from './coachGeometry';
import { CLEARED_LINE, DRAFT_LINE } from './drawing';

/** Card: bottom 56, inset 20 (design T1, T3, T4), and never over the sheet. */
const CARD_INSET = 20;
const CARD_BOTTOM = 56;
const RING_WIDTH = 2;
const TOUCH_HINT_WIDTH = 1.5;
const LEGEND_LINE = 28;

export interface CoachCard {
  /** Step counter, e.g. "2 / 4". */
  label: string;
  copy: TutorialCopy;
  legend: boolean;
}

/**
 * The tutorial's coach mark (design T1–T4): the scrim with its spotlight and
 * the step card. Touches pass through everything but START PLAYING, so the
 * player does the real gesture on the game below. With `done`, the card
 * offers START PLAYING. `hidden` keeps the card out of the way (the landing
 * confirm card is up) but leaves the scrim.
 */
export function CoachMarks({
  card,
  shape,
  w,
  h,
  sheetHeight,
  done,
  hidden = false,
  onStart,
}: {
  card: CoachCard;
  shape: CoachShape | null;
  w: number;
  h: number;
  sheetHeight: number;
  done: boolean;
  hidden?: boolean;
  onStart: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const bottom = Math.max(CARD_BOTTOM, sheetHeight + CARD_INSET);
  const a11yLabel = `Step ${card.label.replace(' / ', ' of ')}. ${card.copy.title}. ${card.copy.body}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={`coach-step-${done ? 'done' : card.label.split(' ')[0]}`}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        {shape?.kind === 'hole' && (
          <>
            <Path d={holePath(w, h, shape)} fill={shape.light ? c.coachScrimRoute : c.coachScrim} fillRule="evenodd" />
            {shape.ring && <Circle cx={shape.cx} cy={shape.cy} r={shape.rx} stroke={c.coachMark} strokeWidth={RING_WIDTH} fill="none" />}
          </>
        )}
        {shape?.kind === 'aboveSheet' && <Path d={`M0 0H${w}V${Math.max(0, h - shape.bottom)}H0Z`} fill={c.coachScrim} />}
        {shape?.kind === 'pinch' &&
          shape.points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={TOUCH_HINT_R} fill={c.touchHint} stroke={c.touchHintBorder} strokeWidth={TOUCH_HINT_WIDTH} />)}
      </Svg>
      {!hidden && (
        <View
          style={[styles.card, { bottom, backgroundColor: c.panel, borderColor: c.accent, borderWidth: theme.hairline }]}
          pointerEvents={done ? 'box-none' : 'none'}
          testID="coach-card"
        >
          {/* One VoiceOver stop for the card's text; START PLAYING stays its own. */}
          <View style={styles.text} accessible accessibilityLabel={a11yLabel}>
            <Text style={[t.coachCounter, { color: c.coachMark }]}>{card.label}</Text>
            <Text style={[t.title, { color: c.text }]}>{card.copy.title}</Text>
            <Text style={[t.body, { color: c.coachBody }]}>{card.copy.body}</Text>
            {card.legend && (
              <View style={styles.legend}>
                <Svg width={LEGEND_LINE} height={4}>
                  <Line x1={0} y1={2} x2={LEGEND_LINE} y2={2} stroke={c.routeDraft} strokeWidth={DRAFT_LINE.width} strokeDasharray={DRAFT_LINE.dash} />
                </Svg>
                <Text style={[t.small, { color: c.textDim }]}>your path</Text>
                <Svg width={LEGEND_LINE} height={4} style={styles.legendGap}>
                  <Line x1={0} y1={2} x2={LEGEND_LINE} y2={2} stroke={c.routeCleared} strokeWidth={CLEARED_LINE.width} />
                </Svg>
                <Text style={[t.small, { color: c.textDim }]}>cleared</Text>
              </View>
            )}
          </View>
          {done && (
            <Pressable
              onPress={onStart}
              accessibilityRole="button"
              testID="coach-start"
              style={({ pressed }) => [styles.start, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[t.menuButton, { color: c.background }]}>START PLAYING</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: CARD_INSET, right: CARD_INSET, padding: 18, gap: 10 },
  text: { gap: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendGap: { marginLeft: 8 },
  start: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
