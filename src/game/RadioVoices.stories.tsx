import type { Meta, StoryObj } from '@storybook/react-native';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { playTransmission, randomRate } from './clipPlayer';
import { transmission, type CallChanges, type PlaneNow } from './radio';
import { compose, controllerOf, instructionsFor, pilotFor, RadioMemory, type Segment } from './radioScript';
import { VOICE_CLIPS, VOICE_TEXT } from './voiceClips';

/**
 * Listening page for the radio voices (issue #49): pick a plane and a command
 * and hear the controller's call and the pilot's readback, stitched from the
 * Kokoro clips (a different phrasing and takes each time), or the phone's
 * own voice to compare. Story only: not part of the app.
 */
const meta = { title: 'Audio/Radio voices' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const PLANES: PlaneNow[] = [
  { callsign: 'WZZ9003', heading: 80, altitude: 6000, speed: 230 },
  { callsign: 'RYR41HB', heading: 312, altitude: 5000, speed: 210 },
  { callsign: 'BAW99', heading: 135, altitude: 9000, speed: 250 },
  { callsign: 'LOT537', heading: 250, altitude: 11000, speed: 260 },
];
const COMMANDS: { label: string; changes: CallChanges }[] = [
  { label: 'Descend 4,000', changes: { altitude: 4000 } },
  { label: 'Descend 3,500', changes: { altitude: 3500 } },
  { label: 'Climb FL120', changes: { altitude: 12000 } },
  { label: 'Turn left 040', changes: { heading: 40 } },
  { label: 'Turn right 190', changes: { heading: 190 } },
  { label: 'Reduce 180', changes: { speed: 180 } },
  { label: 'Cleared 13L', changes: { land: '13L' } },
  { label: 'Heading + alt + speed', changes: { heading: 40, altitude: 4000, speed: 180 } },
];

const caption = (segs: Segment[]) => segs.map((s) => VOICE_TEXT[s.piece] ?? s.piece).join(' ');

function RadioLab() {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  const [plane, setPlane] = useState(PLANES[0]);
  const [lines, setLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const memory = useRef(new RadioMemory());

  const play = async (changes: CallChanges, mode: 'clips' | 'phone') => {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'phone') {
        const tx = transmission('1', changes, plane)!;
        setLines([`ATC: ${tx.controller}`, `Pilot: ${tx.readback}`]);
        await new Promise<void>((r) => Speech.speak(tx.controller, { language: 'en-GB', onDone: r, onError: () => r() }));
        await new Promise<void>((r) => Speech.speak(tx.readback, { language: 'en-US', onDone: r, onError: () => r() }));
        return;
      }
      const ins = instructionsFor(changes, plane);
      const ctl = controllerOf(VOICE_CLIPS)!;
      const pilot = pilotFor(plane.callsign, VOICE_CLIPS)!;
      const base = { clips: VOICE_CLIPS, callsign: plane.callsign, instructions: ins, memory: memory.current, rng: Math.random, planeId: plane.callsign };
      const a = compose({ ...base, role: 'controller', voice: ctl });
      const b = compose({ ...base, role: 'pilot', voice: pilot });
      setLines([`ATC (${ctl}): ${caption(a)}`, `Pilot (${pilot}): ${caption(b)}`]);
      await playTransmission(a, { rate: randomRate() });
      await new Promise((r) => setTimeout(r, 350));
      await playTransmission(b, { rate: randomRate() });
    } finally {
      setBusy(false);
    }
  };

  const button = (label: string, onPress: () => void, selected = false, key?: string) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, { borderColor: c.panelBorder, borderWidth: theme.hairline, backgroundColor: selected ? c.accent : pressed ? c.buttonPressed : c.button }]}
    >
      <Text style={[t.button, { color: selected ? c.background : c.buttonText }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.page}>
      <Text style={[t.title, { color: c.text }]}>Radio voices</Text>
      <Text style={[t.small, { color: c.textDim }]}>Each press picks a new phrasing and takes. The pilot's voice follows the callsign.</Text>
      <Text style={[t.caps, { color: c.textDim }]}>PLANE</Text>
      <View style={styles.row}>{PLANES.map((p) => button(p.callsign, () => setPlane(p), p === plane))}</View>
      <Text style={[t.caps, { color: c.textDim }]}>KOKORO CLIPS</Text>
      <View style={styles.row}>{COMMANDS.map((cmd) => button(cmd.label, () => play(cmd.changes, 'clips'), false, `k-${cmd.label}`))}</View>
      <Text style={[t.caps, { color: c.textDim }]}>PHONE VOICE (TO COMPARE)</Text>
      <View style={styles.row}>{COMMANDS.slice(0, 4).map((cmd) => button(cmd.label, () => play(cmd.changes, 'phone'), false, `p-${cmd.label}`))}</View>
      <View style={[styles.log, { borderColor: c.panelBorder, borderWidth: theme.hairline }]}>
        {lines.map((l, i) => (
          <Text key={i} style={[t.body, { color: c.text }]}>
            {l}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

export const Listen: Story = { name: 'Listen', render: () => <RadioLab /> };

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 12, height: 40, justifyContent: 'center' },
  log: { padding: 12, gap: 6, minHeight: 90 },
});
