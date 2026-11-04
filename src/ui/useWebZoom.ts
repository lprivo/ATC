import { useEffect, type RefObject } from 'react';
import { Platform } from 'react-native';
import { isTrackpadPinch, wheelDeltaPx, wheelZoomFactor } from './gestures';
import { trackpadPinchZoom, zoomAt, type Viewport } from './viewport';


/** The DOM element behind a View on react-native-web (null on native), for listeners RN doesn't expose. */
export function webElement(view: unknown): HTMLElement | null {
  if (Platform.OS !== 'web' || view == null) return null;
  return typeof (view as HTMLElement).addEventListener === 'function' ? (view as HTMLElement) : null;
}

/**
 * Web-only zoom input on the radar (no-op on native, where the touch pinch
 * covers it):
 * - Scroll wheel and Chrome/Firefox trackpad pinch (a ctrl+wheel): zoom around the pointer.
 * - macOS Safari trackpad pinch (`gesture*` events): zoom around the pointer.
 *   Unhandled, Safari zooms the whole page instead.
 * - iOS Safari also fires `gesture*` events for a two-finger touch pinch, with
 *   no pointer position. The radar's touch pinch already handles that, so they
 *   are only swallowed (no page zoom), never applied a second time.
 */
export function useWebZoom(host: RefObject<unknown>, cam: RefObject<Viewport>, updateCam: (next: (v: Viewport) => Viewport) => void) {
  useEffect(() => {
    const el = webElement(host.current);
    if (!el) return;
    const local = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const at = local(ev.clientX, ev.clientY);
      updateCam((v) => zoomAt(v, v.scale * wheelZoomFactor(wheelDeltaPx(ev)), at.x, at.y));
    };
    let startScale: number | null = null;
    const onGestureStart = (ev: Event) => {
      ev.preventDefault();
      startScale = cam.current.scale;
    };
    const onGestureChange = (ev: Event) => {
      ev.preventDefault();
      // Safari's GestureEvent isn't in the DOM typings; isTrackpadPinch checks the fields it needs.
      const g = ev as Event & { scale?: unknown; clientX?: unknown; clientY?: unknown };
      if (startScale == null || !isTrackpadPinch(g)) return;
      const at = local(g.clientX, g.clientY);
      const from = startScale;
      updateCam((v) => trackpadPinchZoom(v, from, g.scale, at));
    };
    const onGestureEnd = (ev: Event) => {
      ev.preventDefault();
      startScale = null;
    };
    const listeners: [string, (ev: never) => void, AddEventListenerOptions?][] = [
      ['wheel', onWheel, { passive: false }],
      ['gesturestart', onGestureStart],
      ['gesturechange', onGestureChange],
      ['gestureend', onGestureEnd],
    ];
    for (const [type, fn, opts] of listeners) el.addEventListener(type, fn as EventListener, opts);
    return () => {
      for (const [type, fn] of listeners) el.removeEventListener(type, fn as EventListener);
    };
    // The refs and updateCam are stable for the radar's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * While mounted (the game screen), stops Safari zooming the whole page with a
 * pinch that starts outside the radar (over the top bar or the sheet). Once
 * the page is zoomed, the browser keeps later pinches for itself and the map
 * can't be zoomed any more. No-op on native.
 */
export function usePreventPageZoom() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const block = (ev: Event) => ev.preventDefault();
    const types = ['gesturestart', 'gesturechange', 'gestureend'];
    for (const t of types) document.addEventListener(t, block);
    return () => {
      for (const t of types) document.removeEventListener(t, block);
    };
  }, []);
}
