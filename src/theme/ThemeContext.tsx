import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { themes, type Theme } from './themes';

interface ThemeCtx {
  theme: Theme;
  cycleTheme: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const value = useMemo(
    () => ({ theme: themes[index], cycleTheme: () => setIndex((i) => (i + 1) % themes.length) }),
    [index],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
