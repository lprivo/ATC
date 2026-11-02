// On-device key-value storage (native): SQLite-backed, synchronous reads so
// settings are ready on the first frame. The web build uses kv.web.ts.
import Storage from 'expo-sqlite/kv-store';

export const kv = {
  get: (key: string): string | null => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
};
