import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { score } from '../engine/scoring';
import type { Sim } from '../engine/sim';
import { explain, statCells, type StatKey } from '../game/explainer';
import { useTheme } from '../theme/ThemeContext';
import { clock } from './format';
import { CloseIcon } from './icons';

interface Props {
  sim: Sim;
  /** Session length in sim seconds, for "02:11 / 30:00"; omitted for endless sessions. */
  sessionSec?: number;
  topInset: number;
  bottomInset: number;
  onResume: () => void;
  onRestart: () => void;
  /** Quit to the main menu; hidden until there is one (#13). */
  onQuit?: () => void;
}

/**
 * Design S5: the pause menu over a scrim. Session line and score at the top;
 * a stat grid (tap a stat for the S5b explainer), theme, Restart / Quit (each
 * asks to confirm) and RESUME in the bottom panel.
 */
export function PauseMenu({ sim, sessionSec, topInset, bottomInset, onResume, onRestart, onQuit }: Props) {
  const { theme, themes, setTheme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const [explaining, setExplaining] = useState<StatKey | null>(null);
  const [confirming, setConfirming] = useState<'restart' | 'quit' | null>(null);
  const box = { borderColor: c.panelBorder, borderWidth: theme.hairline };
  const session = `PAUSED · ${sim.airport.icao} · ${clock(sim.time)}${sessionSec ? ` / ${clock(sessionSec)}` : ''}`;

  const action = (kind: 'restart' | 'quit', label: string, run: () => void) => {
    const asking = confirming === kind;
    return (
      <Pressable
        testID={`btn-${kind}`}
        accessibilityRole="button"
        accessibilityHint={asking ? undefined : 'Asks to confirm'}
        onPress={() => (asking ? run() : setConfirming(kind))}
        style={({ pressed }) => [styles.button, styles.grow, box, { backgroundColor: asking ? c.danger : pressed ? c.buttonPressed : c.button }]}
      >
        <Text style={[t.button, { color: asking ? c.onDanger : c.buttonText }]}>{asking ? `${label}? Tap again` : label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} testID="pause-menu" accessibilityViewIsModal>
      <View style={[styles.head, { paddingTop: topInset + 24 }]}>
        <Text style={[t.caps, { color: c.textDim }]}>{session}</Text>
        <Text style={[t.score, { color: c.text }]} testID="pause-score">
          {score(sim.stats).toLocaleString('en-GB')}
        </Text>
        <Text style={[t.small, { color: c.textDim }]}>points so far</Text>
      </View>
      <View style={[styles.panel, box, { backgroundColor: c.panel, paddingBottom: Math.max(bottomInset, 12) + 8 }]}>
        <View style={styles.stats}>
          {statCells(sim).map((s) => (
            <Pressable
              key={s.key}
              testID={`stat-${s.key}`}
              accessibilityRole="button"
              accessibilityLabel={`${s.label}: ${s.value}. Explain`}
              onPress={() => setExplaining(s.key)}
              style={styles.stat}
            >
              <Text style={[t.barTitle, { color: s.key === 'sep' && s.value > 0 ? c.danger : c.text }]}>{s.value}</Text>
              <Text style={[t.capsSmall, styles.dotted, { color: c.textDim, textDecorationColor: c.textDim }]}>{s.label.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[t.capsSmall, { color: c.textDim }]}>THEME</Text>
        <View style={[styles.segments, box]} accessibilityRole="radiogroup">
          {themes.map((th, i) => {
            const active = th.id === theme.id;
            return (
              <Pressable
                key={th.id}
                testID={`theme-${th.id}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setTheme(th.id)}
                style={[styles.segment, i > 0 && { borderLeftColor: c.panelBorder, borderLeftWidth: theme.hairline }, active && { backgroundColor: c.accent }]}
              >
                <Text style={[t.barCount, { color: active ? c.background : c.text }]}>{th.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          {action('restart', 'Restart', onRestart)}
          {onQuit && action('quit', 'Quit to menu', onQuit)}
        </View>
        <Pressable
          testID="btn-resume"
          accessibilityRole="button"
          onPress={onResume}
          style={({ pressed }) => [styles.button, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[t.buttonLarge, { color: c.background }]}>RESUME</Text>
        </Pressable>
      </View>
      {explaining && <ExplainerSheet sim={sim} stat={explaining} onClose={() => setExplaining(null)} bottomInset={bottomInset} />}
    </View>
  );
}

/** Design S5b: a sheet from y = 150 explaining one stat. */
function ExplainerSheet({ sim, stat, onClose, bottomInset }: { sim: Sim; stat: StatKey; onClose: () => void; bottomInset: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const e = explain(sim, stat);
  const tone = { good: c.good, danger: c.danger, dim: c.textDim }[e.tone];
  return (
    <View style={[styles.sheet, { backgroundColor: c.panel, borderColor: c.panelBorder, borderTopWidth: theme.hairline }]} testID="explainer" accessibilityViewIsModal>
      <View style={styles.sheetHead}>
        <Text style={[t.chip, styles.chip, { color: tone, borderColor: tone, borderWidth: theme.hairline }]}>{e.chip}</Text>
        <Text style={[t.caps, { color: c.textDim }]}>{e.title}</Text>
        <Pressable
          testID="close-explainer"
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={[styles.close, { borderColor: c.panelBorder, borderWidth: theme.hairline }]}
        >
          <CloseIcon color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.sheetBody, { paddingBottom: bottomInset + 24 }]}>
        <Text style={[t.title, { color: c.text }]}>{e.headline}</Text>
        <Text style={[t.body, { color: c.text }]}>{e.body}</Text>
        <Text style={[t.caps, { color: c.textDim }]}>WHY IT HAPPENS</Text>
        {e.causes.map((cause, i) => (
          <Text key={i} style={[t.body, { color: c.text }]}>
            <Text style={{ color: c.textDim }}>{i + 1}. </Text>
            {cause}
          </Text>
        ))}
        {stat !== 'airborne' && (
          <>
            <Text style={[t.caps, { color: c.textDim }]}>THIS SESSION · {e.incidents.length}</Text>
            {e.incidents.length === 0 && <Text style={[t.small, { color: c.textDim }]}>None yet.</Text>}
            {e.incidents.slice(0, 8).map((i, k) => (
              <View key={k} style={styles.incident}>
                <Text style={[t.barCount, { color: c.text }]}>{i.who}</Text>
                <Text style={[t.smallTight, { color: c.textDim }]}>{i.time}</Text>
                <Text style={[t.small, styles.reason, { color: c.textDim }]} numberOfLines={1}>
                  {i.reason}
                </Text>
              </View>
            ))}
          </>
        )}
        <View style={[styles.tip, { borderColor: c.panelBorder, borderWidth: theme.hairline }]}>
          <Text style={[t.caps, { color: c.accent }]}>TIP</Text>
          <Text style={[t.body, { color: c.text }]}>{e.tip}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 4 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 12 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'flex-start', gap: 2, minHeight: 44, justifyContent: 'center' },
  dotted: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  segments: { flexDirection: 'row', alignSelf: 'flex-start' },
  segment: { minWidth: 88, height: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  button: { height: 56, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, top: 150, bottom: 0 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 8 },
  chip: { paddingVertical: 2, paddingHorizontal: 6 },
  close: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { paddingHorizontal: 16, gap: 10 },
  incident: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  reason: { flex: 1 },
  tip: { padding: 12, gap: 4, marginTop: 6 },
});
