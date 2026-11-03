import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { kv } from '../storage/kv';
import { memoryKv } from '../storage/memory';
import type { KV } from '../storage/types';
import { setEffectsEnabled, setMusicEnabled } from './audio';
import { setHapticsEnabled } from './haptics';
import { parseSettings, type Settings } from './settings';

const KEY = 'settings.v1';

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SettingsCtx | null>(null);

/**
 * Player settings, loaded synchronously from `storage` (the device by default)
 * on start and saved there on every change. `initial` (stories, tests) starts
 * from those settings instead, and unless a `storage` is given too, saves to
 * an in-memory store: starting values never reach the device.
 */
export function SettingsProvider({ children, initial, storage: given }: { children: ReactNode; initial?: Partial<Settings>; storage?: KV }) {
  const [storage] = useState<KV>(() => given ?? (initial ? memoryKv() : kv));
  const [settings, setSettings] = useState<Settings>(() => {
    const s = initial ? { ...parseSettings(null), ...initial } : parseSettings(storage.get(KEY));
    applyFeel(s); // before the first frame
    return s;
  });
  // Save changes, not what was just loaded.
  const loaded = useRef(settings);
  useEffect(() => {
    applyFeel(settings);
    if (settings !== loaded.current) storage.set(KEY, JSON.stringify(settings));
  }, [settings, storage]);
  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Haptics, effects and music follow the settings (module state, read where they play). */
function applyFeel(s: Settings) {
  setHapticsEnabled(s.haptics);
  setEffectsEnabled(s.sound);
  setMusicEnabled(s.music);
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
