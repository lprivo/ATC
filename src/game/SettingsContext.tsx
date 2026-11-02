import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { kv } from '../storage/kv';
import { setHapticsEnabled } from './haptics';
import { parseSettings, type Settings } from './settings';

const KEY = 'settings.v1';

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

/** Player settings, loaded synchronously from the device on start and saved on every change. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => parseSettings(kv.get(KEY)));
  useEffect(() => {
    kv.set(KEY, JSON.stringify(settings));
    setHapticsEnabled(settings.haptics);
  }, [settings]);
  const value = useMemo(() => ({ settings, update: (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })) }), [settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
