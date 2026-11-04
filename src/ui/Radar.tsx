import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text as SvgText, TSpan } from 'react-native-svg';
import type { Sim } from '../engine/sim';
import type { Airport, Conflict, Plane, Vec2 } from '../engine/types';
import { useTheme } from '../theme/ThemeContext';
import { useLabelLayout, type DrawnLabel } from './useLabelLayout';
import type { Theme } from '../theme/themes';
import {
  bracketPath,
  centreline,
  chevron,
  conflictRingRadius,
  fixTriangle,
  pairTag,
  planeTail,
  RANGE_RINGS_NM,
  ringLabels,
  runwayLabelPos,
  runwayWidth,
} from './radarGeometry';
import { feedback } from '../game/feedback';
import type { AltUnit, DistUnit } from '../game/settings';
import { DrawOverlay } from './DrawOverlay';
import { CLEARED_LINE, snapTarget } from './drawing';
import { useWebZoom } from './useWebZoom';
import { HUD_EDGE } from './hudLayout';
import { LABEL_METRICS, labelBaseline, textWidth, type LabelMode, type LabelSpec } from './labels';
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
  toScreen,
  toWorld,
  type Viewport,
} from './viewport';

/** Gap kept between a selected plane and the HUD above it. */
const SELECT_TOP_GAP = 24;
const RECENTRE_SIZE = 44;
/** Keep the selected plane above the re-centre button. */
const SELECT_BOTTOM_INSET = RECENTRE_SIZE + 2 * HUD_EDGE;
const NO_INSETS = { top: 0, bottom: 0 };
const DEFAULT_UNITS = { dist: 'nm', alt: 'ft' } as const;

interface Props {
  sim: Sim;
  selectedId: string | null;
  onSelect: (id: string | null, opts?: { silent?: boolean }) => void;
  /** Called after the radar changes the sim (a new route), so the screen can redraw while paused. */
  onCommand: () => void;
  /**
   * A drawn path snapped to a runway was released: the screen finalises it,
   * clears the plane to that runway and shows the confirm card. `points` are
   * the raw drawn points (without the plane's position).
   */
  onLanding?: (planeId: string, points: Vec2[], runway: string) => void;
  /** Drawing started or stopped (the sim runs at half speed while drawing). */
  onDrawing?: (drawing: boolean) => void;
  /**
   * Screen space covered by HUD overlays (top bar, toasts, sheet): a selected
   * plane is kept between them and the re-centre button sits above the bottom one.
   */
  insets?: { top: number; bottom: number };
  /** While paused nothing re-renders on its own, so labels snap instead of easing. */
  paused?: boolean;
  /** Plane labels setting (Auto | Full | Min); default Auto. */
  labelMode?: LabelMode;
  /** Label size setting (theme LABEL_SCALE); default 1. */
  labelScale?: number;
  /** Controls on the left (settings): the re-centre button moves to the left edge. */
  handedness?: 'left' | 'right';
  /** Distance and altitude units (settings) for the conflict pair tag. */
  units?: { dist: DistUnit; alt: AltUnit };
  /** The camera as drawn, after each change (the tutorial watches zoom and places its marks). */
  onViewport?: (vp: Viewport) => void;
}

export function Radar({ sim, selectedId, onSelect, onCommand, onLanding, onDrawing, paused = false, labelMode = 'auto', labelScale = 1, insets = NO_INSETS, handedness = 'right', units = DEFAULT_UNITS, onViewport }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [vp, setVp] = useState<Viewport>(() => defaultViewport(0, 0));
  const reportVp = useRef(onViewport);
  reportVp.current = onViewport;
  useEffect(() => reportVp.current?.(vp), [vp]);

  // Data blocks: content every frame, placement at 2 Hz. Touch handlers read the
  // last drawn rectangles so a tap on a label selects its plane.
  const labels = useLabelLayout(sim, vp, theme, { selectedId, mode: labelMode, labelScale, animate: !paused, insets, units });
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  // Hit-test against what is on screen: label boxes and symbols from the same (rendered) camera.
  const drawnVp = useRef(vp);
  drawnVp.current = vp;

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
    const wasDrawing = g.current.drawing;
    // Where the path being drawn started (the plane's position then), as the overlay used it.
    const drawStart = g.current.points[0];
    g.current = step.state;
    if (step.state.drawing !== wasDrawing) {
      if (step.state.drawing) feedback('drawStart');
      onDrawing?.(step.state.drawing);
    }
    for (const e of step.effects) {
      if (e.kind === 'camera') updateCam(() => e.vp);
      // A select that comes with starting a draw is silent: the draw-start haptic covers it.
      else if (e.kind === 'select') onSelect(e.id, { silent: step.state.drawing && !wasDrawing });
      else if (e.kind === 'route') {
        // Released over the sheet: the path is dropped (design: cancel by dropping it on the sheet).
        if (e.at.y > drawnVp.current.h - insets.bottom) continue;
        // Snap from the same points the overlay showed (the draw's start point first).
        const snap = snapTarget(sim.airport, drawnVp.current, drawStart ? [drawStart, ...e.points] : e.points);
        if (snap && onLanding) onLanding(e.id, e.points, snap);
        // When the screen handles landings, a path the UI didn't snap never lands.
        else sim.setRoute(e.id, e.points, onLanding ? null : undefined);
        onCommand();
      } else if (e.kind === 'armHold') {
        cancelHold();
        // Through a ref, so the timer uses the latest render's sim (a restart may swap it).
        hold.current = setTimeout(() => runRef.current(beginDraw(g.current, planePosRef.current(g.current.planeId))), HOLD_MS);
      } else if (e.kind === 'cancelHold') cancelHold();
      else redrawDraft();
    }
  };
  // The draft redraws at most once per animation frame (touch moves arrive at 60–120 Hz).
  const draftFrame = useRef<number | null>(null);
  const redrawDraft = () => {
    if (draftFrame.current != null) return;
    draftFrame.current = requestAnimationFrame(() => {
      draftFrame.current = null;
      setDraftVersion((v) => v + 1);
    });
  };
  useEffect(
    () => () => {
      if (draftFrame.current != null) cancelAnimationFrame(draftFrame.current);
      draftFrame.current = null;
    },
    [],
  );
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
    const hit = hitTest(sim.planes, drawnVp.current, labelsRef.current, first.x, first.y, theme.size.hitRadius);
    run(onDown(g.current, touches.length ? touches : [{ ...first, id: 0 }], Date.now(), hit, cam.current));
  };
  const onMoveEvent = (e: GestureResponderEvent) => run(onMove(g.current, touchesOf(e), cam.current, planePos(g.current.planeId)));
  const onRelease = (e: GestureResponderEvent) => run(onUp(g.current, pointOf(e), Date.now(), cam.current));
  const onTerminate = () => run(onCancel(g.current));

  // Web: wheel and trackpad-pinch zoom (see useWebZoom).
  const hostRef = useRef<ComponentRef<typeof View>>(null);
  useWebZoom(hostRef, cam, updateCam);

  // When a plane is selected (or the radar is resized), pan just enough to keep
  // it on screen. Never while a path is being drawn: the map must not move under the finger.
  useEffect(() => {
    if (!selectedId || g.current.drawing) return;
    const p = sim.plane(selectedId);
    if (!p || vp.w === 0) return;
    // The design keeps it below y = 120 on the full-bleed screen: that's the HUD plus a gap.
    updateCam((v) => ensureVisible(v, p.pos, insets.top + SELECT_TOP_GAP, v.h - insets.bottom - SELECT_BOTTOM_INSET));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, sim, vp.w, vp.h, insets.top, insets.bottom]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    updateCam((v) => resizeViewport(v, width, height));
  };

  const drawing = g.current.drawing;
  const finger = drawing ? toWorld(vp, g.current.finger.x, g.current.finger.y) : null;
  const drawn = drawing && finger ? [...g.current.points, finger] : [];
  const snap = drawing ? snapTarget(sim.airport, vp, drawn) : null;
  // A rigid tick each time the path snaps onto a runway (not when it lets go).
  const lastSnap = useRef<string | null>(null);
  useEffect(() => {
    if (snap && snap !== lastSnap.current) feedback('snap');
    lastSnap.current = snap;
  }, [snap]);

  return (
    <View
      ref={hostRef}
      style={[styles.host, { backgroundColor: c.background }]}
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
            {/* Snap highlight and the draft sit under the planes, as in the design; the loupe and chip go on top. */}
            {drawing && finger && (
              <DrawOverlay layer="under" airport={sim.airport} vp={vp} theme={theme} points={g.current.points} finger={finger} snap={snap} insets={insets} />
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
              <PairTag key={`pt-${cf.a}-${cf.b}`} sim={sim} conflict={cf} vp={vp} theme={theme} units={units} />
            ))}
            {drawing && finger && (
              <DrawOverlay layer="over" airport={sim.airport} vp={vp} theme={theme} points={g.current.points} finger={finger} snap={snap} insets={insets} />
            )}
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
          { bottom: insets.bottom + HUD_EDGE },
          handedness === 'left' && { right: 'auto', left: HUD_EDGE },
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
  // Drags on the radar pan or draw; on the web they must not select label text.
  // Web: every touch on the radar is the game's (pan, pinch, draw). Without
  // `touchAction: 'none'` a mobile browser zooms or scrolls the page instead.
  host: { flex: 1, overflow: 'hidden', ...Platform.select({ web: { userSelect: 'none' as const, touchAction: 'none' as const }, default: {} }) },
  recentre: {
    position: 'absolute',
    right: HUD_EDGE,
    bottom: HUD_EDGE,
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
export const StaticMap = memo(function StaticMap({ airport, vp, theme, rings = true }: { airport: Airport; vp: Viewport; theme: Theme; /** Range rings and their labels (off when something else draws them, e.g. the menu's sweep layer). */ rings?: boolean }) {
  const c = theme.colors;
  const fixFont = theme.radarFont.fix;
  const rwyFont = theme.radarFont.runway;
  const centre = toScreen(vp, { x: 0, y: 0 });
  const ends = airport.runways.flatMap((r) => r.ends);
  const rwW = runwayWidth(vp.scale);
  return (
    <G>
      {rings && RANGE_RINGS_NM.filter((r) => r <= airport.rangeNm).map((r) => (
        <Circle key={r} cx={centre.x} cy={centre.y} r={r * vp.scale} stroke={c.rangeRing} strokeWidth={1} fill="none" />
      ))}
      {rings && ringLabels(vp, airport.rangeNm).map((l) => (
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
      <Polyline points={polylinePoints(vp, pts)} fill="none" stroke={color} strokeWidth={cleared ? CLEARED_LINE.width : 2} strokeDasharray={cleared ? undefined : '7 5'} />
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
function PairTag({ sim, conflict, vp, theme, units }: { sim: Sim; conflict: Conflict; vp: Viewport; theme: Theme; units: { dist: DistUnit; alt: AltUnit } }) {
  const pair = pairPlanes(sim, conflict);
  if (!pair) return null;
  const f = theme.radarFont.chip;
  const t = pairTag(vp, pair[0].pos, pair[1].pos, conflict.distNm, conflict.altFt, f.fontSize, units);
  return (
    <G>
      <Rect x={t.rect.x} y={t.rect.y} width={t.rect.w} height={t.rect.h} fill={theme.colors.danger} />
      <SvgText x={t.x} y={t.y + 3.5} fill={theme.colors.onDanger} fontFamily={f.fontFamily} fontSize={f.fontSize} textAnchor="middle">
        {t.text}
      </SvgText>
    </G>
  );
}

export function PlaneGlyph({ plane: p, vp, theme, selected }: { plane: Plane; vp: Viewport; theme: Theme; selected: boolean }) {
  const c = theme.colors;
  const z = theme.size;
  const s = toScreen(vp, p.pos);
  const color = p.conflict ? c.planeConflict : selected ? c.planeSelected : c.plane;
  const half = z.planeSymbol / 2;

  return (
    <G>
      {/* The tail: behind the plane, as long as a minute of flight at its current speed. */}
      {planeTail(p, vp, z.tail).map((piece, i) => (
        <Polyline
          key={i}
          points={piece.points.map((q) => `${q.x},${q.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeOpacity={piece.opacity}
          strokeWidth={piece.width}
          strokeLinecap="butt"
          strokeLinejoin="round"
        />
      ))}
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
 * Each line is one text element so the real text flow spaces its words; the
 * width estimate only sizes the box and places the chips.
 */
export function DataBlock({ label: l, conflict, selected, theme }: { label: DrawnLabel; conflict: boolean; selected: boolean; theme: Theme }) {
  const c = theme.colors;
  const f = theme.radarFont;
  const m = LABEL_METRICS;
  const { x, y, w, h } = l.rect;
  const base = conflict ? c.onDanger : selected ? c.planeSelected : c.plane;
  const family = { label: f.label.fontFamily, label2: f.label2.fontFamily };
  return (
    <G>
      {l.leader && <Line {...l.leader} stroke={conflict ? c.danger : c.textDim} strokeWidth={1} opacity={0.7} />}
      <Rect x={x} y={y} width={w} height={h} fill={conflict ? c.danger : c.labelBg} />
      {selected && !conflict && <Rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} fill="none" stroke={c.planeSelected} strokeWidth={1} />}
      {l.spec.lines.map((line, li) => {
        const by = labelBaseline(y, li, l.fonts);
        const textEnd = x + m.pad + line.reduce((acc, seg) => acc + textWidth(seg.text, l.fonts[seg.font]) + m.segGap, 0);
        return (
          <G key={li}>
            <SvgText x={x + m.pad} y={by}>
              {line.map((seg, si) => (
                <TSpan
                  key={si}
                  dx={si === 0 ? 0 : m.segGap}
                  fill={seg.dim ? (conflict ? c.onDanger : c.fixLabel) : base}
                  fontFamily={family[seg.font]}
                  fontSize={l.fonts[seg.font]}
                >
                  {seg.text}
                </TSpan>
              ))}
            </SvgText>
            {li === 0 && <Chips chips={l.spec.chips} x={textEnd} baseline={by} size={l.fonts.chip} conflict={conflict} theme={theme} />}
          </G>
        );
      })}
    </G>
  );
}

function Chips({ chips, x, baseline, size, conflict, theme }: { chips: LabelSpec['chips']; x: number; baseline: number; size: number; conflict: boolean; theme: Theme }) {
  const m = LABEL_METRICS;
  let cx = x;
  return (
    <G>
      {chips.map((chip, i) => {
        const cw = textWidth(chip.text, size) + m.chipPad;
        const col = conflict ? theme.colors.onDanger : theme.colors[chip.kind];
        const at = cx;
        cx += cw + m.chipGap;
        return (
          <G key={i}>
            <Rect x={at + 0.5} y={baseline - size - 0.5} width={cw} height={size + 2} fill="none" stroke={col} strokeWidth={1} />
            <SvgText x={at + m.chipPad / 2 + 0.5} y={baseline - 1} fill={col} fontFamily={theme.radarFont.chip.fontFamily} fontSize={size}>
              {chip.text}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}
