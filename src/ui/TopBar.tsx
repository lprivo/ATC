import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Sim } from '../engine/sim';
import { useTheme } from '../theme/ThemeContext';
import { sessionClock, toComeCaption } from '../game/hud';
import { TOP_BAR_HEIGHT } from './hudLayout';
import { CheckIcon, PauseIcon, PlayIcon, WarningIcon } from './icons';

/** The clock cell stacks two lines in the 44 pt bar, so Dynamic Type may only grow them this much. */
const BAR_TEXT_MAX_SCALE = 1.2;

interface Props {
  sim: Sim;
  paused: boolean;
  onTogglePause: () => void;
  /** Session length in sim seconds (the clock counts down to it), or null for endless (it counts up). */
  sessionSec: number | null;
  /** Arrivals still to come (timed session), or null for endless. */
  toCome: number | null;
}

/**
 * Design top bar: airport, sim clock, landed and separation-loss counts, and a
 * pause button. In a timed session the clock shows the time left, with the
 * arrivals still to come under it (both asked for in playtesting). Everything else (theme, restart, other stats) lives in the
 * pause menu. The separation cell inverts to `danger` once there is a loss.
 */
export function TopBar({ sim, paused, onTogglePause, sessionSec, toCome }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const s = sim.stats;
  const lost = s.separationViolations > 0;
  const time = sessionClock(sim.time, sessionSec);
  const clockA11y = toCome == null ? time.a11y : `${time.a11y}, ${toComeCaption(toCome).toLowerCase()}`;
  const box = { backgroundColor: c.panel, borderColor: c.panelBorder, borderWidth: theme.hairline };

  return (
    <View style={styles.row} testID="top-bar" pointerEvents="box-none">
      <View style={[styles.info, box]}>
        <Text style={[t.barTitle, { color: c.text }]}>{sim.airport.icao}</Text>
        <View accessible accessibilityLabel={clockA11y} testID="session-clock">
          <View style={styles.clockLine}>
            <Text style={[t.barValue, { color: time.lastMinute ? c.text : c.textDim }]} maxFontSizeMultiplier={BAR_TEXT_MAX_SCALE}>
              {time.text}
            </Text>
            {time.caption && (
              <Text style={[t.capsSmall, { color: time.lastMinute ? c.text : c.textDim }]} maxFontSizeMultiplier={BAR_TEXT_MAX_SCALE}>
                {time.caption}
              </Text>
            )}
          </View>
          {toCome != null && (
            <Text style={[t.capsSmall, { color: c.textDim }]} maxFontSizeMultiplier={BAR_TEXT_MAX_SCALE} testID="to-come">
              {toComeCaption(toCome)}
            </Text>
          )}
        </View>
        <View style={styles.counts}>
          <View style={styles.count} accessible accessibilityLabel={`${s.landed} landed`} testID="stat-landed">
            <CheckIcon color={c.good} />
            <Text style={[t.barCount, { color: c.good }]}>{s.landed}</Text>
          </View>
          <View
            style={[styles.count, styles.sepCell, lost && { backgroundColor: c.danger }]}
            accessible
            accessibilityLabel={`${s.separationViolations} separation losses`}
            testID="stat-sep"
          >
            <WarningIcon color={lost ? c.onDanger : c.textDim} />
            <Text style={[t.barCount, { color: lost ? c.onDanger : c.textDim }]}>{s.separationViolations}</Text>
          </View>
        </View>
      </View>
      <Pressable
        testID="btn-pause"
        accessibilityRole="button"
        accessibilityLabel={paused ? 'Resume' : 'Pause'}
        onPress={onTogglePause}
        style={({ pressed }) => [styles.pause, box, pressed && { backgroundColor: c.buttonPressed }]}
      >
        {paused ? <PlayIcon color={c.text} /> : <PauseIcon color={c.text} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, height: TOP_BAR_HEIGHT },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  clockLine: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  counts: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, height: 28 },
  sepCell: { paddingHorizontal: 6 },
  pause: { width: TOP_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
