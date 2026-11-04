import { useState } from 'react';
import type { Sim } from '../engine/sim';
import type { Plane, Vec2 } from '../engine/types';
import { finalisePath, parallelEnd, pastFinalFix, remainingPoints } from '../ui/drawing';
import { radioCommand } from './radioVoice';

interface Pending {
  /** Increases per landing, so the confirm card (and its countdown) restarts for each one. */
  seq: number;
  planeId: string;
  /** Raw drawn points, so Swap can re-finalise them for the other runway. */
  raw: Vec2[];
  runway: string;
}

/**
 * A path the player snapped to a runway, waiting on the confirm card. The
 * clearance applies at once (the plane starts flying it); the card offers a
 * Swap to the parallel runway until it is confirmed or times out. It goes away
 * on its own when the sim changes (restart) or the clearance no longer matches
 * (the player redrew the path, changed altitude, the plane landed or went around).
 */
export function usePendingLanding(sim: Sim) {
  const [pending, setPending] = useState<(Pending & { sim: Sim }) | null>(null);
  const plane: Plane | undefined = pending && pending.sim === sim ? sim.plane(pending.planeId) : undefined;
  const live = pending && plane && plane.clearedRunway?.id === pending.runway ? pending : null;

  const land = (planeId: string, raw: Vec2[], runway: string) => {
    const p = sim.plane(planeId);
    const end = sim.runwayEnd(runway);
    if (!p || !end) return;
    sim.setRoute(planeId, finalisePath(raw, end, p.pos), end.id);
    radioCommand(planeId, { kind: 'land', runway: end.id });
    setPending((prev) => ({ seq: (prev?.seq ?? 0) + 1, sim, planeId, raw, runway: end.id }));
  };

  // No swap once the plane is past the other runway's final fix: the swap would turn it back.
  const other = live ? parallelEnd(sim.airport, live.runway) : null;
  const swapTo = other && plane && !pastFinalFix(plane.pos, other) ? other.id : null;
  const swap = () => {
    if (!live || !plane || !swapTo) return;
    const end = sim.runwayEnd(swapTo)!;
    // Only what's still ahead of the plane: it mustn't turn back for points it has passed.
    const ahead = remainingPoints(live.raw, plane.pos);
    sim.setRoute(live.planeId, finalisePath(ahead, end, plane.pos), end.id);
    radioCommand(live.planeId, { kind: 'land', runway: end.id });
    setPending({ ...live, raw: ahead, runway: end.id, seq: live.seq + 1 });
  };

  const done = () => setPending(null);

  return { pending: live, plane: live ? plane : undefined, swapTo, land, swap, done };
}
