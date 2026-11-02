import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  const [settings, setSettings] = useState<Settings>(() => {
    const s = parseSettings(kv.get(KEY));
    setHapticsEnabled(s.haptics); // before the first frame
    return s;
  });
  // Save changes, not what was just loaded.
  const loaded = useRef(settings);
  useEffect(() => {
    setHapticsEnabled(settings.haptics);
    if (settings !== loaded.current) kv.set(KEY, JSON.stringify(settings));
  }, [settings]);
  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
