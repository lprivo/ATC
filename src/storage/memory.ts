// An in-memory key-value store for stories and tests. Pure (no React Native imports).
import type { KV } from './types';

/** A store that lives only as long as the object: nothing is read from or written to the device. */
export function memoryKv(initial: Record<string, string> = {}): KV {
  const data = new Map(Object.entries(initial));
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => {
      data.set(key, value);
    },
  };
}
