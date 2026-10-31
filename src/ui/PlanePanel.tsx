import { Pressable, StyleSheet, Text, View } from 'react-native';
import { normDeg } from '../engine/math';
import type { Sim } from '../engine/sim';
import { useTheme } from '../theme/ThemeContext';
import { Dial } from './Dial';

const HDG_STEP = 5;
const ALT_STEP = 1000;
const SPD_STEP = 10;

const pad3 = (n: number) => String(Math.round(n)).padStart(3, '0');
const ft = (n: number) => `${Math.round(n).toLocaleString('en-GB')}`;

interface Props {
  sim: Sim;
  selectedId: string | null;
  onClose: () => void;
}

/** Bottom sheet: the selected plane's strip and its three dials, or hints + log. */
export function PlanePanel({ sim, selectedId, onClose }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const p = selectedId ? sim.plane(selectedId) : undefined;
  const mono = { fontFamily: theme.font.mono };

  if (!p) {
    return (
      <View style={[styles.panel, { backgroundColor: c.panel, borderColor: c.panelBorder }]}>
        <Text style={[styles.hint, { color: c.textDim }]}>
          Tap a plane to control it · Hold & drag from a plane to draw its path · End a path on a runway
          threshold to land
        </Text>
        <View style={styles.log}>
          {sim.events.slice(-4).reverse().map((e, i) => (
            <Text key={`${e.time}-${i}`} style={[styles.logLine, mono, { color: i === 0 ? c.text : c.textDim }]} numberOfLines={1}>
              {e.text}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  // Heading dial: steps from the commanded heading. If the plane is following a
  // drawn path, the first nudge starts from where it's pointing now.
  const following = p.route.length > 0;
  const status = p.clearedRunway ? `Cleared ${p.clearedRunway.id}` : following ? 'Own navigation' : 'Heading';

  return (
    <View style={[styles.panel, { backgroundColor: c.panel, borderColor: c.panelBorder }]} testID="plane-panel">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.callsign, mono, { color: c.text }]}>{p.callsign}</Text>
          <Text style={[styles.sub, mono, { color: p.clearedRunway ? c.accent : c.textDim }]}>
            {p.aircraftType} · {status}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { backgroundColor: c.button }]} testID="close-panel">
          <Text style={{ color: c.buttonText, fontSize: 16 }}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.dials}>
        <Dial
          testID="dial-hdg"
          label="HDG"
          value={following ? '---' : pad3(p.target.heading)}
          current={`now ${pad3(p.heading)}`}
          onStep={(d) => {
            const base = p.route.length > 0 ? Math.round(p.heading / HDG_STEP) * HDG_STEP : p.target.heading;
            sim.setHeading(p.id, normDeg(base + d * HDG_STEP));
          }}
        />
        <Dial
          testID="dial-alt"
          label="ALT ft"
          value={ft(p.target.altitude)}
          current={`now ${ft(p.altitude)}`}
          onStep={(d) => sim.setAltitude(p.id, Math.round(p.target.altitude / ALT_STEP) * ALT_STEP + d * ALT_STEP)}
        />
        <Dial
          testID="dial-spd"
          label="SPD kt"
          value={String(Math.round(p.target.speed))}
          current={`now ${Math.round(p.speed)}`}
          onStep={(d) => sim.setSpeed(p.id, Math.round(p.target.speed / SPD_STEP) * SPD_STEP + d * SPD_STEP)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 1, padding: 10, gap: 8, minHeight: 210 },
  header: { flexDirection: 'row', alignItems: 'center' },
  callsign: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dials: { flexDirection: 'row', gap: 8 },
  hint: { fontSize: 13, lineHeight: 18 },
  log: { gap: 3, marginTop: 4 },
  logLine: { fontSize: 12 },
});
