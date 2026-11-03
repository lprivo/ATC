import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The system's Reduce Motion setting, read once for the whole app and kept up
 * to date by one listener. It's `null` until the system has answered; callers
 * start no motion until it's `false`, so nothing starts moving for a player
 * who asked for no motion and then stops.
 */
let reduce: boolean | null = null;
const subscribers = new Set<() => void>();
let started = false;

function set(v: boolean) {
  reduce = v;
  subscribers.forEach((f) => f());
}

function start() {
  if (started) return;
  started = true;
  let heard = false;
  // A change reported before the first read answers is newer than that answer.
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
    heard = true;
    set(v);
  });
  AccessibilityInfo.isReduceMotionEnabled().then(
    (v) => heard || set(v),
    () => heard || set(false),
  );
}

function subscribe(onChange: () => void) {
  start();
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

/** Whether the system's Reduce Motion setting is on (`null` until known), kept up to date. */
export function useReduceMotion(): boolean | null {
  return useSyncExternalStore(subscribe, () => reduce);
}
