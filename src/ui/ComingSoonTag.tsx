import { StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Design S2/S4: the boxed COMING SOON tag on inert features (Barlow 600 11, .12em, padding 5 7). */
export function ComingSoonTag() {
  const { theme } = useTheme();
  const c = theme.colors;
  return <Text style={[theme.type.tag, styles.tag, { color: c.textDim, borderColor: c.textDim, borderWidth: theme.hairline }]}>COMING SOON</Text>;
}

const styles = StyleSheet.create({
  tag: { paddingVertical: 5, paddingHorizontal: 7 },
});
