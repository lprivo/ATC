import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
} from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { FONT_FAMILY } from './themes';

/** Every face the theme's FONT_FAMILY names, keyed by those names. */
const FACES: Record<(typeof FONT_FAMILY)[keyof typeof FONT_FAMILY], number> = {
  [FONT_FAMILY.condensed400]: BarlowCondensed_400Regular,
  [FONT_FAMILY.condensed500]: BarlowCondensed_500Medium,
  [FONT_FAMILY.condensed600]: BarlowCondensed_600SemiBold,
  [FONT_FAMILY.body400]: Barlow_400Regular,
  [FONT_FAMILY.body500]: Barlow_500Medium,
  [FONT_FAMILY.body600]: Barlow_600SemiBold,
  [FONT_FAMILY.body700]: Barlow_700Bold,
};

/**
 * Loads the bundled Barlow / Barlow Condensed faces (OFL, shipped with the app,
 * no network). Returns true once they are usable, or if loading failed, so the
 * app still starts with system fonts rather than hanging.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FACES);
  return loaded || error != null;
}
