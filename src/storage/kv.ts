// On-device key-value storage (native): SQLite-backed, synchronous reads so
// settings are ready on the first frame. The web build uses kv.web.ts.
import Storage from 'expo-sqlite/kv-store';

/** Storage errors (corrupt or locked database, disk full) never crash the app: reads return null, writes are skipped. */
export const kv = {
  get: (key: string): string | null => {
    try {
      return Storage.getItemSync(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      Storage.setItemSync(key, value);
    } catch {
      // Not saved this time; the next change tries again.
    }
  },
};
