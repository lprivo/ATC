// Radar data blocks: content (what each label says) and auto-placement (where
// it goes). Ported from `labelSpec()` / `labels()` in docs/design/radar.js.
// Pure functions, no React / React Native imports, so they can be unit tested.
import { dirOf } from '../engine/math';
import type { Plane } from '../engine/types';
import { altHundreds } from './format';

/** Plane labels setting: Auto switches to Min above MIN_LABELS_ABOVE planes. */
export type LabelMode = 'auto' | 'full' | 'min';
export const MIN_LABELS_ABOVE = 8;
/** How long a go-around keeps its "GA" chip, in sim seconds. */
export const GA_CHIP_SEC = 60;

export type SegmentFont = 'label' | 'label2';
export interface Segment {
  text: string;
  font: SegmentFont;
  /** Drawn in the dim label colour (the aircraft type). */
  dim?: boolean;
}
export type ChipKind = 'danger' | 'good';
export interface Chip {
  text: string;
  kind: ChipKind;
}
export interface LabelSpec {
  lines: Segment[][];
  chips: Chip[];
}

export interface LabelContext {
  selected: boolean;
  /** Labels are in Min mode for this frame (setting, or Auto with many planes). */
  compact: boolean;
  /** Current sim time, for the go-around chip. */
  time: number;
}

/** Whether Min labels apply: Min mode, or Auto with more than MIN_LABELS_ABOVE planes. */
export const compactLabels = (mode: LabelMode, planeCount: number) =>
  mode === 'min' || (mode === 'auto' && planeCount > MIN_LABELS_ABOVE);

/**
 * What a plane's data block says.
 * - Line 1: callsign, the type when selected or in conflict, then chips (`!`, cleared runway, `GA`).
 * - Line 2: altitude in hundreds, trend arrow and target when climbing/descending, then speed (`070↓040 250`).
 * - Min mode (unless selected or in conflict): line 1 only, with the trend arrow.
 */
export function labelSpec(p: Plane, ctx: LabelContext): LabelSpec {
  const diff = p.target.altitude - p.altitude;
  const trend = diff > 50 ? '↑' : diff < -50 ? '↓' : '';
  const full = ctx.selected || p.conflict;
  const l1: Segment[] = [{ text: p.callsign, font: 'label' }];
  if (full) l1.push({ text: p.aircraftType, font: 'label2', dim: true });
  const chips: Chip[] = [];
  if (p.conflict) chips.push({ text: '!', kind: 'danger' });
  if (p.clearedRunway) chips.push({ text: p.clearedRunway.id, kind: 'good' });
  if (p.goAroundAt != null && ctx.time - p.goAroundAt < GA_CHIP_SEC) chips.push({ text: 'GA', kind: 'danger' });
  if (ctx.compact && !full) {
    if (trend) l1.push({ text: trend, font: 'label' });
    return { lines: [l1], chips };
  }
  // Like the design, the target is shown only when there is one: not the 0 ft glide target on final.
  const alt = altHundreds(p.altitude) + trend + (trend && p.target.altitude > 0 ? altHundreds(p.target.altitude) : '');
  return {
    lines: [l1, [{ text: alt, font: 'label2' }, { text: String(Math.round(p.speed)), font: 'label2' }]],
    chips,
  };
}

// ---- measuring -------------------------------------------------------------

/**
 * Approximate advance widths of Barlow Condensed, in em. react-native-svg can't
 * measure text synchronously, and a slightly generous estimate only makes the
 * backing box a little wider than the text.
 */
const WIDE = 0.5;
const charEm = (ch: string) => {
  if (ch >= '0' && ch <= '9') return 0.46;
  if (ch === ' ') return 0.2;
  if (ch === 'I' || ch === '1' || ch === '!') return 0.26;
  if ('MW'.includes(ch)) return 0.66;
  if (ch === '↑' || ch === '↓') return 0.6;
  if (ch === '·') return 0.24;
  return WIDE;
};
export const textWidth = (text: string, fontSize: number) => [...text].reduce((w, ch) => w + charEm(ch) * fontSize, 0);

export interface LabelFonts {
  label: number;
  label2: number;
  chip: number;
  lineHeight: number;
}
/** Gap after each segment, chip padding and the box padding, in pt (from radar.js). */
export const LABEL_METRICS = { segGap: 4, chipPad: 6, chipGap: 4, pad: 3 };

/** Baseline of line `li` in a box whose top is `top` (2 pt top padding, as in the design). */
export const labelBaseline = (top: number, li: number, f: { label: number; lineHeight: number }) => top + 2 + f.label + li * f.lineHeight - 1;

/** Width and height of a label's box. */
export function labelSize(spec: LabelSpec, f: LabelFonts) {
  const m = LABEL_METRICS;
  const lineW = spec.lines.map((line, i) => {
    let w = line.reduce((acc, s) => acc + textWidth(s.text, f[s.font]) + m.segGap, 0);
    if (i === 0) w += spec.chips.reduce((acc, c) => acc + textWidth(c.text, f.chip) + m.chipPad + m.chipGap, 0);
    return w;
  });
  return { w: Math.ceil(Math.max(...lineW)) + m.pad + 1, h: spec.lines.length * f.lineHeight + 4 };
}

// ---- placement --------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface LabelItem {
  id: string;
  /** Symbol position on screen. */
  x: number;
  y: number;
  heading: number;
  w: number;
  h: number;
  /** Placed first: selected (4) and conflict (2) labels win the best slots. */
  rank: number;
}
export interface PlacedLabel {
  id: string;
  rect: Rect;
  /** Leader line from near the symbol to the closest point of the box, when the box is far. */
  leader: { x1: number; y1: number; x2: number; y2: number } | null;
}

/** Slot preference by compass direction (N, NE, E, SE, S, SW, W, NW); lower is better. NE is the default. */
const PREF = [7, 0, 2, 5, 7, 4, 3, 3];
const SYMBOL_BOX = 20;
const LEADER_MIN = 9;
const LEADER_START = 8;

export const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Auto-places every label in one of 16 slots (8 compass positions at `near` pt
 * from the symbol, 8 more at `far` pt with a leader line), scoring each slot:
 * preference + 40 (far ring) + 120 (in front of the heading vector)
 * + overlap with placed labels × 5 + overlap with other symbols × 4
 * + area outside `safe` × 6. Selected and conflict labels go first;
 * `obstacles` (e.g. conflict pair tags) count as already placed.
 */
export function placeLabels(items: LabelItem[], opts: { near: number; far: number; safe: Rect; obstacles?: Rect[] }): PlacedLabel[] {
  const symbols = items.map((o) => ({ id: o.id, r: { x: o.x - SYMBOL_BOX / 2, y: o.y - SYMBOL_BOX / 2, w: SYMBOL_BOX, h: SYMBOL_BOX } }));
  const placed: Rect[] = [...(opts.obstacles ?? [])];
  const order = [...items].sort((a, b) => b.rank - a.rank);
  const out: PlacedLabel[] = [];
  for (const o of order) {
    const hd = dirOf(o.heading);
    const head = { x: hd.x, y: -hd.y }; // screen space
    let best: Rect = { x: o.x, y: o.y, w: o.w, h: o.h };
    let bestScore = Infinity;
    for (const R of [opts.near, opts.far]) {
      for (let j = 0; j < 8; j++) {
        const ux = Math.sin((j * Math.PI) / 4);
        const uy = -Math.cos((j * Math.PI) / 4);
        const x = ux > 0.1 ? o.x + R * ux : ux < -0.1 ? o.x + R * ux - o.w : o.x - o.w / 2;
        const y = uy > 0.1 ? o.y + R * uy : uy < -0.1 ? o.y + R * uy - o.h : o.y - o.h / 2;
        const r = { x, y, w: o.w, h: o.h };
        let score = PREF[j] + (R > opts.near ? 40 : 0) + (ux * head.x + uy * head.y > 0.4 ? 120 : 0);
        for (const q of placed) score += overlap(r, q) * 5;
        for (const s of symbols) if (s.id !== o.id) score += overlap(r, s.r) * 4;
        score += (o.w * o.h - overlap(r, opts.safe)) * 6;
        if (score < bestScore) {
          bestScore = score;
          best = r;
        }
      }
    }
    placed.push(best);
    out.push({ id: o.id, rect: best, leader: leaderFor(o, best) });
  }
  return out;
}

/** Leader line from 8 pt out from the symbol to the box's nearest point, if the box is more than 9 pt away. */
export function leaderFor(o: { x: number; y: number }, r: Rect) {
  const nx = Math.max(r.x, Math.min(o.x, r.x + r.w));
  const ny = Math.max(r.y, Math.min(o.y, r.y + r.h));
  const d = Math.hypot(nx - o.x, ny - o.y);
  if (d <= LEADER_MIN) return null;
  return { x1: o.x + ((nx - o.x) / d) * LEADER_START, y1: o.y + ((ny - o.y) / d) * LEADER_START, x2: nx, y2: ny };
}

/** Design: re-run placement at 2 Hz and ease labels 150 ms to their new slot. */
export const PLACE_EVERY_MS = 500;
export const EASE_MS = 150;

/** A label's offset from its plane symbol, easing from `from` to `to` since `t0`. */
export interface Slot {
  from: Rect;
  to: Rect;
  t0: number;
}

/**
 * Offset to draw now for a slot. When not animating (paused: nothing re-renders
 * to finish an ease) the label goes straight to its target, even mid-ease.
 */
export const slotOffset = (s: Slot, now: number, animate = true) => (animate ? easeRect(s.from, s.to, (now - s.t0) / EASE_MS) : s.to);

/**
 * New slots after a placement run. `placed` are offsets from each symbol. A
 * plane seen before eases from wherever its label is drawn now; a new plane, or
 * any plane when `animate` is false (e.g. paused, where nothing re-renders to
 * finish an ease), snaps. Planes no longer present are dropped.
 */
export function nextSlots(prev: ReadonlyMap<string, Slot>, placed: ReadonlyMap<string, Rect>, now: number, animate: boolean) {
  const out = new Map<string, Slot>();
  for (const [id, to] of placed) {
    const old = prev.get(id);
    out.set(id, { from: old && animate ? slotOffset(old, now) : to, to, t0: now });
  }
  return out;
}

/** Whether placement must re-run: content changed, or it's been PLACE_EVERY_MS since the last run. */
export const needsPlacement = (lastKey: string, key: string, lastAt: number, now: number) => key !== lastKey || now - lastAt >= PLACE_EVERY_MS;

/** Planes within this margin of the screen get labels (as in the design); others don't. */
export const LABEL_SCREEN_MARGIN = 30;
export const onScreen = (x: number, y: number, w: number, h: number) =>
  x > -LABEL_SCREEN_MARGIN && x < w + LABEL_SCREEN_MARGIN && y > -LABEL_SCREEN_MARGIN && y < h + LABEL_SCREEN_MARGIN;

/**
 * Eases a label from where it was drawn towards its newly chosen slot.
 * `t` is 0..1 of the 150 ms transition; a cubic ease-out.
 */
export function easeRect(from: Rect, to: Rect, t: number): Rect {
  const k = 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, w: to.w, h: to.h };
}
