import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Sim } from '../engine/sim';
import { isFollowingRoute, nextAltitude, nextHeading, nextSpeed } from '../game/controls';
import { useTheme } from '../theme/ThemeContext';
import { Dial } from './Dial';
import { feet, pad3 } from './format';

interface Props {
  sim: Sim;
  selectedId: string | null;
  onClose: () => void;
  /** Called after a dial changes the sim, so the screen can redraw while paused. */
  onCommand: () => void;
}

/** Bottom sheet: the selected plane's strip and its three dials, or hints + log. */
export function PlanePanel({ sim, selectedId, onClose, onCommand }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const p = selectedId ? sim.plane(selectedId) : undefined;

  if (!p) {
    return (
      <View style={[styles.panel, { backgroundColor: c.panel, borderColor: c.panelBorder }]}>
        <Text style={[theme.type.small, { color: c.textDim }]}>
          Tap a plane to control it · Hold & drag from a plane to draw its path · End a path on a runway
          threshold to land
        </Text>
        <View style={styles.log}>
          {sim.events.slice(-4).reverse().map((e, i) => (
            <Text key={`${e.time}-${i}`} style={[theme.type.smallTight, { color: i === 0 ? c.text : c.textDim }]} numberOfLines={1}>
              {e.text}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  const following = isFollowingRoute(p);
  const status = p.clearedRunway ? `Cleared ${p.clearedRunway.id}` : following ? 'Own navigation' : 'Heading';
  const command = (fn: () => void) => {
    fn();
    onCommand();
  };

  return (
    <View style={[styles.panel, { backgroundColor: c.panel, borderColor: c.panelBorder }]} testID="plane-panel">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.type.callsign, { color: c.planeSelected }]}>{p.callsign}</Text>
          <Text style={[theme.type.small, styles.sub, { color: p.clearedRunway ? c.accent : c.textDim }]}>
            {p.aircraftType} · {status}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { borderColor: c.panelBorder, borderWidth: theme.hairline }]} testID="close-panel">
          <Text style={[theme.type.barCount, { color: c.buttonText }]}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.dials}>
        <Dial
          testID="dial-hdg"
          label="HDG"
          value={following ? '---' : pad3(p.target.heading)}
          current={`now ${pad3(p.heading)}`}
          onStep={(d) => command(() => sim.setHeading(p.id, nextHeading(p, d)))}
        />
        <Dial
          testID="dial-alt"
          label="ALT ft"
          value={feet(p.target.altitude)}
          current={`now ${feet(p.altitude)}`}
          onStep={(d) => command(() => sim.setAltitude(p.id, nextAltitude(p, d)))}
        />
        <Dial
          testID="dial-spd"
          label="SPD kt"
          value={String(Math.round(p.target.speed))}
          current={`now ${Math.round(p.speed)}`}
          onStep={(d) => command(() => sim.setSpeed(p.id, nextSpeed(p, d)))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 1, padding: 10, gap: 8, minHeight: 210 },
  header: { flexDirection: 'row', alignItems: 'center' },
  sub: { marginTop: 4 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dials: { flexDirection: 'row', gap: 8 },
  log: { gap: 3, marginTop: 4 },
});
