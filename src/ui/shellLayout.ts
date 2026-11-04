import { StyleSheet } from 'react-native';

/**
 * Menu-type screens (menu, settings, airports, session, scores, summary) are
 * laid out for a phone. On a wider screen (iPad, or a browser window while
 * testing) they stay this wide and centred; the navigation stack's themed
 * background fills the rest.
 */
export const SHELL_MAX_WIDTH = 480;

/** Spread into a shell screen's root style. */
export const shellColumn = StyleSheet.create({
  column: { width: '100%', maxWidth: SHELL_MAX_WIDTH, alignSelf: 'center' },
}).column;
