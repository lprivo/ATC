import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { add, dirOf } from '../engine/math';
import { RULES, type Sim } from '../engine/sim';
import type { Airport, Plane, Vec2 } from '../engine/types';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/themes';
import { altHundreds } from './format';
import { hitTest, makeViewport, polylinePoints, tagLayout, toScreen, toWorld, type TagLayout, type Viewport } from './viewport';

const HOLD_MS = 220;
const DRAG_START_PX = 10;
const DRAFT_SPACING_PX = 6;
const RANGE_RINGS_NM = [5, 10, 20, 30, 40, 60];

interface Props {
  sim: Sim;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Called after the radar changes the sim (a new route), so the screen can redraw while paused. */
  onCommand: () => void;
}

export function Radar({ sim, selectedId, onSelect, onCommand }: Props) {
  const { theme } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const vp = useMemo(() => makeViewport(size.w, size.h, sim.airport.rangeNm), [size.w, size.h, sim.airport.rangeNm]);
  const tag = useMemo(() => tagLayout(theme.radarFont.label.fontSize), [theme.radarFont.label.fontSize]);

  // ---- gestures --------------------------------------------------------
  // Gesture state lives in a ref: touch events can arrive faster than React
  // renders, so reading anything from state on release could be stale.
  const g = useRef({
    start: { x: 0, y: 0 },
    planeId: null as string | null,
    drawing: false,
    moved: false,
    timer: null as ReturnType<typeof setTimeout> | null,
    lastPx: { x: 0, y: 0 },
    points: [] as Vec2[],
  });
  // Bumped to redraw the path being drawn (needed while the game is paused).
  const [, setDraftVersion] = useState(0);
  const redrawDraft = () => setDraftVersion((v) => v + 1);

  const clearTimer = () => {
    if (g.current.timer) clearTimeout(g.current.timer);
    g.current.timer = null;
  };
  useEffect(() => clearTimer, []);

  const beginDraw = () => {
    const st = g.current;
    if (!st.planeId || st.drawing) return;
    const plane = sim.plane(st.planeId);
    if (!plane) return;
    st.drawing = true;
    st.points = [{ ...plane.pos }];
    onSelect(st.planeId);
    redrawDraft();
  };

  const xy = (e: GestureResponderEvent) => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

  const onGrant = (e: GestureResponderEvent) => {
    const p = xy(e);
    const st = g.current;
    st.start = p;
    st.lastPx = p;
    st.moved = false;
    st.drawing = false;
    st.points = [];
    st.planeId = hitTest(sim.planes, vp, tag, p.x, p.y, theme.size.hitRadius);
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
      st.points.push(toWorld(vp, p.x, p.y));
      redrawDraft();
    }
  };

  const onRelease = (e: GestureResponderEvent) => {
    clearTimer();
    const st = g.current;
    if (st.drawing && st.moved && st.planeId) {
      // Always end exactly where the finger lifted, even if it moved < DRAFT_SPACING_PX since the last sample.
      const p = xy(e);
      sim.setRoute(st.planeId, [...st.points.slice(1), toWorld(vp, p.x, p.y)]);
      onCommand();
    } else if (!st.moved) {
      // A tap — or a long press that never moved — only selects. It must not
      // turn into a tiny route that would cancel the plane's clearance.
      onSelect(st.planeId);
    }
    st.drawing = false;
    st.points = [];
    redrawDraft();
  };

  const onTerminate = () => {
    clearTimer();
    g.current.drawing = false;
    g.current.points = [];
    redrawDraft();
  };

  // ---- drawing ---------------------------------------------------------
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const c = theme.colors;
  const draft = g.current.drawing ? g.current.points : [];

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
      {size.w > 0 && (
        <View pointerEvents="none" style={{ flex: 1 }}>
          <Svg width={size.w} height={size.h}>
            <StaticMap airport={sim.airport} vp={vp} theme={theme} />
            {sim.planes.map((p) => (
              <PlaneGlyph key={p.id} plane={p} vp={vp} tag={tag} selected={p.id === selectedId} />
            ))}
            {draft.length > 1 && (
              <Polyline points={polylinePoints(vp, draft)} fill="none" stroke={c.routeDraft} strokeWidth={2} strokeDasharray="6 4" />
            )}
          </Svg>
        </View>
      )}
    </View>
  );
}

/**
 * Range rings, extended centrelines, fixes and runways. These never move, so
 * they're memoised and only re-render when the viewport or theme changes —
 * not on every sim frame.
 */
const StaticMap = memo(function StaticMap({ airport, vp, theme }: { airport: Airport; vp: Viewport; theme: Theme }) {
  const c = theme.colors;
  const fixFont = theme.radarFont.fix;
  const rwyFont = theme.radarFont.runway;
  const centre = toScreen(vp, { x: 0, y: 0 });
  return (
    <G>
      {RANGE_RINGS_NM.filter((r) => r <= airport.rangeNm).map((r) => (
        <Circle key={r} cx={centre.x} cy={centre.y} r={r * vp.scale} stroke={c.rangeRing} strokeWidth={1} fill="none" />
      ))}

      {/* extended centrelines, out to where planes start slowing for the approach */}
      {airport.runways.flatMap((r) =>
        r.ends.map((end) => {
          const a = toScreen(vp, end.threshold);
          const b = toScreen(vp, add(end.threshold, dirOf(end.heading), -RULES.approachZoneNm));
          return <Line key={`cl-${end.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.centreline} strokeWidth={1} strokeDasharray="4 6" />;
        }),
      )}

      {airport.fixes.map((f) => {
        const s = toScreen(vp, f.pos);
        return (
          <G key={f.name}>
            <Polygon points={`${s.x},${s.y - 4} ${s.x - 3.5},${s.y + 3} ${s.x + 3.5},${s.y + 3}`} fill="none" stroke={c.fix} strokeWidth={1} />
            <SvgText x={s.x + 6} y={s.y + 3} fill={c.fixLabel} fontFamily={fixFont.fontFamily} fontSize={fixFont.fontSize} letterSpacing={fixFont.letterSpacing}>
              {f.name}
            </SvgText>
          </G>
        );
      })}

      {airport.runways.map((r) => {
        const [e1, e2] = r.ends;
        const a = toScreen(vp, e1.threshold);
        const b = toScreen(vp, e2.threshold);
        return (
          <G key={r.name}>
            <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.runway} strokeWidth={Math.min(7, Math.max(3, 0.22 * vp.scale))} strokeLinecap="butt" />
            {r.ends.map((end) => {
              const l = toScreen(vp, add(end.threshold, dirOf(end.heading), -0.9));
              return (
                <SvgText key={end.id} x={l.x} y={l.y + 3} fill={c.runwayLabel} fontFamily={rwyFont.fontFamily} fontSize={rwyFont.fontSize} textAnchor="middle">
                  {end.id}
                </SvgText>
              );
            })}
          </G>
        );
      })}
    </G>
  );
});

function PlaneGlyph({ plane: p, vp, tag, selected }: { plane: Plane; vp: Viewport; tag: TagLayout; selected: boolean }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const s = toScreen(vp, p.pos);
  const color = p.conflict ? c.planeConflict : selected ? c.planeSelected : c.plane;
  const z = theme.size;
  // Heading vector: one minute of flight, at least headingVectorMin pt.
  const leadPt = Math.max(z.headingVectorMin, (p.speed / 60) * z.headingVectorMinutes * vp.scale);
  const lead = toScreen(vp, add(p.pos, dirOf(p.heading), leadPt / vp.scale));
  const half = z.planeSymbol / 2;

  const altDiff = p.target.altitude - p.altitude;
  const arrow = altDiff > 50 ? '↑' : altDiff < -50 ? '↓' : ' ';
  const line2 = `${altHundreds(p.altitude)}${arrow} ${Math.round(p.speed)}${p.clearedRunway ? ` ${p.clearedRunway.id}` : ''}`;
  const tx = s.x + tag.offsetX;
  const ty = s.y + tag.offsetY;
  const f1 = theme.radarFont.label;
  const f2 = theme.radarFont.label2;

  return (
    <G>
      {p.trail.map((t, i) => {
        const ts = toScreen(vp, t);
        return <Circle key={i} cx={ts.x} cy={ts.y} r={1.5} fill={c.trail} opacity={(i + 1) / p.trail.length} />;
      })}
      {p.route.length > 0 && (
        <Polyline
          points={polylinePoints(vp, [p.pos, ...p.route])}
          fill="none"
          stroke={p.clearedRunway ? c.routeCleared : c.route}
          strokeWidth={selected ? 2 : 1.25}
          opacity={selected ? 1 : 0.6}
        />
      )}
      {/* Dashed conflict ring: radius max(conflictRingMin pt, conflictRingNm nm), per the design. */}
      {p.conflict && (
        <Circle
          cx={s.x}
          cy={s.y}
          r={Math.max(z.conflictRingMin, z.conflictRingNm * vp.scale)}
          stroke={c.planeConflict}
          strokeWidth={z.planeStroke}
          strokeDasharray="5 4"
          fill="none"
        />
      )}
      <Line x1={s.x} y1={s.y} x2={lead.x} y2={lead.y} stroke={color} strokeWidth={1} />
      <Rect x={s.x - half} y={s.y - half} width={half * 2} height={half * 2} fill={selected ? color : 'none'} stroke={color} strokeWidth={z.planeStroke} />
      {selected && <Rect x={tx - 3} y={ty - 2} width={tag.width} height={tag.height} fill="none" stroke={color} strokeWidth={1} />}
      <SvgText x={tx} y={ty + tag.line1} fill={color} fontFamily={f1.fontFamily} fontSize={f1.fontSize}>
        {p.callsign}
      </SvgText>
      <SvgText x={tx} y={ty + tag.line2} fill={color} fontFamily={f2.fontFamily} fontSize={f2.fontSize}>
        {line2}
      </SvgText>
    </G>
  );
}
