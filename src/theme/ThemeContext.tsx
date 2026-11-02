import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../game/SettingsContext';
import { effectiveTheme } from '../game/settings';
import { themes, type Theme } from './themes';

interface ThemeCtx {
  theme: Theme;
  /** All selectable themes, for pickers. */
  themes: readonly Theme[];
  /** Choose a theme (this also turns "follow system" off). */
  setTheme: (id: string) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

/** The theme from the player's settings (or the system's light/dark mode when following it). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();
  const scheme = useColorScheme();
  const id = effectiveTheme(settings, scheme);
  const value = useMemo(
    () => ({
      theme: themes.find((t) => t.id === id) ?? themes[0],
      themes,
      // Picking the theme already shown changes nothing (and keeps follow-system on).
      setTheme: (next: string) => {
        if (next !== id) update({ theme: next, followSystem: false });
      },
    }),
    [id, update],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
