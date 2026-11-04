// The radio desk (issue #49): collects the player's commands per plane and
// merges a burst of them (stepper taps and holds) into a single call. Pure (no
// React / React Native / expo imports): `radioScript.ts` turns a call into
// recorded phrases and `radioVoice.ts` plays them.

/** What changed for one plane in one call (only what the player changed). */
export interface CallChanges {
  heading?: number;
  altitude?: number;
  speed?: number;
  /** Cleared to land on this runway end. */
  land?: string;
}

/** The plane as it is when the call goes out (its turn direction, climb or descent, faster or slower). */
export interface PlaneNow {
  callsign: string;
  heading: number;
  altitude: number;
  speed: number;
}

/** One call to make: what to say to which plane, as it is now. */
export interface RadioCall {
  planeId: string;
  changes: CallChanges;
  plane: PlaneNow;
}

// ---- the desk: merging bursts of commands ---------------------------------------------------

/** A call goes out once the player has left a plane alone this long (stepper taps and holds merge into one call). */
export const RADIO_QUIET_MS = 900;

export type RadioCommand = { kind: 'heading' | 'altitude' | 'speed'; value: number } | { kind: 'land'; runway: string };

interface Pending {
  changes: CallChanges;
  lastAt: number;
}

/**
 * Collects commands per plane and hands out one call per plane once the
 * player has stopped changing it. A value stepped away and back again (or
 * already said) isn't said twice.
 */
export class RadioDesk {
  private pending = new Map<string, Pending>();
  private said = new Map<string, CallChanges>();

  note(planeId: string, cmd: RadioCommand, now: number) {
    const p = this.pending.get(planeId) ?? { changes: {}, lastAt: now };
    if (cmd.kind === 'land') p.changes.land = cmd.runway;
    else {
      p.changes[cmd.kind] = cmd.value;
      // An altitude or heading command takes the plane off its approach: a new clearance has to be said again.
      if (cmd.kind !== 'speed') {
        delete p.changes.land;
        const s = this.said.get(planeId);
        if (s) delete s.land;
      }
    }
    p.lastAt = now;
    this.pending.set(planeId, p);
  }

  /** Calls whose plane has been quiet for `RADIO_QUIET_MS`, oldest first. `plane` looks the plane up as it is now (undefined: gone, the call is dropped). */
  due(now: number, plane: (id: string) => PlaneNow | undefined): RadioCall[] {
    const ready = [...this.pending.entries()].filter(([, p]) => now - p.lastAt >= RADIO_QUIET_MS).sort((a, b) => a[1].lastAt - b[1].lastAt);
    const out: RadioCall[] = [];
    for (const [id, p] of ready) {
      this.pending.delete(id);
      const said = this.said.get(id) ?? {};
      const fresh: CallChanges = {};
      for (const k of ['heading', 'altitude', 'speed', 'land'] as const) {
        if (p.changes[k] !== undefined && p.changes[k] !== said[k]) (fresh as Record<string, unknown>)[k] = p.changes[k];
      }
      const now = plane(id);
      if (!now || Object.keys(fresh).length === 0) continue;
      this.said.set(id, { ...said, ...fresh });
      out.push({ planeId: id, changes: fresh, plane: now });
    }
    return out;
  }

  /** Forget everything (a new session). */
  clear() {
    this.pending.clear();
    this.said.clear();
  }
}
