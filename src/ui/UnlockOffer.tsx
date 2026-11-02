import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATALOGUE } from '../engine/data/airports';
import { useTheme } from '../theme/ThemeContext';
import { CloseIcon } from './icons';

/**
 * The full-version offer, opened from locked airports and session options.
 * Only the entry points are designed; there is no store or purchase yet (the
 * app is offline only), so the buy button is disabled and the price is a placeholder.
 */
export function UnlockOffer({ reason, onClose, bottomInset }: { reason?: string; onClose: () => void; bottomInset: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const t = theme.type;
  return (
    // A real Modal: Android back closes it (onRequestClose), and it is modal for screen readers on both platforms.
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={[styles.fill, styles.scrim, { backgroundColor: c.scrim }]} testID="unlock-offer">
      <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Close offer" />
      <View style={[styles.sheet, { backgroundColor: c.panel, borderTopColor: c.panelBorder, borderTopWidth: theme.hairline, paddingBottom: bottomInset + 20 }]}>
        <View style={styles.head}>
          <Text style={[t.caps, { color: c.textDim }]}>FULL VERSION</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} testID="close-offer" style={[styles.close, { borderColor: c.panelBorder, borderWidth: theme.hairline }]}>
            <CloseIcon color={c.text} />
          </Pressable>
        </View>
        <Text style={[t.title, { color: c.text }]}>All airports, your own sessions</Text>
        {reason && <Text style={[t.small, { color: c.textDim }]}>{reason}</Text>}
        {[`${CATALOGUE.length} airports in Europe, the Americas and Asia (more arriving in updates)`, 'Light, Steady or Busy traffic', '15, 30 or 60 minute sessions, or endless', 'One purchase, no subscription'].map((line) => (
          <Text key={line} style={[t.body, { color: c.text }]}>
            <Text style={{ color: c.good }}>✓ </Text>
            {line}
          </Text>
        ))}
        <View style={[styles.buy, { backgroundColor: c.accent, opacity: 0.5 }]} accessible accessibilityRole="button" accessibilityState={{ disabled: true }}>
          <Text style={[t.buttonLarge, { color: c.background }]}>UNLOCK · € —</Text>
        </View>
        <Text style={[t.small, styles.centre, { color: c.textDim }]}>The store isn’t open yet.</Text>
      </View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { justifyContent: 'flex-end' },
  sheet: { padding: 16, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center' },
  close: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  buy: { height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  centre: { textAlign: 'center' },
});
