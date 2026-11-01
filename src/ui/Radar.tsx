import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
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
import { wheelDeltaPx, wheelZoomFactor } from './gestures';
import {
  beginDraw,
  HOLD_MS,
  initialGesture,
  onCancel,
  onDown,
  onMove,
  onUp,
  type GestureState,
  type Step,
  type Touch,
} from './radarGestures';
import {
  defaultViewport,
  ensureVisible,
  hitTest,
  polylinePoints,
  resizeViewport,
  tagLayout,
  toScreen,
  zoomAt,
  type TagLayout,
  type Viewport,
} from './viewport';

/**
 * Band a newly selected plane is kept inside, in radar coordinates. The design's
 * "below y = 120" is measured from the top of the full-bleed screen; here the
 * top bar sits above the radar, so a small margin is the equivalent.
 */
const SELECT_TOP_PT = 24;
const EDGE = 12;
const RECENTRE_SIZE = 44;
/** Keep the selected plane above the re-centre button. */
const SELECT_BOTTOM_INSET = RECENTRE_SIZE + 2 * EDGE;

interface Props {
  sim: Sim;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Called after the radar changes the sim (a new route), so the screen can redraw while paused. */
  onCommand: () => void;
}

export function Radar({ sim, selectedId, onSelect, onCommand }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [vp, setVp] = useState<Viewport>(() => defaultViewport(0, 0));
  const tag = useMemo(() => tagLayout(theme.radarFont.label.fontSize), [theme.radarFont.label.fontSize]);

  // ---- camera ------------------------------------------------------------
  // `cam` always holds the newest camera, including updates not rendered yet,
  // so rapid events (trackpad wheel, touch moves) build on each other. React
  // state is committed at most once per animation frame.
  const cam = useRef(vp);
  const frame = useRef<number | null>(null);
  const updateCam = (next: (v: Viewport) => Viewport) => {
    cam.current = next(cam.current);
    if (frame.current == null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setVp(cam.current);
      });
    }
  };
  useEffect(
    () => () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
    },
    [],
  );

  // ---- gestures ----------------------------------------------------------
  // The state machine is pure (radarGestures.ts); this only feeds it events and runs its effects.
  const g = useRef<GestureState>(initialGesture(vp));
  // Bumped to redraw the path being drawn (needed while the game is paused).
  const [, setDraftVersion] = useState(0);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };
  useEffect(() => cancelHold, []);

  const run = (step: Step) => {
    g.current = step.state;
    for (const e of step.effects) {
      if (e.kind === 'camera') updateCam(() => e.vp);
      else if (e.kind === 'select') onSelect(e.id);
      else if (e.kind === 'route') {
        sim.setRoute(e.id, e.points);
        onCommand();
      } else if (e.kind === 'armHold') {
        cancelHold();
        // Through a ref, so the timer uses the latest render's sim (a restart may swap it).
        hold.current = setTimeout(() => runRef.current(beginDraw(g.current, planePosRef.current(g.current.planeId))), HOLD_MS);
      } else if (e.kind === 'cancelHold') cancelHold();
      else setDraftVersion((v) => v + 1);
    }
  };
  const planePos = (id: string | null) => (id ? sim.plane(id)?.pos : undefined);
  const runRef = useRef(run);
  runRef.current = run;
  const planePosRef = useRef(planePos);
  planePosRef.current = planePos;

  // Touch positions in radar coordinates. Each touch's locationX is relative to
  // the view it landed on, so use page coordinates minus the radar's origin,
  // taken at grant (the granting touch always lands on the radar itself).
  const origin = useRef({ x: 0, y: 0 });
  const touchesOf = (e: GestureResponderEvent): Touch[] =>
    e.nativeEvent.touches.map((t) => ({ id: Number(t.identifier), x: t.pageX - origin.current.x, y: t.pageY - origin.current.y }));
  const pointOf = (e: GestureResponderEvent) => ({ x: e.nativeEvent.pageX - origin.current.x, y: e.nativeEvent.pageY - origin.current.y });

  const onGrant = (e: GestureResponderEvent) => {
    const ne = e.nativeEvent;
    origin.current = { x: ne.pageX - ne.locationX, y: ne.pageY - ne.locationY };
    const touches = touchesOf(e);
    const first = touches[0] ?? pointOf(e);
    const hit = hitTest(sim.planes, cam.current, tag, first.x, first.y, theme.size.hitRadius);
    run(onDown(g.current, touches.length ? touches : [{ ...first, id: 0 }], Date.now(), hit, cam.current));
  };
  const onMoveEvent = (e: GestureResponderEvent) => run(onMove(g.current, touchesOf(e), cam.current, planePos(g.current.planeId)));
  const onRelease = (e: GestureResponderEvent) => run(onUp(g.current, pointOf(e), Date.now(), cam.current));
  const onTerminate = () => run(onCancel(g.current));

  // Scroll wheel / trackpad zoom on the web, around the pointer.
  const hostRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const el = webElement(hostRef.current);
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      updateCam((v) => zoomAt(v, v.scale * wheelZoomFactor(wheelDeltaPx(ev)), ev.clientX - r.left, ev.clientY - r.top));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // updateCam only touches refs and a stable setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a plane is selected (or the radar is resized), pan just enough to keep
  // it on screen. Never while a path is being drawn: the map must not move under the finger.
  useEffect(() => {
    if (!selectedId || g.current.drawing) return;
    const p = sim.plane(selectedId);
    if (!p || vp.w === 0) return;
    updateCam((v) => ensureVisible(v, p.pos, SELECT_TOP_PT, v.h - SELECT_BOTTOM_INSET));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, sim, vp.w, vp.h]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    updateCam((v) => resizeViewport(v, width, height));
  };

  const draft = g.current.drawing ? g.current.points : [];

  return (
    <View
      ref={hostRef}
      style={{ flex: 1, backgroundColor: c.background, overflow: 'hidden' }}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMoveEvent}
      onResponderRelease={onRelease}
      onResponderTerminate={onTerminate}
      testID="radar"
    >
      {vp.w > 0 && (
        <View pointerEvents="none" style={{ flex: 1 }}>
          <Svg width={vp.w} height={vp.h}>
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
      <Pressable
        testID="btn-recentre"
        accessibilityRole="button"
        accessibilityLabel="Re-centre radar"
        accessibilityHint="Resets the zoom and position"
        onPress={() => updateCam((v) => defaultViewport(v.w, v.h))}
        style={({ pressed }) => [
          styles.recentre,
          { backgroundColor: pressed ? c.buttonPressed : c.panel, borderColor: c.panelBorder, borderWidth: theme.hairline },
        ]}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={3} stroke={c.text} strokeWidth={1.5} fill="none" />
          <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={c.text} strokeWidth={1.5} />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recentre: {
    position: 'absolute',
    right: EDGE,
    bottom: EDGE,
    width: RECENTRE_SIZE,
    height: RECENTRE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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

/** The DOM element behind a View on react-native-web (null on native), for listeners RN doesn't expose. */
function webElement(view: unknown): HTMLElement | null {
  if (Platform.OS !== 'web' || view == null) return null;
  return typeof (view as HTMLElement).addEventListener === 'function' ? (view as HTMLElement) : null;
}
