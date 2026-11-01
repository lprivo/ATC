import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { Sim } from '../engine/sim';
import type { Airport, Conflict, Plane, Vec2 } from '../engine/types';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/themes';
import { altHundreds } from './format';
import {
  bracketPath,
  centreline,
  chevron,
  conflictRingRadius,
  fixTriangle,
  headingVector,
  pairTag,
  RANGE_RINGS_NM,
  ringLabels,
  runwayLabelPos,
  runwayWidth,
  trailDots,
} from './radarGeometry';
import { hitTest, makeViewport, polylinePoints, tagLayout, toScreen, toWorld, type TagLayout, type Viewport } from './viewport';

const HOLD_MS = 220;
const DRAG_START_PX = 10;
const DRAFT_SPACING_PX = 6;

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
              <RouteLine key={`r-${p.id}`} plane={p} vp={vp} theme={theme} />
            ))}
            {/* The path being drawn sits under the planes, as in the design. */}
            {draft.length > 1 && (
              <Polyline points={polylinePoints(vp, draft)} fill="none" stroke={c.routeDraft} strokeWidth={2.5} strokeDasharray="2 5" />
            )}
            {sim.conflicts.map((cf) => (
              <PairLine key={`pl-${cf.a}-${cf.b}`} sim={sim} conflict={cf} vp={vp} theme={theme} />
            ))}
            {sim.planes.map((p) => (
              <PlaneGlyph key={p.id} plane={p} vp={vp} tag={tag} theme={theme} selected={p.id === selectedId} />
            ))}
            {sim.conflicts.map((cf) => (
              <PairTag key={`pt-${cf.a}-${cf.b}`} sim={sim} conflict={cf} vp={vp} theme={theme} />
            ))}
          </Svg>
        </View>
      )}
    </View>
  );
}

/**
 * Range rings, extended centrelines, runways and fixes. These never move, so
 * they're memoised and only re-render when the viewport or theme changes, not
 * on every sim frame.
 */
const StaticMap = memo(function StaticMap({ airport, vp, theme }: { airport: Airport; vp: Viewport; theme: Theme }) {
  const c = theme.colors;
  const fixFont = theme.radarFont.fix;
  const rwyFont = theme.radarFont.runway;
  const centre = toScreen(vp, { x: 0, y: 0 });
  const ends = airport.runways.flatMap((r) => r.ends);
  const rwW = runwayWidth(vp.scale);
  return (
    <G>
      {RANGE_RINGS_NM.filter((r) => r <= airport.rangeNm).map((r) => (
        <Circle key={r} cx={centre.x} cy={centre.y} r={r * vp.scale} stroke={c.rangeRing} strokeWidth={1} fill="none" />
      ))}
      {ringLabels(vp, airport.rangeNm).map((l) => (
        <SvgText key={`rl-${l.r}`} x={l.x} y={l.y} fill={c.fixLabel} opacity={0.75} fontFamily={fixFont.fontFamily} fontSize={fixFont.fontSize}>
          {String(l.r)}
        </SvgText>
      ))}

      {ends.map((end) => {
        const cl = centreline(vp, end);
        return (
          <G key={`cl-${end.id}`}>
            <Line x1={cl.from.x} y1={cl.from.y} x2={cl.to.x} y2={cl.to.y} stroke={c.centreline} strokeWidth={1} strokeDasharray="4 6" />
            {cl.ticks.map((t, i) => (
              <Line key={i} {...t} stroke={c.centreline} strokeWidth={1} />
            ))}
          </G>
        );
      })}

      {airport.runways.map((r) => {
        const a = toScreen(vp, r.ends[0].threshold);
        const b = toScreen(vp, r.ends[1].threshold);
        return <Line key={r.name} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c.runway} strokeWidth={rwW} strokeLinecap="butt" />;
      })}
      {ends.map((end) => {
        const l = runwayLabelPos(vp, airport, end);
        return (
          <SvgText
            key={`rw-${end.id}`}
            x={l.x}
            y={l.y + rwyFont.fontSize * 0.35}
            fill={c.runwayLabel}
            fontFamily={rwyFont.fontFamily}
            fontSize={rwyFont.fontSize}
            textAnchor="middle"
          >
            {end.id}
          </SvgText>
        );
      })}

      {airport.fixes.map((f) => {
        const s = toScreen(vp, f.pos);
        if (s.x < -40 || s.x > vp.w + 40 || s.y < -20 || s.y > vp.h + 20) return null;
        return (
          <G key={f.name}>
            <Polygon points={fixTriangle(s)} fill="none" stroke={c.fix} strokeWidth={1} />
            <SvgText x={s.x + 7} y={s.y + 3.5} fill={c.fixLabel} fontFamily={fixFont.fontFamily} fontSize={fixFont.fontSize} letterSpacing={fixFont.letterSpacing}>
              {f.name}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
});

/** A plane's assigned path: dashed `route`, or solid `routeCleared` once cleared to land; chevron at the end. */
function RouteLine({ plane: p, vp, theme }: { plane: Plane; vp: Viewport; theme: Theme }) {
  if (p.route.length === 0) return null;
  const pts = [p.pos, ...p.route];
  const cleared = p.clearedRunway != null;
  const color = cleared ? theme.colors.routeCleared : theme.colors.route;
  const a = toScreen(vp, pts[pts.length - 2]);
  const b = toScreen(vp, pts[pts.length - 1]);
  return (
    <G>
      <Polyline points={polylinePoints(vp, pts)} fill="none" stroke={color} strokeWidth={cleared ? 2.5 : 2} strokeDasharray={cleared ? undefined : '7 5'} />
      <Polyline points={chevron(a, b)} fill="none" stroke={color} strokeWidth={2} />
    </G>
  );
}

function pairPlanes(sim: Sim, cf: Conflict) {
  const a = sim.plane(cf.a);
  const b = sim.plane(cf.b);
  return a && b ? ([a, b] as const) : null;
}

/** Dashed `danger` line between two planes in conflict. */
function PairLine({ sim, conflict, vp, theme }: { sim: Sim; conflict: Conflict; vp: Viewport; theme: Theme }) {
  const pair = pairPlanes(sim, conflict);
  if (!pair) return null;
  const a = toScreen(vp, pair[0].pos);
  const b = toScreen(vp, pair[1].pos);
  return <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={theme.colors.danger} strokeWidth={1.25} strokeDasharray="3 3" />;
}

/** "2.7 NM · 400 FT" tag below the middle of a conflict pair. */
function PairTag({ sim, conflict, vp, theme }: { sim: Sim; conflict: Conflict; vp: Viewport; theme: Theme }) {
  const pair = pairPlanes(sim, conflict);
  if (!pair) return null;
  const f = theme.radarFont.chip;
  const t = pairTag(vp, pair[0].pos, pair[1].pos, conflict.distNm, conflict.altFt);
  // Condensed digits average about half the font size wide.
  const w = t.text.length * f.fontSize * 0.5 + 8;
  return (
    <G>
      <Rect x={t.x - w / 2} y={t.y - 7} width={w} height={14} fill={theme.colors.danger} />
      <SvgText x={t.x} y={t.y + 3.5} fill={theme.colors.onDanger} fontFamily={f.fontFamily} fontSize={f.fontSize} textAnchor="middle">
        {t.text}
      </SvgText>
    </G>
  );
}

function PlaneGlyph({ plane: p, vp, tag, theme, selected }: { plane: Plane; vp: Viewport; tag: TagLayout; theme: Theme; selected: boolean }) {
  const c = theme.colors;
  const z = theme.size;
  const s = toScreen(vp, p.pos);
  const color = p.conflict ? c.planeConflict : selected ? c.planeSelected : c.plane;
  const hv = headingVector(p, vp, z.headingVectorMinutes, z.headingVectorMin);
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
      {trailDots(p, vp, z.trailDots).map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={z.trailDotRadius} fill={c.trail} opacity={d.opacity} />
      ))}
      <Line {...hv} stroke={color} strokeWidth={1.25} />
      {p.conflict && (
        <Circle
          cx={s.x}
          cy={s.y}
          r={conflictRingRadius(vp, z.conflictRingNm, z.conflictRingMin)}
          stroke={color}
          strokeWidth={z.planeStroke}
          strokeDasharray="5 4"
          fill="none"
        />
      )}
      {selected ? (
        <G>
          <Rect x={s.x - half} y={s.y - half} width={half * 2} height={half * 2} fill={color} />
          <Path d={bracketPath(s.x, s.y, z.selectBracket, z.selectBracketArm)} stroke={color} strokeWidth={z.planeStroke} fill="none" />
        </G>
      ) : (
        <G>
          <Rect x={s.x - half} y={s.y - half} width={half * 2} height={half * 2} fill="none" stroke={color} strokeWidth={z.planeStroke} />
          {p.clearedRunway && <Rect x={s.x - 1.75} y={s.y - 1.75} width={3.5} height={3.5} fill={c.routeCleared} />}
        </G>
      )}
      {/* Interim data block; issue #7 replaces it with the auto-placed label. */}
      <Rect x={tx - 3} y={ty - 2} width={tag.width} height={tag.height} fill={p.conflict ? c.danger : c.labelBg} stroke={selected && !p.conflict ? c.planeSelected : 'none'} strokeWidth={1} />
      <SvgText x={tx} y={ty + tag.line1} fill={p.conflict ? c.onDanger : color} fontFamily={f1.fontFamily} fontSize={f1.fontSize}>
        {p.callsign}
      </SvgText>
      <SvgText x={tx} y={ty + tag.line2} fill={p.conflict ? c.onDanger : color} fontFamily={f2.fontFamily} fontSize={f2.fontSize}>
        {line2}
      </SvgText>
    </G>
  );
}
