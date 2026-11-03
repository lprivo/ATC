// On-device key-value storage (web): localStorage. (expo-sqlite on web needs
// wasm and cross-origin-isolation headers, which a plain web preview lacks.)
import type { KV } from './types';

export const kv: KV = {
  get: (key: string): string | null => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode or storage full: settings just don't persist.
    }
  },
};
