import type { Preview } from '@storybook/react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { BestScores } from '../src/game/bestScores';
import { EntitlementProvider } from '../src/game/EntitlementContext';
import { ResultsProvider, type SessionResult } from '../src/game/ResultsContext';
import { SettingsProvider } from '../src/game/SettingsContext';
import type { Entitlement } from '../src/game/session';
import type { Settings } from '../src/game/settings';
import { memoryKv } from '../src/storage/memory';
import { useAppFonts } from '../src/theme/fonts';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { themes } from '../src/theme/themes';

/**
 * Per-story app state, set with `parameters.app` (merged over the defaults):
 * theme, free or full version, settings (over the defaults: Radar, not
 * following the system), best scores and the last result. Nothing is read
 * from or written to the device.
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
  // The story's own store: settings and best scores changed in a story never reach the device's.
  const [storage] = useState(() => memoryKv());
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: themes[0].colors.background }} />;
  return (
    <SafeAreaProvider>
      <SettingsProvider storage={storage} initial={{ followSystem: false, ...app.settings, theme: app.theme ?? app.settings?.theme ?? 'radar' }}>
        <ThemeProvider>
          <EntitlementProvider initial={app.entitlement ?? 'free'}>
            <ResultsProvider storage={storage} initialBests={app.bests ?? {}} initialLast={app.last ?? null}>
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
