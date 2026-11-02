// Per-weight subpath imports: each pulls in only its own .ttf. Importing from
// the package root would require (and bundle) every face of the family.
import { Barlow_300Light } from '@expo-google-fonts/barlow/300Light';
import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { BarlowCondensed_400Regular } from '@expo-google-fonts/barlow-condensed/400Regular';
import { BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed/500Medium';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { FONT_FAMILY } from './themes';

/** Every face the theme's FONT_FAMILY names, keyed by those names. */
const FACES: Record<(typeof FONT_FAMILY)[keyof typeof FONT_FAMILY], number> = {
  [FONT_FAMILY.condensed400]: BarlowCondensed_400Regular,
  [FONT_FAMILY.condensed500]: BarlowCondensed_500Medium,
  [FONT_FAMILY.condensed600]: BarlowCondensed_600SemiBold,
  [FONT_FAMILY.body300]: Barlow_300Light,
  [FONT_FAMILY.body400]: Barlow_400Regular,
  [FONT_FAMILY.body500]: Barlow_500Medium,
  [FONT_FAMILY.body600]: Barlow_600SemiBold,
  [FONT_FAMILY.body700]: Barlow_700Bold,
};

/**
 * Loads the bundled Barlow / Barlow Condensed faces (OFL, shipped with the app,
 * no network). Returns true once they are usable, or if loading failed, so the
 * app still starts with system fonts rather than hanging; a failure is logged in dev.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FACES);
  useEffect(() => {
    if (__DEV__ && error) console.warn('Font loading failed; falling back to system fonts.', error);
  }, [error]);
  return loaded || error != null;
}
