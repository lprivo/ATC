import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { themes, type Theme } from './themes';

interface ThemeCtx {
  theme: Theme;
  /** All selectable themes, for pickers. */
  themes: readonly Theme[];
  setTheme: (id: string) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const value = useMemo(
    () => ({
      theme: themes[index],
      themes,
      setTheme: (id: string) => {
        const i = themes.findIndex((t) => t.id === id);
        if (i >= 0) setIndex(i);
      },
    }),
    [index],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
