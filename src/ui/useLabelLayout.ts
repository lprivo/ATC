import { useRef } from 'react';
import type { Sim } from '../engine/sim';
import type { Theme } from '../theme/themes';
import {
  compactLabels,
  easeRect,
  labelSize,
  labelSpec,
  leaderFor,
  placeLabels,
  type LabelMode,
  type LabelSpec,
  type PlacedLabel,
  type Rect,
} from './labels';
import { pairTag } from './radarGeometry';
import { toScreen, type Viewport } from './viewport';

/** Design: re-run placement at 2 Hz and ease labels 150 ms to their new slot. */
const PLACE_EVERY_MS = 500;
const EASE_MS = 150;

export interface DrawnLabel extends PlacedLabel {
  spec: LabelSpec;
  /** Font sizes after labelScale. */
  fonts: { label: number; label2: number; chip: number; lineHeight: number };
}

interface Slot {
  /** Box offset from the symbol, eased from `from` to `to` starting at `t0`. */
  from: Rect;
  to: Rect;
  t0: number;
}

/**
 * Data blocks for every plane: content each frame, placement at 2 Hz (and
 * immediately when the selection, plane set or camera changes), eased 150 ms
 * between slots. Offsets are kept relative to the symbol so labels travel with
 * their plane between placements.
 */
export function useLabelLayout(sim: Sim, vp: Viewport, theme: Theme, selectedId: string | null, mode: LabelMode, labelScale: number) {
  const state = useRef({ at: 0, key: '', slots: new Map<string, Slot>() });
  const now = Date.now();
  const f = theme.radarFont;
  const fonts = {
    label: f.label.fontSize * labelScale,
    label2: f.label2.fontSize * labelScale,
    chip: f.chip.fontSize * labelScale,
    lineHeight: f.labelLineHeight * labelScale,
  };
  const compact = compactLabels(mode, sim.planes.length);
  const items = sim.planes.map((p) => {
    const selected = p.id === selectedId;
    const spec = labelSpec(p, { selected, compact, time: sim.time });
    const size = labelSize(spec, fonts);
    const s = toScreen(vp, p.pos);
    return { p, spec, s, size, rank: (selected ? 4 : 0) + (p.conflict ? 2 : 0) };
  });

  const st = state.current;
  const key = [selectedId, mode, labelScale, vp.w, vp.h, vp.ox.toFixed(0), vp.oy.toFixed(0), vp.scale, items.map((i) => `${i.p.id}:${i.spec.lines.length}:${i.p.conflict ? 1 : 0}`).join(',')].join('|');
  if (key !== st.key || now - st.at >= PLACE_EVERY_MS) {
    // Fields 3-7 of the key are the camera.
    const instant = st.key.split('|').slice(3, 8).join('|') !== key.split('|').slice(3, 8).join('|');
    const obstacles = sim.conflicts.flatMap((cf) => {
      const a = sim.plane(cf.a);
      const b = sim.plane(cf.b);
      if (!a || !b) return [];
      const t = pairTag(vp, a.pos, b.pos, cf.distNm, cf.altFt);
      const w = t.text.length * f.chip.fontSize * 0.5 + 12;
      return [{ x: t.x - w / 2, y: t.y - 9, w, h: 18 }];
    });
    const placed = placeLabels(
      items.map((i) => ({ id: i.p.id, x: i.s.x, y: i.s.y, heading: i.p.heading, w: i.size.w, h: i.size.h, rank: i.rank })),
      { near: theme.size.labelOffsetNear, far: theme.size.labelOffsetFar, safe: { x: 0, y: 0, w: vp.w, h: vp.h }, obstacles },
    );
    const next = new Map<string, Slot>();
    for (const pl of placed) {
      const it = items.find((i) => i.p.id === pl.id)!;
      const to = { x: pl.rect.x - it.s.x, y: pl.rect.y - it.s.y, w: pl.rect.w, h: pl.rect.h };
      const prev = st.slots.get(pl.id);
      // New planes, and camera moves (which shift every symbol at once), snap; ordinary re-slots ease.
      const from = prev && !instant ? easeRect(prev.from, prev.to, (now - prev.t0) / EASE_MS) : to;
      next.set(pl.id, { from, to, t0: now });
    }
    st.slots = next;
    st.at = now;
    st.key = key;
  }

  const out = new Map<string, DrawnLabel>();
  for (const it of items) {
    const slot = st.slots.get(it.p.id);
    if (!slot) continue;
    const off = easeRect(slot.from, slot.to, (now - slot.t0) / EASE_MS);
    // Content can change width between placements (e.g. a new chip): size the box to the content now.
    const rect = { x: it.s.x + off.x, y: it.s.y + off.y, w: it.size.w, h: it.size.h };
    out.set(it.p.id, { id: it.p.id, rect, leader: leaderFor(it.s, rect), spec: it.spec, fonts });
  }
  return out;
}
