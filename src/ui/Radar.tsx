import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { Sim } from '../engine/sim';
import type { Airport, Conflict, Plane, Vec2 } from '../engine/types';
import { useTheme } from '../theme/ThemeContext';
import type { Theme } from '../theme/themes';
import { LABEL_METRICS, textWidth, type LabelMode, type Rect as LabelRect } from './labels';
import { useLabelLayout, type DrawnLabel } from './useLabelLayout';
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
import { isDoubleTap, isTap, pinchOf, TAP, wheelZoomFactor, type TouchPt } from './gestures';
import {
  defaultViewport,
  ensureVisible,
  hitTest,
  panBy,
  polylinePoints,
  resizeViewport,
  toggleRunwayZoom,
  toScreen,
  toWorld,
  zoomAt,
  type Viewport,
} from './viewport';

const HOLD_MS = 220;
const DRAG_START_PX = 10;
const DRAFT_SPACING_PX = 6;
/** Keep a newly selected plane at least this far below the radar's top edge. */
const SELECT_TOP_PT = 24;
const EDGE = 12;
const RECENTRE_SIZE = 44;

interface Props {
  sim: Sim;
  selectedId: string | null;
  /** Plane labels setting (Auto | Full | Min); default Auto. */
  labelMode?: LabelMode;
  /** Label size setting (theme LABEL_SCALE); default 1. */
  labelScale?: number;
  onSelect: (id: string | null) => void;
  /** Called after the radar changes the sim (a new route), so the screen can redraw while paused. */
  onCommand: () => void;
}

type Mode = 'none' | 'plane' | 'pan' | 'pinch';

export function Radar({ sim, selectedId, onSelect, onCommand, labelMode = 'auto', labelScale = 1 }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [vp, setVp] = useState<Viewport>(() => defaultViewport(0, 0));
  // Gesture handlers read the camera through a ref: touch events can arrive faster than React renders.
  const vpRef = useRef(vp);
  vpRef.current = vp;

  // Data blocks: content every frame, placement at 2 Hz. Touch handlers read the
  // last drawn rectangles so a tap on a label selects its plane.
  const labels = useLabelLayout(sim, vp, theme, selectedId, labelMode, labelScale);
  const labelRects = useRef(new Map<string, LabelRect>());
  labelRects.current = new Map([...labels].map(([id, l]) => [id, l.rect]));

  // ---- gestures --------------------------------------------------------
  // Gesture state lives in a ref: reading anything from state on release could be stale.
  const g = useRef({
    mode: 'none' as Mode,
    start: { x: 0, y: 0 },
    startT: 0,
    planeId: null as string | null,
    drawing: false,
    moved: false,
    timer: null as ReturnType<typeof setTimeout> | null,
    lastPx: { x: 0, y: 0 },
    points: [] as Vec2[],
    /** Camera and finger positions when a pan or pinch began. */
    camStart: vp,
    pinch: { dist: 1, mid: { x: 0, y: 0 } },
    lastTap: null as { t: number; at: TouchPt } | null,
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

  const touchesOf = (e: GestureResponderEvent): TouchPt[] =>
    e.nativeEvent.touches.map((t) => ({ x: t.locationX, y: t.locationY }));
  const xy = (e: GestureResponderEvent) => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

  const beginPinch = (a: TouchPt, b: TouchPt) => {
    const st = g.current;
    clearTimer();
    // A second finger turns any gesture into a pinch; a half-drawn path is dropped.
    st.drawing = false;
    st.points = [];
    st.mode = 'pinch';
    st.moved = true;
    st.camStart = vpRef.current;
    st.pinch = pinchOf(a, b);
    redrawDraft();
  };

  const onGrant = (e: GestureResponderEvent) => {
    const p = xy(e);
    const st = g.current;
    st.start = p;
    st.startT = Date.now();
    st.lastPx = p;
    st.moved = false;
    st.drawing = false;
    st.points = [];
    st.camStart = vpRef.current;
    clearTimer();
    const touches = touchesOf(e);
    if (touches.length >= 2) return beginPinch(touches[0], touches[1]);
    st.planeId = hitTest(sim.planes, vpRef.current, labelRects.current, p.x, p.y, theme.size.hitRadius);
    st.mode = st.planeId ? 'plane' : 'pan';
    if (st.planeId) st.timer = setTimeout(beginDraw, HOLD_MS);
  };

  const onMove = (e: GestureResponderEvent) => {
    const st = g.current;
    const touches = touchesOf(e);
    if (touches.length >= 2) {
      if (st.mode !== 'pinch') beginPinch(touches[0], touches[1]);
      const now = pinchOf(touches[0], touches[1]);
      const k = st.camStart.scale * (now.dist / Math.max(1, st.pinch.dist));
      // Zoom around where the fingers started, then follow the midpoint.
      const z = zoomAt(st.camStart, k, st.pinch.mid.x, st.pinch.mid.y);
      setVp(panBy(z, now.mid.x - st.pinch.mid.x, now.mid.y - st.pinch.mid.y));
      return;
    }
    if (st.mode === 'pinch') return; // one finger lifted mid-pinch: wait for the release
    const p = xy(e);
    if (!st.moved && Math.hypot(p.x - st.start.x, p.y - st.start.y) > (st.mode === 'pan' ? TAP.maxMovePt : DRAG_START_PX)) {
      st.moved = true;
      // Dragging straight off a plane also starts a path: no need to wait for the hold.
      if (st.mode === 'plane' && !st.drawing) {
        clearTimer();
        beginDraw();
      }
    }
    if (st.mode === 'pan' && st.moved) {
      setVp(panBy(st.camStart, p.x - st.start.x, p.y - st.start.y));
      return;
    }
    if (st.drawing && Math.hypot(p.x - st.lastPx.x, p.y - st.lastPx.y) >= DRAFT_SPACING_PX) {
      st.lastPx = p;
      st.points.push(toWorld(vpRef.current, p.x, p.y));
      redrawDraft();
    }
  };

  const onRelease = (e: GestureResponderEvent) => {
    clearTimer();
    const st = g.current;
    const p = xy(e);
    if (st.mode === 'plane') {
      if (st.drawing && st.moved && st.planeId) {
        // Always end exactly where the finger lifted, even if it moved < DRAFT_SPACING_PX since the last sample.
        sim.setRoute(st.planeId, [...st.points.slice(1), toWorld(vpRef.current, p.x, p.y)]);
        onCommand();
      } else if (!st.moved) {
        // A tap, or a long press that never moved, only selects. It must not
        // turn into a tiny route that would cancel the plane's clearance.
        onSelect(st.planeId);
      }
    } else if (st.mode === 'pan' && isTap(Math.hypot(p.x - st.start.x, p.y - st.start.y), Date.now() - st.startT)) {
      const now = Date.now();
      if (isDoubleTap(st.lastTap, now, p)) {
        st.lastTap = null;
        setVp(toggleRunwayZoom(vpRef.current));
      } else {
        st.lastTap = { t: now, at: p };
        onSelect(null);
      }
    }
    st.mode = 'none';
    st.drawing = false;
    st.points = [];
    redrawDraft();
  };

  const onTerminate = () => {
    clearTimer();
    g.current.mode = 'none';
    g.current.drawing = false;
    g.current.points = [];
    redrawDraft();
  };

  // Scroll wheel / trackpad zoom on the web, around the pointer.
  const hostRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = hostRef.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      const v = vpRef.current;
      setVp(zoomAt(v, v.scale * wheelZoomFactor(ev.deltaY), ev.clientX - r.left, ev.clientY - r.top));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // When a plane is selected, pan just enough to keep it on screen.
  useEffect(() => {
    if (!selectedId) return;
    const p = sim.plane(selectedId);
    const v = vpRef.current;
    if (!p || v.w === 0) return;
    const next = ensureVisible(v, p.pos, SELECT_TOP_PT, v.h - RECENTRE_SIZE - 2 * EDGE);
    if (next !== v) setVp(next);
  }, [selectedId, sim]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setVp((v) => resizeViewport(v, width, height));
  };

  const draft = g.current.drawing ? g.current.points : [];

  return (
    <View
      ref={hostRef}
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
              <PlaneGlyph key={p.id} plane={p} vp={vp} theme={theme} selected={p.id === selectedId} />
            ))}
            {sim.planes.map((p) => {
              const l = labels.get(p.id);
              return l ? <DataBlock key={`l-${p.id}`} label={l} conflict={p.conflict} selected={p.id === selectedId} theme={theme} /> : null;
            })}
            {sim.conflicts.map((cf) => (
              <PairTag key={`pt-${cf.a}-${cf.b}`} sim={sim} conflict={cf} vp={vp} theme={theme} />
            ))}
          </Svg>
        </View>
      )}
      <Pressable
        testID="btn-recentre"
        accessibilityLabel="Re-centre radar"
        onPress={() => setVp(defaultViewport(vp.w, vp.h))}
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

function PlaneGlyph({ plane: p, vp, theme, selected }: { plane: Plane; vp: Viewport; theme: Theme; selected: boolean }) {
  const c = theme.colors;
  const z = theme.size;
  const s = toScreen(vp, p.pos);
  const color = p.conflict ? c.planeConflict : selected ? c.planeSelected : c.plane;
  const hv = headingVector(p, vp, z.headingVectorMinutes, z.headingVectorMin);
  const half = z.planeSymbol / 2;

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
    </G>
  );
}

/**
 * A plane's data block: solid backing, callsign line with chips, and the
 * altitude/speed line. Selected labels get a frame; conflict labels invert.
 */
function DataBlock({ label: l, conflict, selected, theme }: { label: DrawnLabel; conflict: boolean; selected: boolean; theme: Theme }) {
  const c = theme.colors;
  const f = theme.radarFont;
  const m = LABEL_METRICS;
  const { x, y, w, h } = l.rect;
  const base = conflict ? c.onDanger : selected ? c.planeSelected : c.plane;
  const family = { label: f.label.fontFamily, label2: f.label2.fontFamily };
  return (
    <G>
      {l.leader && (
        <Line {...l.leader} stroke={conflict ? c.danger : c.textDim} strokeWidth={1} opacity={0.7} />
      )}
      <Rect x={x} y={y} width={w} height={h} fill={conflict ? c.danger : c.labelBg} />
      {selected && !conflict && <Rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} fill="none" stroke={c.planeSelected} strokeWidth={1} />}
      {l.spec.lines.map((line, li) => {
        const by = y + 2 + l.fonts.label + li * l.fonts.lineHeight - 1;
        let cx = x + m.pad;
        const parts = line.map((seg, si) => {
          const el = (
            <SvgText
              key={si}
              x={cx}
              y={by}
              fill={seg.dim ? (conflict ? c.onDanger : c.fixLabel) : base}
              fontFamily={family[seg.font]}
              fontSize={l.fonts[seg.font]}
            >
              {seg.text}
            </SvgText>
          );
          cx += textWidth(seg.text, l.fonts[seg.font]) + m.segGap;
          return el;
        });
        if (li === 0) {
          for (const [ci, chip] of l.spec.chips.entries()) {
            const cw = textWidth(chip.text, l.fonts.chip) + m.chipPad;
            const col = conflict ? c.onDanger : c[chip.kind];
            parts.push(
              <G key={`c${ci}`}>
                <Rect x={cx + 0.5} y={by - l.fonts.chip - 0.5} width={cw} height={l.fonts.chip + 2} fill="none" stroke={col} strokeWidth={1} />
                <SvgText x={cx + m.chipPad / 2 + 0.5} y={by - 1} fill={col} fontFamily={f.chip.fontFamily} fontSize={l.fonts.chip}>
                  {chip.text}
                </SvgText>
              </G>,
            );
            cx += cw + m.chipGap;
          }
        }
        return <G key={li}>{parts}</G>;
      })}
    </G>
  );
}
