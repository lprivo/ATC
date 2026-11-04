import { describe, expect, it } from 'vitest';
import { beginDraw, initialGesture, onCancel, onDown, onMove, onUp, type Effect, type GestureState, type Touch } from './radarGestures';
import { defaultViewport, toWorld, ZOOM, type Viewport } from './viewport';

const cam: Viewport = defaultViewport(390, 700);
const t = (x: number, y: number, id = 0): Touch => ({ x, y, id });
const kinds = (e: Effect[]) => e.map((x) => x.kind);
const cameraOf = (e: Effect[]) => (e.find((x) => x.kind === 'camera') as { vp: Viewport } | undefined)?.vp;
const planePos = { x: 1, y: 2 };

describe('radar gestures: plane', () => {
  const down = () => onDown(initialGesture(cam), [t(100, 100)], 0, 'p1', cam);

  it('a finger on a plane arms the hold timer; a tap selects it', () => {
    const d = down();
    expect(d.state.mode).toBe('plane');
    expect(kinds(d.effects)).toEqual(['armHold']);
    const u = onUp(d.state, t(101, 100), 120, cam);
    expect(u.effects).toContainEqual({ kind: 'select', id: 'p1' });
    expect(kinds(u.effects)).not.toContain('route');
  });

  it('holding starts a draw from the plane position; moving records points every 14 pt; release sets the route', () => {
    let s: GestureState = down().state;
    const held = beginDraw(s, planePos);
    expect(held.effects).toContainEqual({ kind: 'select', id: 'p1' });
    s = held.state;
    expect(s.points).toEqual([planePos]);
    s = onMove(s, [t(112, 100)], cam, planePos).state; // moved (>10) but < 14 since last point
    expect(s.points).toHaveLength(1);
    s = onMove(s, [t(120, 100)], cam, planePos).state;
    expect(s.points).toHaveLength(2);
    const u = onUp(s, t(125, 103), 900, cam);
    const route = u.effects.find((e) => e.kind === 'route') as { points: unknown[] };
    // Plane position dropped; ends exactly at the release point.
    expect(route.points).toHaveLength(2);
    expect(route.points[1]).toEqual(toWorld(cam, 125, 103));
    expect(u.state.drawing).toBe(false);
  });

  it('while drawing, the finger is tracked every move; the release point travels with the route', () => {
    let s = beginDraw(down().state, planePos).state;
    s = onMove(s, [t(115, 100)], cam, planePos).state; // 15 pt: moved, first point recorded
    s = onMove(s, [t(120, 100)], cam, planePos).state; // 5 pt more: no new point, but the finger moved
    expect(s.points).toHaveLength(2);
    expect(s.finger).toEqual(t(120, 100));
    const u = onUp(s, t(130, 100), 900, cam);
    expect(u.effects.find((e) => e.kind === 'route')).toMatchObject({ at: t(130, 100) });
  });

  it('dragging straight off a plane starts drawing without waiting for the hold', () => {
    const m = onMove(down().state, [t(115, 100)], cam, planePos);
    expect(m.state.drawing).toBe(true);
    expect(kinds(m.effects)).toEqual(expect.arrayContaining(['cancelHold', 'select', 'draft']));
  });

  it('a stale hold timer does nothing once the gesture is no longer on a plane', () => {
    const panning = onDown(initialGesture(cam), [t(10, 10)], 0, null, cam).state;
    expect(beginDraw(panning, planePos)).toEqual({ state: panning, effects: [] });
    const released = onUp(down().state, t(100, 100), 100, cam).state;
    expect(beginDraw(released, planePos).effects).toEqual([]);
  });

  it('moves with no gesture in progress are ignored', () => {
    const idle = initialGesture(cam);
    expect(onMove(idle, [t(50, 50)], cam, undefined)).toEqual({ state: idle, effects: [] });
  });

  it('a long press that never moved only selects (no tiny route)', () => {
    const s = beginDraw(down().state, planePos).state;
    const u = onUp(s, t(100, 100), 2000, cam);
    expect(kinds(u.effects)).not.toContain('route');
    expect(u.effects).toContainEqual({ kind: 'select', id: 'p1' });
  });
});

describe('radar gestures: empty radar', () => {
  const down = (x = 200, y = 300, now = 0, st = initialGesture(cam)) => onDown(st, [t(x, y)], now, null, cam);

  it('one-finger drag pans by the finger delta from where it started', () => {
    const d = down();
    const m = onMove(d.state, [t(230, 280)], cam, undefined);
    expect(cameraOf(m.effects)).toMatchObject({ ox: cam.ox + 30, oy: cam.oy - 20 });
  });

  it('a tap deselects; a second tap soon after toggles runway zoom', () => {
    const first = onUp(down().state, t(201, 300), 100, cam);
    expect(first.effects).toContainEqual({ kind: 'select', id: null });
    const second = onUp(down(202, 301, 250, first.state).state, t(202, 301), 300, cam);
    expect(cameraOf(second.effects)?.scale).toBe(ZOOM.runway);
    expect(second.state.lastTap).toBeNull();
  });

  it('a slow or moving touch is not a tap', () => {
    expect(kinds(onUp(down().state, t(201, 300), 400, cam).effects)).toEqual(['cancelHold']);
    const moved = onMove(down().state, [t(220, 300)], cam, undefined).state;
    expect(kinds(onUp(moved, t(220, 300), 100, cam).effects)).toEqual(['cancelHold']);
  });
});

describe('radar gestures: pinch', () => {
  it('two fingers zoom around their starting midpoint', () => {
    const d = onDown(initialGesture(cam), [t(150, 300, 1), t(250, 300, 2)], 0, null, cam);
    expect(d.state.mode).toBe('pinch');
    const m = onMove(d.state, [t(100, 300, 1), t(300, 300, 2)], cam, undefined);
    const vp = cameraOf(m.effects)!;
    expect(vp.scale).toBeCloseTo(cam.scale * 2);
    // The world point under the midpoint stays put.
    expect(toWorld(vp, 200, 300).x).toBeCloseTo(toWorld(cam, 200, 300).x);
  });

  it('a second finger during a draw cancels the path and becomes a pinch', () => {
    let s = onDown(initialGesture(cam), [t(100, 100, 1)], 0, 'p1', cam).state;
    s = beginDraw(s, planePos).state;
    const m = onMove(s, [t(100, 100, 1), t(200, 100, 2)], cam, planePos);
    expect(m.state.mode).toBe('pinch');
    expect(m.state.drawing).toBe(false);
    expect(kinds(onUp(m.state, t(100, 100), 500, cam).effects)).not.toContain('route');
  });

  it('a new finger pair mid-pinch re-baselines instead of jumping', () => {
    const d = onDown(initialGesture(cam), [t(150, 300, 1), t(250, 300, 2)], 0, null, cam);
    // Finger 2 lifts and finger 3 lands elsewhere: the first move only re-baselines.
    const zoomed = { ...cam, scale: 12 };
    const re = onMove(d.state, [t(150, 300, 1), t(150, 500, 3)], zoomed, undefined);
    expect(cameraOf(re.effects)).toBeUndefined();
    expect(re.state.pinch.ids).toEqual([1, 3]);
    expect(re.state.camStart).toBe(zoomed);
  });

  it('one finger left after a pinch does nothing until release, and release is not a tap', () => {
    const d = onDown(initialGesture(cam), [t(150, 300, 1), t(250, 300, 2)], 0, null, cam);
    expect(onMove(d.state, [t(160, 300, 1)], cam, undefined).effects).toEqual([]);
    expect(kinds(onUp(d.state, t(160, 300), 50, cam).effects)).toEqual(['cancelHold']);
  });

  it('cancel drops a half-drawn path', () => {
    const s = beginDraw(onDown(initialGesture(cam), [t(100, 100)], 0, 'p1', cam).state, planePos).state;
    const c = onCancel(s);
    expect(c.state.drawing).toBe(false);
    expect(kinds(c.effects)).toContain('draft');
  });
});
