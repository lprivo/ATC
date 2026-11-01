// The radar's touch state machine: plane taps and path drawing, one-finger pan,
// two-finger pinch, taps and double-taps on empty radar. Pure (no React / React
// Native imports): events go in, the next state and a list of effects come out,
// so every transition is unit tested.
import type { Vec2 } from '../engine/types';
import { isDoubleTap, isTap, pinchOf, TAP, type TouchPt } from './gestures';
import { panBy, toWorld, toggleRunwayZoom, zoomAt, type Viewport } from './viewport';

/** Hold a plane this long to start drawing (design: 250 ms). */
export const HOLD_MS = 250;
/** Dragging this far off a plane starts drawing without waiting for the hold. */
export const DRAG_START_PT = 10;
/** Design: record a drawn point every 14 pt of finger movement. */
export const DRAFT_SPACING_PT = 14;

export interface Touch extends TouchPt {
  id: number;
}

export type Mode = 'none' | 'plane' | 'pan' | 'pinch';

export interface GestureState {
  mode: Mode;
  start: TouchPt;
  startT: number;
  planeId: string | null;
  drawing: boolean;
  moved: boolean;
  lastPt: TouchPt;
  /** Drawn path in world coordinates; the first point is the plane's position. */
  points: Vec2[];
  /** Camera and finger pair when the current pan or pinch (re)started. */
  camStart: Viewport;
  pinch: { dist: number; mid: TouchPt; ids: [number, number] };
  lastTap: { t: number; at: TouchPt } | null;
}

export type Effect =
  | { kind: 'camera'; vp: Viewport }
  | { kind: 'select'; id: string | null }
  | { kind: 'route'; id: string; points: Vec2[] }
  /** Start the hold timer for the plane under the finger. */
  | { kind: 'armHold' }
  | { kind: 'cancelHold' }
  /** The drawn path changed (redraw it). */
  | { kind: 'draft' };

export interface Step {
  state: GestureState;
  effects: Effect[];
}

export function initialGesture(cam: Viewport): GestureState {
  return {
    mode: 'none',
    start: { x: 0, y: 0 },
    startT: 0,
    planeId: null,
    drawing: false,
    moved: false,
    lastPt: { x: 0, y: 0 },
    points: [],
    camStart: cam,
    pinch: { dist: 1, mid: { x: 0, y: 0 }, ids: [-1, -1] },
    lastTap: null,
  };
}

function startPinch(st: GestureState, a: Touch, b: Touch, cam: Viewport): Step {
  const p = pinchOf(a, b);
  // A second finger turns any gesture into a pinch; a half-drawn path is dropped.
  const effects: Effect[] = [{ kind: 'cancelHold' }];
  if (st.drawing) effects.push({ kind: 'draft' });
  return {
    state: { ...st, mode: 'pinch', moved: true, drawing: false, points: [], camStart: cam, pinch: { ...p, ids: [a.id, b.id] } },
    effects,
  };
}

/** First finger down. `hit` is the plane under it, if any. */
export function onDown(st: GestureState, touches: Touch[], now: number, hit: string | null, cam: Viewport): Step {
  const base: GestureState = { ...st, start: touches[0], startT: now, lastPt: touches[0], moved: false, drawing: false, points: [], camStart: cam };
  if (touches.length >= 2) return startPinch(base, touches[0], touches[1], cam);
  if (hit) return { state: { ...base, mode: 'plane', planeId: hit }, effects: [{ kind: 'armHold' }] };
  return { state: { ...base, mode: 'pan', planeId: null }, effects: [{ kind: 'cancelHold' }] };
}

/** The hold timer fired, or a drag off the plane began: start drawing from the plane's position. */
export function beginDraw(st: GestureState, planePos: Vec2 | undefined): Step {
  if (st.mode !== 'plane' || st.drawing || !st.planeId || !planePos) return { state: st, effects: [] };
  return {
    state: { ...st, drawing: true, points: [{ ...planePos }] },
    effects: [{ kind: 'select', id: st.planeId }, { kind: 'draft' }],
  };
}

export function onMove(st: GestureState, touches: Touch[], cam: Viewport, planePos: Vec2 | undefined): Step {
  if (touches.length >= 2) {
    const [a, b] = touches;
    // (Re)baseline when a pinch starts, or when the finger pair changes mid-pinch.
    if (st.mode !== 'pinch' || st.pinch.ids[0] !== a.id || st.pinch.ids[1] !== b.id) return startPinch(st, a, b, cam);
    const now = pinchOf(a, b);
    const k = st.camStart.scale * (now.dist / Math.max(1, st.pinch.dist));
    const z = zoomAt(st.camStart, k, st.pinch.mid.x, st.pinch.mid.y);
    return { state: st, effects: [{ kind: 'camera', vp: panBy(z, now.mid.x - st.pinch.mid.x, now.mid.y - st.pinch.mid.y) }] };
  }
  // One finger lifted mid-pinch: freeze until all fingers are up.
  if (st.mode === 'pinch' || st.mode === 'none' || touches.length === 0) return { state: st, effects: [] };
  const p = touches[0];
  let state = st;
  const effects: Effect[] = [];
  const threshold = st.mode === 'pan' ? TAP.maxMovePt : DRAG_START_PT;
  if (!st.moved && Math.hypot(p.x - st.start.x, p.y - st.start.y) > threshold) {
    state = { ...state, moved: true };
    if (state.mode === 'plane' && !state.drawing) {
      effects.push({ kind: 'cancelHold' });
      const begun = beginDraw(state, planePos);
      state = begun.state;
      effects.push(...begun.effects);
    }
  }
  if (state.mode === 'pan' && state.moved) {
    effects.push({ kind: 'camera', vp: panBy(state.camStart, p.x - state.start.x, p.y - state.start.y) });
  } else if (state.drawing && Math.hypot(p.x - state.lastPt.x, p.y - state.lastPt.y) >= DRAFT_SPACING_PT) {
    state = { ...state, lastPt: p, points: [...state.points, toWorld(cam, p.x, p.y)] };
    effects.push({ kind: 'draft' });
  }
  return { state, effects };
}

/** Last finger up at `p`. */
export function onUp(st: GestureState, p: TouchPt, now: number, cam: Viewport): Step {
  const effects: Effect[] = [{ kind: 'cancelHold' }];
  let lastTap = st.lastTap;
  if (st.mode === 'plane' && st.planeId) {
    if (st.drawing && st.moved) {
      // Always end exactly where the finger lifted, even if it moved less than the spacing since the last point.
      effects.push({ kind: 'route', id: st.planeId, points: [...st.points.slice(1), toWorld(cam, p.x, p.y)] });
    } else if (!st.moved) {
      // A tap, or a long press that never moved, only selects. It must not
      // turn into a tiny route that would cancel the plane's clearance.
      effects.push({ kind: 'select', id: st.planeId });
    }
  } else if (st.mode === 'pan' && isTap(Math.hypot(p.x - st.start.x, p.y - st.start.y), now - st.startT)) {
    if (isDoubleTap(st.lastTap, now, p)) {
      lastTap = null;
      effects.push({ kind: 'camera', vp: toggleRunwayZoom(cam) });
    } else {
      lastTap = { t: now, at: p };
      effects.push({ kind: 'select', id: null });
    }
  }
  if (st.drawing) effects.push({ kind: 'draft' });
  return { state: { ...st, mode: 'none', drawing: false, points: [], lastTap }, effects };
}

/** The OS took the touch away (e.g. a system gesture). */
export function onCancel(st: GestureState): Step {
  return {
    state: { ...st, mode: 'none', drawing: false, points: [] },
    effects: st.drawing ? [{ kind: 'cancelHold' }, { kind: 'draft' }] : [{ kind: 'cancelHold' }],
  };
}
