import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scoreLines, type ScoreLine } from '../engine/scoring';
import type { SessionResult } from '../game/ResultsContext';
import { sessionLabel } from '../game/session';
import { useTheme } from '../theme/ThemeContext';

const LINE_LABEL: Record<ScoreLine['key'], string> = { landed: 'Landed', separationLoss: 'Separation lost', goAround: 'Go-arounds', exit: 'Exits' };
const signed = (n: number) => (n > 0 ? `+${n.toLocaleString('en-GB')}` : n === 0 ? '0' : n.toLocaleString('en-GB'));

/**
 * Design S6: SESSION COMPLETE · LHBP · STEADY · 30 MIN, the score (Condensed
 * 600 96) with a NEW BEST tag and the previous best, a 52-high breakdown row
 * per item (separation losses in `danger`), then Menu and PLAY AGAIN.
 */
export function SummaryScreen({ result, onMenu, onPlayAgain }: { result: SessionResult; onMenu: () => void; onPlayAgain: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const insets = useSafeAreaInsets();
  const { session } = result;
  const box = { borderColor: c.panelBorder, borderWidth: theme.hairline };
  return (
    <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]} testID="summary">
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[t.caps, { color: c.textDim }]} accessibilityRole="header">
          {result.endedEarly ? 'SESSION ENDED' : 'SESSION COMPLETE'} · {session.icao} · {sessionLabel(session)}
        </Text>
        <View style={styles.scoreRow} accessible accessibilityLabel={`Score ${result.score.toLocaleString('en-GB')}${result.isNewBest ? ', new best' : ''}`}>
          <Text style={[t.display, { color: c.text }]} testID="summary-score">
            {result.score.toLocaleString('en-GB')}
          </Text>
          {result.isNewBest && <Text style={[t.chip, styles.newBest, { color: c.onGood, backgroundColor: c.good }]}>NEW BEST</Text>}
        </View>
        <Text style={[t.small, { color: c.textDim }]}>
          {!result.counted
            ? 'Ended early: doesn’t count towards best scores'
            : result.previousBest
              ? `Previous best ${result.previousBest.score.toLocaleString('en-GB')}`
              : result.isNewBest
                ? 'First score for this session'
                : 'Score above zero to set a best'}
        </Text>
        <View style={styles.lines}>
          {scoreLines(result.stats).map((l) => {
            const danger = l.key === 'separationLoss' && l.count > 0;
            return (
              <View key={l.key} style={[styles.line, { borderBottomColor: c.panelBorder, borderBottomWidth: theme.hairline }]} accessible accessibilityLabel={`${LINE_LABEL[l.key]}: ${l.count}, ${signed(l.total)} points`}>
                <Text style={[t.bodyStrong, styles.lineLabel, { color: danger ? c.danger : c.text }]}>{LINE_LABEL[l.key]}</Text>
                <Text style={[t.smallTight, { color: c.textDim }]}>
                  {l.count} × {signed(l.each)}
                </Text>
                <Text style={[t.barTitle, styles.lineTotal, { color: danger ? c.danger : c.text }]}>{signed(l.total)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" onPress={onMenu} style={({ pressed }) => [styles.button, styles.menu, box, { backgroundColor: pressed ? c.buttonPressed : c.button }]} testID="btn-menu">
          <Text style={[t.button, { color: c.buttonText }]}>Menu</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onPlayAgain} style={({ pressed }) => [styles.button, styles.again, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]} testID="btn-play-again">
          <Text style={[t.buttonLarge, { color: c.background }]}>PLAY AGAIN</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  body: { gap: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  newBest: { paddingHorizontal: 8, paddingVertical: 4 },
  lines: { marginTop: 20 },
  line: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineLabel: { flex: 1 },
  lineTotal: { minWidth: 72, textAlign: 'right' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  button: { height: 64, alignItems: 'center', justifyContent: 'center' },
  menu: { flex: 1 },
  again: { flex: 2 },
});
