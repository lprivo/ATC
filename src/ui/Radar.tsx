import { useRef, useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { add, dirOf } from '../engine/math';
import type { Sim } from '../engine/sim';
import type { Plane, Vec2 } from '../engine/types';
import { useTheme } from '../theme/ThemeContext';

const HOLD_MS = 220;
const DRAG_START_PX = 10;
const HIT_RADIUS_PX = 28;
const TAG_OFFSET = { x: 9, y: -26 };
const TAG_SIZE = { w: 78, h: 30 };
const DRAFT_SPACING_PX = 6;

interface Props {
  sim: Sim;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface Viewport {
  w: number;
  h: number;
  scale: number; // px per nm
}

const toScreen = (v: Viewport, p: Vec2) => ({ x: v.w / 2 + p.x * v.scale, y: v.h / 2 - p.y * v.scale });
const toWorld = (v: Viewport, x: number, y: number): Vec2 => ({
  x: (x - v.w / 2) / v.scale,
  y: -(y - v.h / 2) / v.scale,
});
const pts = (v: Viewport, list: Vec2[]) =>
  list.map((p) => {
    const s = toScreen(v, p);
    return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
  }).join(' ');

export function Radar({ sim, selectedId, onSelect }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const range = sim.airport.rangeNm;
  const vp: Viewport = { ...size, scale: Math.min(size.w, size.h) / (2 * range) || 1 };

  // ---- gestures --------------------------------------------------------
  const g = useRef({
    start: { x: 0, y: 0 },
    planeId: null as string | null,
    drawing: false,
    moved: false,
    timer: null as ReturnType<typeof setTimeout> | null,
    lastPx: { x: 0, y: 0 },
  });
  const [draft, setDraft] = useState<{ planeId: string; points: Vec2[] } | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const hitTest = (x: number, y: number): string | null => {
    let best: string | null = null;
    let bestD = HIT_RADIUS_PX;
    for (const p of sim.planes) {
      const s = toScreen(vp, p.pos);
      const d = Math.hypot(s.x - x, s.y - y);
      const onTag =
        x >= s.x + TAG_OFFSET.x - 2 &&
        x <= s.x + TAG_OFFSET.x + TAG_SIZE.w &&
        y >= s.y + TAG_OFFSET.y - 4 &&
        y <= s.y + TAG_OFFSET.y + TAG_SIZE.h;
      const score = onTag ? 0 : d;
      if (score < bestD) {
        bestD = score;
        best = p.id;
      }
    }
    return best;
  };

  const beginDraw = () => {
    const st = g.current;
    if (!st.planeId || st.drawing) return;
    const plane = sim.plane(st.planeId);
    if (!plane) return;
    st.drawing = true;
    onSelect(st.planeId);
    setDraft({ planeId: st.planeId, points: [{ ...plane.pos }] });
  };

  const clearTimer = () => {
    if (g.current.timer) clearTimeout(g.current.timer);
    g.current.timer = null;
  };

  const xy = (e: GestureResponderEvent) => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

  const onGrant = (e: GestureResponderEvent) => {
    const p = xy(e);
    const st = g.current;
    st.start = p;
    st.lastPx = p;
    st.moved = false;
    st.drawing = false;
    st.planeId = hitTest(p.x, p.y);
    clearTimer();
    if (st.planeId) st.timer = setTimeout(beginDraw, HOLD_MS);
  };

  const onMove = (e: GestureResponderEvent) => {
    const p = xy(e);
    const st = g.current;
    if (!st.moved && Math.hypot(p.x - st.start.x, p.y - st.start.y) > DRAG_START_PX) {
      st.moved = true;
      // Dragging straight off a plane also starts a path — no need to wait for the hold.
      if (st.planeId && !st.drawing) {
        clearTimer();
        beginDraw();
      }
    }
    if (st.drawing && Math.hypot(p.x - st.lastPx.x, p.y - st.lastPx.y) >= DRAFT_SPACING_PX) {
      st.lastPx = p;
      const w = toWorld(vp, p.x, p.y);
      setDraft((d) => (d ? { ...d, points: [...d.points, w] } : d));
    }
  };

  const onRelease = (e: GestureResponderEvent) => {
    clearTimer();
    const st = g.current;
    const d = draftRef.current;
    if (st.drawing && d) {
      // Always end exactly where the finger lifted, even if it moved < DRAFT_SPACING_PX since the last sample.
      const p = xy(e);
      sim.setRoute(d.planeId, [...d.points.slice(1), toWorld(vp, p.x, p.y)]);
    } else if (!st.moved) {
      onSelect(st.planeId);
    }
    st.drawing = false;
    setDraft(null);
  };

  const onTerminate = () => {
    clearTimer();
    g.current.drawing = false;
    setDraft(null);
  };

  // ---- drawing ---------------------------------------------------------
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const fontProps = { fontFamily: theme.font.mono };
  const ready = size.w > 0;

  return (
    <View
      style={{ flex: 1, backgroundColor: c.background, overflow: 'hidden' }}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onRelease}
      onResponderTerminate={onTerminate}
      testID="radar"
    >
      {ready && (
        <View pointerEvents="none" style={{ flex: 1 }}>
          <Svg width={size.w} height={size.h}>
            {/* range rings */}
            {[5, 10, 20, 30].map((r) => (
              <Circle
                key={r}
                cx={vp.w / 2}
                cy={vp.h / 2}
                r={r * vp.scale}
                stroke={c.rangeRing}
                strokeWidth={1}
                fill="none"
              />
            ))}

            {/* extended centrelines */}
            {sim.airport.runways.flatMap((r) =>
              r.ends.map((end) => {
                const a = toScreen(vp, end.threshold);
                const b = toScreen(vp, add(end.threshold, dirOf(end.heading), -10));
                return (
                  <Line key={`cl-${end.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.rangeRing} strokeWidth={1} strokeDasharray="4 6" />
                );
              }),
            )}

            {/* fixes */}
            {sim.airport.fixes.map((f) => {
              const s = toScreen(vp, f.pos);
              return (
                <G key={f.name}>
                  <Polygon points={`${s.x},${s.y - 4} ${s.x - 3.5},${s.y + 3} ${s.x + 3.5},${s.y + 3}`} fill="none" stroke={c.fix} strokeWidth={1} />
                  <SvgText x={s.x + 6} y={s.y + 3} fill={c.fixLabel} fontSize={theme.size.labelFont} {...fontProps}>
                    {f.name}
                  </SvgText>
                </G>
              );
            })}

            {/* runways */}
            {sim.airport.runways.map((r) => {
              const [e1, e2] = r.ends;
              const a = toScreen(vp, e1.threshold);
              const b = toScreen(vp, e2.threshold);
              return (
                <G key={r.name}>
                  <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.runway} strokeWidth={4} strokeLinecap="round" />
                  {r.ends.map((end) => {
                    const l = toScreen(vp, add(end.threshold, dirOf(end.heading), -0.9));
                    return (
                      <SvgText key={end.id} x={l.x} y={l.y + 3} fill={c.runwayLabel} fontSize={theme.size.labelFont} textAnchor="middle" {...fontProps}>
                        {end.id}
                      </SvgText>
                    );
                  })}
                </G>
              );
            })}

            {/* planes */}
            {sim.planes.map((p) => (
              <PlaneGlyph key={p.id} plane={p} vp={vp} selected={p.id === selectedId} />
            ))}

            {/* path being drawn */}
            {draft && draft.points.length > 1 && (
              <Polyline points={pts(vp, draft.points)} fill="none" stroke={c.routeDraft} strokeWidth={2} strokeDasharray="6 4" />
            )}
          </Svg>
        </View>
      )}
    </View>
  );
}

function PlaneGlyph({ plane: p, vp, selected }: { plane: Plane; vp: Viewport; selected: boolean }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const s = toScreen(vp, p.pos);
  const color = p.conflict ? c.planeConflict : selected ? c.planeSelected : c.plane;
  const lead = toScreen(vp, add(p.pos, dirOf(p.heading), (p.speed / 60) * theme.size.leaderMinutes));
  const half = theme.size.blip / 2;

  const altDiff = p.target.altitude - p.altitude;
  const arrow = altDiff > 50 ? '↑' : altDiff < -50 ? '↓' : ' ';
  const alt = String(Math.round(p.altitude / 100)).padStart(3, '0');
  const line2 = `${alt}${arrow} ${Math.round(p.speed)}${p.clearedRunway ? ` ${p.clearedRunway.id}` : ''}`;
  const tx = s.x + TAG_OFFSET.x;
  const ty = s.y + TAG_OFFSET.y;
  const fontProps = { fontFamily: theme.font.mono, fontSize: theme.size.tagFont };

  return (
    <G>
      {p.trail.map((t, i) => {
        const ts = toScreen(vp, t);
        return <Circle key={i} cx={ts.x} cy={ts.y} r={1.5} fill={c.trail} opacity={(i + 1) / p.trail.length} />;
      })}
      {p.route.length > 0 && (
        <Polyline
          points={pts(vp, [p.pos, ...p.route])}
          fill="none"
          stroke={p.clearedRunway ? c.routeCleared : c.route}
          strokeWidth={selected ? 2 : 1.25}
          opacity={selected ? 1 : 0.6}
        />
      )}
      {p.conflict && <Circle cx={s.x} cy={s.y} r={1.5 * vp.scale} stroke={c.planeConflict} strokeWidth={1} fill="none" />}
      <Line x1={s.x} y1={s.y} x2={lead.x} y2={lead.y} stroke={color} strokeWidth={1} />
      <Rect x={s.x - half} y={s.y - half} width={half * 2} height={half * 2} fill={selected ? color : 'none'} stroke={color} strokeWidth={1.5} />
      {selected && <Rect x={tx - 3} y={ty - 2} width={TAG_SIZE.w} height={TAG_SIZE.h} fill="none" stroke={color} strokeWidth={1} rx={3} />}
      <SvgText x={tx} y={ty + 11} fill={color} {...fontProps}>
        {p.callsign}
      </SvgText>
      <SvgText x={tx} y={ty + 24} fill={color} {...fontProps}>
        {line2}
      </SvgText>
    </G>
  );
}
