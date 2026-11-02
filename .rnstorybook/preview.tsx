import type { Preview } from '@storybook/react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { BestScores } from '../src/game/bestScores';
import { EntitlementProvider } from '../src/game/EntitlementContext';
import { ResultsProvider, type SessionResult } from '../src/game/ResultsContext';
import { SettingsProvider } from '../src/game/SettingsContext';
import type { Entitlement } from '../src/game/session';
import type { Settings } from '../src/game/settings';
import { useAppFonts } from '../src/theme/fonts';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { themes } from '../src/theme/themes';

/**
 * Per-story app state, set with `parameters.app` (merged over the defaults):
 * theme, free or full version, settings, best scores and the last result.
 * Nothing is read from or written to the device.
 */
export interface AppParams {
  theme?: 'radar' | 'paper';
  entitlement?: Entitlement;
  settings?: Partial<Settings>;
  bests?: BestScores;
  last?: SessionResult | null;
}

/** The app's own providers and fonts around every story, as in src/app/_layout.tsx. */
function AppShell({ app, children }: { app: AppParams; children: ReactNode }) {
  const fontsReady = useAppFonts();
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: themes[0].colors.background }} />;
  return (
    <SafeAreaProvider>
      <SettingsProvider initial={{ ...app.settings, theme: app.theme ?? 'radar', followSystem: false }}>
        <ThemeProvider>
          <EntitlementProvider initial={app.entitlement ?? 'free'}>
            <ResultsProvider initialBests={app.bests ?? {}} initialLast={app.last ?? null}>
              <View style={{ flex: 1 }}>{children}</View>
            </ResultsProvider>
          </EntitlementProvider>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const preview: Preview = {
  parameters: {},
  decorators: [
    (Story, context) => {
      const app = (context.parameters.app ?? {}) as AppParams;
      // Remount the providers when the story's app state changes, so each story starts clean.
      return (
        <AppShell key={JSON.stringify(app)} app={app}>
          <Story />
        </AppShell>
      );
    },
  ],
};

export default preview;
