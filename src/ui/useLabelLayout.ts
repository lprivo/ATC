import { useRef } from 'react';
import type { Sim } from '../engine/sim';
import type { Theme } from '../theme/themes';
import {
  compactLabels,
  labelSize,
  labelSpec,
  leaderFor,
  needsPlacement,
  nextSlots,
  onScreen,
  placeLabels,
  slotOffset,
  type LabelMode,
  type LabelSpec,
  type PlacedLabel,
  type Rect,
  type Slot,
} from './labels';
import { pairTag } from './radarGeometry';
import { toScreen, type Viewport } from './viewport';

export interface DrawnLabel extends PlacedLabel {
  spec: LabelSpec;
  /** Font sizes after labelScale. */
  fonts: { label: number; label2: number; chip: number; lineHeight: number };
}

/**
 * Data blocks for on-screen planes: content every frame, placement at 2 Hz
 * (and immediately when the selection, the plane set or label content changes),
 * eased 150 ms between slots. Slots are offsets from the symbol, so labels
 * travel with their plane and with the camera between placements.
 */
export function useLabelLayout(
  sim: Sim,
  vp: Viewport,
  theme: Theme,
  opts: { selectedId: string | null; mode: LabelMode; labelScale: number; animate: boolean; insets?: { top: number; bottom: number } },
) {
  const state = useRef({ at: 0, key: '', slots: new Map<string, Slot>() as ReadonlyMap<string, Slot> });
  const now = Date.now();
  const f = theme.radarFont;
  const fonts = {
    label: f.label.fontSize * opts.labelScale,
    label2: f.label2.fontSize * opts.labelScale,
    chip: f.chip.fontSize * opts.labelScale,
    lineHeight: f.labelLineHeight * opts.labelScale,
  };
  const compact = compactLabels(opts.mode, sim.planes.length);
  const items = sim.planes.flatMap((p) => {
    const s = toScreen(vp, p.pos);
    if (!onScreen(s.x, s.y, vp.w, vp.h)) return [];
    const selected = p.id === opts.selectedId;
    const spec = labelSpec(p, { selected, compact, time: sim.time });
    return [{ p, spec, s, size: labelSize(spec, fonts), rank: (selected ? 4 : 0) + (p.conflict ? 2 : 0) }];
  });

  const st = state.current;
  // Content that should re-place labels at once. While running, the camera is
  // deliberately not part of it: offsets are in screen points, so labels follow
  // pans and zooms and the 2 Hz pass tidies up. While paused there is no next
  // pass, so a camera change re-places at once (rounded, to skip sub-pixel moves).
  const camKey = opts.animate ? '' : `${vp.scale.toFixed(1)},${Math.round(vp.ox / 8)},${Math.round(vp.oy / 8)}`;
  // The HUD's safe area changes when the conflict banner comes and goes.
  const insetKey = `${opts.insets?.top ?? 0},${opts.insets?.bottom ?? 0}`;
  const key = [opts.selectedId, opts.mode, opts.labelScale, camKey, insetKey, items.map((i) => `${i.p.id}:${i.size.w.toFixed(0)}x${i.size.h}`).join(',')].join('|');
  if (needsPlacement(st.key, key, st.at, now)) {
    const obstacles = sim.conflicts.flatMap((cf) => {
      const a = sim.plane(cf.a);
      const b = sim.plane(cf.b);
      if (!a || !b) return [];
      const r = pairTag(vp, a.pos, b.pos, cf.distNm, cf.altFt, f.chip.fontSize).rect;
      // A little clearance around the chip.
      return [{ x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 }];
    });
    const placed = placeLabels(
      items.map((i) => ({ id: i.p.id, x: i.s.x, y: i.s.y, heading: i.p.heading, w: i.size.w, h: i.size.h, rank: i.rank })),
      { near: theme.size.labelOffsetNear, far: theme.size.labelOffsetFar, safe: safeArea(vp, opts.insets), obstacles },
    );
    const byId = new Map(items.map((i) => [i.p.id, i.s]));
    const offsets = new Map<string, Rect>();
    for (const pl of placed) {
      const s = byId.get(pl.id)!;
      offsets.set(pl.id, { x: pl.rect.x - s.x, y: pl.rect.y - s.y, w: pl.rect.w, h: pl.rect.h });
    }
    st.slots = nextSlots(st.slots, offsets, now, opts.animate);
    st.at = now;
    st.key = key;
  }

  const out = new Map<string, DrawnLabel>();
  for (const it of items) {
    const slot = st.slots.get(it.p.id);
    if (!slot) continue;
    const off = slotOffset(slot, now, opts.animate);
    const rect = { x: it.s.x + off.x, y: it.s.y + off.y, w: it.size.w, h: it.size.h };
    out.set(it.p.id, { id: it.p.id, rect, leader: leaderFor(it.s, rect), spec: it.spec, fonts });
  }
  return out;
}

/** Where labels may go: the radar minus the HUD overlays at the top and bottom. */
const safeArea = (vp: Viewport, insets = { top: 0, bottom: 0 }) => ({ x: 0, y: insets.top, w: vp.w, h: Math.max(0, vp.h - insets.top - insets.bottom) });
