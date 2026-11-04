/** Synchronous key-value storage: the device's (kv.ts, kv.web.ts) or an in-memory one (memory.ts). */
export interface KV {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
}
