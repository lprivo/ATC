import { add, angleDiff, approach, clamp, dirOf, dist, headingTo, normDeg, trackOffsets } from './math';
import type { Airport, Conflict, Plane, RunwayEnd, SimEvent, SimEventKind, SimStats, TrafficEntry, Vec2 } from './types';

// Aircraft performance — deliberately simple and identical for every type for now.
export const PERF = {
  turnRateDegPerSec: 3, // standard-rate turn
  climbFtPerSec: 2000 / 60,
  accelKtPerSec: 2,
  minSpeed: 140,
  maxSpeed: 320,
  minAltitude: 1000,
  maxAltitude: 20000,
  approachSpeed: 150,
  goAroundSpeed: 200,
};

export const RULES = {
  separationNm: 3,
  separationFt: 1000,
  /** A drawn path ending this close to a threshold counts as "cleared to land". */
  runwaySnapNm: 1.5,
  touchdownRadiusNm: 0.5,
  touchdownMaxAltFt: 1200,
  touchdownMaxAngleDeg: 45,
  glideFtPerNm: 318, // ~3° glideslope
  waypointCaptureNm: 0.4,
  minRouteSpacingNm: 0.4,
  goAroundAltitude: 3000,
  /** Within this distance of the threshold, the plane must be pointing at it... */
  finalCheckNm: 2.5,
  /** ...to within this many degrees, or it goes around. */
  finalMaxOffDeg: 60,
  /** Planes slow to approach speed with this much path left to the threshold. */
  approachZoneNm: 10,
  /** How much of the end of a drawn path decides which way the player means to land. */
  finalLegLookbackNm: 1.5,
  /** A waypoint this close but this far off the nose has been overflown; skip it. */
  waypointBehindNm: 1.5,
  waypointBehindDeg: 100,
  /** "Established on final" (for parallel approaches): within this angle of the runway heading... */
  establishedMaxOffDeg: 30,
  /** ...and this close to the extended centreline (half the usual parallel-runway spacing). */
  establishedMaxCrossTrackNm: 0.5,
};

/** Radius of a standard-rate turn at the given speed. */
export const turnRadiusNm = (speedKt: number) =>
  speedKt / 3600 / ((PERF.turnRateDegPerSec * Math.PI) / 180);

const MAX_SUBSTEP_SEC = 0.25;

/** Distance still to fly along the plane's route, from its current position. */
export function remainingPathNm(p: Plane): number {
  let total = 0;
  let from = p.pos;
  for (const wp of p.route) {
    total += dist(from, wp);
    from = wp;
  }
  return total;
}

/** Signed distances of `pt` relative to a runway end: `along` > 0 is past the threshold. */
function runwayFrame(pt: Vec2, end: RunwayEnd) {
  const { along, cross } = trackOffsets(pt, end.threshold, end.heading);
  return { along, cross: Math.abs(cross) };
}

/**
 * Established on final: cleared, within the approach zone, roughly aligned with
 * the runway and close to its extended centreline. Judged from the plane itself,
 * not its route, because a finger-drawn path keeps many waypoints until the end.
 */
function establishedOnFinal(p: Plane): boolean {
  const r = p.clearedRunway;
  if (!r) return false;
  const { along, cross } = runwayFrame(p.pos, r);
  return (
    along < 0 &&
    remainingPathNm(p) < RULES.approachZoneNm &&
    Math.abs(angleDiff(p.heading, r.heading)) <= RULES.establishedMaxOffDeg &&
    cross <= RULES.establishedMaxCrossTrackNm
  );
}

/**
 * Two planes established on final approaches to *parallel* runways (different
 * runway, same landing direction) may be closer than normal separation. Head-on
 * traffic to opposite ends of a runway, or planes still manoeuvring, may not.
 */
function onParallelFinals(a: Plane, b: Plane): boolean {
  const ra = a.clearedRunway;
  const rb = b.clearedRunway;
  if (!ra || !rb || ra.id === rb.id) return false;
  if (Math.abs(angleDiff(ra.heading, rb.heading)) > 1) return false;
  return establishedOnFinal(a) && establishedOnFinal(b);
}
/**
 * Position history for radar trails: one sample every 2 s, kept for 2 minutes.
 * At sector zoom on a phone (~6.5 pt/nm) five trail dots need ~3.9 nm of path,
 * which a plane at approach speed (140 kt) covers in ~100 s.
 */
const TRAIL_EVERY_SEC = 2;
export const TRAIL_LENGTH = 60;
const MAX_EVENTS = 20;

export class Sim {
  readonly airport: Airport;
  time = 0;
  planes: Plane[] = [];
  stats: SimStats = { landed: 0, exited: 0, goArounds: 0, separationViolations: 0 };
  events: SimEvent[] = [];
  /** Pairs in conflict after the last step, for drawing the pair line and distance tag. */
  conflicts: Conflict[] = [];

  private pending: TrafficEntry[];
  private conflictPairs = new Set<string>();
  private trailTimer = 0;
  private nextId = 1;
  private nextEventSeq = 1;

  constructor(airport: Airport, traffic: TrafficEntry[]) {
    this.airport = airport;
    this.pending = [...traffic].sort((a, b) => a.time - b.time);
  }

  get remainingTraffic() {
    return this.pending.length;
  }

  plane(id: string) {
    return this.planes.find((p) => p.id === id);
  }

  /** Advance the simulation by `dtSec` seconds of sim time. */
  step(dtSec: number) {
    let left = dtSec;
    while (left > 1e-9) {
      const dt = Math.min(MAX_SUBSTEP_SEC, left);
      this.substep(dt);
      left -= dt;
    }
  }

  // ---- Player commands -------------------------------------------------

  setHeading(id: string, heading: number) {
    const p = this.plane(id);
    if (!p) return;
    this.cancelApproach(p);
    p.target.heading = normDeg(Math.round(heading));
    p.route = [];
  }

  /**
   * A new altitude cancels a landing clearance (the approach descends on its
   * own, so an altitude command means the player wants it off the approach).
   * The drawn path is kept as an ordinary route.
   */
  setAltitude(id: string, altitude: number) {
    const p = this.plane(id);
    if (!p) return;
    const rwy = p.clearedRunway;
    if (rwy) {
      this.cancelApproach(p);
      this.log('cancelled', `${p.callsign} clearance to ${rwy.id} cancelled`, [p.callsign], rwy.id);
    }
    p.target.altitude = clamp(altitude, PERF.minAltitude, PERF.maxAltitude);
  }

  setSpeed(id: string, speed: number) {
    const p = this.plane(id);
    if (!p) return;
    p.target.speed = clamp(speed, PERF.minSpeed, PERF.maxSpeed);
    if (p.approachFrom) p.approachFrom.speed = p.target.speed;
  }

  /**
   * Assigns a drawn path. If the path ends near a runway threshold the plane
   * is cleared to land there and will descend on the glideslope by itself.
   */
  setRoute(id: string, points: Vec2[]) {
    const p = this.plane(id);
    if (!p || points.length === 0) return;

    const route: Vec2[] = [];
    let last = p.pos;
    for (const pt of points) {
      if (dist(last, pt) >= RULES.minRouteSpacingNm) {
        route.push(pt);
        last = pt;
      }
    }
    if (route.length === 0) return;

    const end = route[route.length - 1];
    const runway = this.pickRunwayEnd(end, this.finalLegHeading(p.pos, route));
    if (runway) {
      // The finger may have lifted on or past the runway: drop anything beyond
      // the threshold so the threshold is the path's real final point.
      while (route.length && runwayFrame(route[route.length - 1], runway).along > -RULES.waypointCaptureNm) route.pop();
      route.push(runway.threshold);
      if (!p.clearedRunway) p.approachFrom = { altitude: p.target.altitude, speed: p.target.speed };
      p.clearedRunway = runway;
      this.log('cleared', `${p.callsign} cleared to land ${runway.id}`, [p.callsign], runway.id);
    } else {
      this.cancelApproach(p);
    }
    p.route = route;
  }

  /**
   * Heading of the last stretch of a path (about RULES.finalLegLookbackNm), used
   * to tell which way the player means to land. Null if the path is too short to say.
   */
  private finalLegHeading(start: Vec2, route: Vec2[]): number | null {
    const end = route[route.length - 1];
    if (route.length === 1) return headingTo(start, end);
    let k = route.length - 1;
    while (k > 0 && dist(route[k], end) < RULES.finalLegLookbackNm) k--;
    if (k === route.length - 1) return null;
    return headingTo(route[k], end);
  }

  /** Drops a landing clearance and puts back the altitude/speed the approach overrode. */
  private cancelApproach(p: Plane) {
    if (p.approachFrom) {
      p.target.altitude = p.approachFrom.altitude;
      p.target.speed = p.approachFrom.speed;
    }
    p.approachFrom = null;
    p.clearedRunway = null;
  }

  // ---- Internals -------------------------------------------------------

  private substep(dt: number) {
    this.time += dt;
    this.spawnDue();

    for (const p of this.planes) {
      this.navigate(p);
      this.fly(p, dt);
    }

    this.trailTimer += dt;
    if (this.trailTimer >= TRAIL_EVERY_SEC) {
      this.trailTimer = 0;
      for (const p of this.planes) {
        p.trail.push({ ...p.pos });
        if (p.trail.length > TRAIL_LENGTH) p.trail.shift();
      }
    }

    this.checkBounds();
    if (this.planes.some((p) => p.status !== 'active')) {
      this.planes = this.planes.filter((p) => p.status === 'active');
    }
    this.checkSeparation();
  }

  private spawnDue() {
    while (this.pending.length && this.pending[0].time <= this.time) {
      const t = this.pending.shift()!;
      const entry = this.airport.entries.find((e) => e.name === t.entry);
      if (!entry) {
        // Bad traffic data (e.g. a schedule file naming an entry this airport doesn't have).
        this.log('info', `${t.callsign} skipped: no entry point "${t.entry}" at ${this.airport.icao}`, [t.callsign]);
        continue;
      }
      this.planes.push({
        id: String(this.nextId++),
        callsign: t.callsign,
        aircraftType: t.aircraftType,
        kind: t.kind,
        pos: { ...entry.pos },
        heading: entry.heading,
        altitude: t.altitude,
        speed: t.speed,
        target: { heading: entry.heading, altitude: t.altitude, speed: t.speed },
        route: [],
        clearedRunway: null,
        approachFrom: null,
        goAroundAt: null,
        status: 'active',
        conflict: false,
        trail: [],
      });
      this.log('entered', `${t.callsign} entering from ${entry.name}`, [t.callsign]);
    }
  }

  /** Sets targets from the route / landing clearance, and resolves touchdowns. */
  private navigate(p: Plane) {
    const rwy = p.clearedRunway;
    if (rwy) {
      // Descend and slow based on how much of the drawn path is left, not the
      // straight-line distance: a long curving path shouldn't dive early.
      const left = remainingPathNm(p);
      p.target.altitude = Math.min(p.target.altitude, Math.max(0, Math.round(left * RULES.glideFtPerNm)));
      if (left < RULES.approachZoneNm) p.target.speed = Math.min(p.target.speed, PERF.approachSpeed);

      // Only the final leg can touch down; overflying the threshold earlier in the path doesn't count.
      const onFinal = p.route.length === 1;
      if (onFinal && dist(p.pos, rwy.threshold) <= RULES.touchdownRadiusNm) {
        const aligned = Math.abs(angleDiff(p.heading, rwy.heading)) <= RULES.touchdownMaxAngleDeg;
        if (aligned && p.altitude <= RULES.touchdownMaxAltFt) {
          p.status = 'landed';
          this.stats.landed++;
          this.log('landed', `${p.callsign} landed ${rwy.id}`, [p.callsign], rwy.id);
        } else {
          this.goAround(p, aligned ? 'too high' : 'not aligned');
        }
        return;
      }
    }

    // Pure-pursuit path following: a waypoint inside the plane's turn radius
    // can't be hit exactly, so treat it as reached and aim at the next one.
    // Without this, planes orbit points they can't turn tightly enough to reach.
    const capture = Math.max(RULES.waypointCaptureNm, turnRadiusNm(p.speed));
    while (p.route.length) {
      const wp = p.route[0];
      const d = dist(p.pos, wp);
      const off = Math.abs(angleDiff(p.heading, headingTo(p.pos, wp)));
      const isThreshold = p.route.length === 1 && rwy;
      if (isThreshold) {
        // Close to the runway but pointing well away from it: can't make it.
        if (d < RULES.finalCheckNm && off > RULES.finalMaxOffDeg) {
          this.goAround(p, 'not lined up');
          return;
        }
        break;
      }
      const behind = d < RULES.waypointBehindNm && off > RULES.waypointBehindDeg;
      if (d < capture || behind) p.route.shift();
      else break;
    }
    if (p.route.length) p.target.heading = Math.round(headingTo(p.pos, p.route[0]));
  }

  private goAround(p: Plane, reason: string) {
    const rwy = p.clearedRunway;
    p.clearedRunway = null;
    p.approachFrom = null;
    p.route = [];
    p.target.heading = rwy ? rwy.heading : p.heading;
    p.target.altitude = RULES.goAroundAltitude;
    p.target.speed = PERF.goAroundSpeed;
    p.goAroundAt = this.time;
    this.stats.goArounds++;
    this.log('goAround', `${p.callsign} going around (${reason})`, [p.callsign], rwy?.id, reason);
  }

  private fly(p: Plane, dt: number) {
    const turn = angleDiff(p.heading, p.target.heading);
    const maxTurn = PERF.turnRateDegPerSec * dt;
    p.heading = normDeg(p.heading + clamp(turn, -maxTurn, maxTurn));
    p.altitude = approach(p.altitude, p.target.altitude, PERF.climbFtPerSec * dt);
    p.speed = approach(p.speed, p.target.speed, PERF.accelKtPerSec * dt);
    p.pos = add(p.pos, dirOf(p.heading), (p.speed / 3600) * dt);
  }

  private checkBounds() {
    const lim = this.airport.rangeNm + 2;
    for (const p of this.planes) {
      if (Math.abs(p.pos.x) > lim || Math.abs(p.pos.y) > lim) {
        p.status = 'exited';
        this.stats.exited++;
        this.log('exited', `${p.callsign} left the sector`, [p.callsign]);
      }
    }
  }

  private checkSeparation() {
    const now = new Set<string>();
    const list: Conflict[] = [];
    for (const p of this.planes) p.conflict = false;
    for (let i = 0; i < this.planes.length; i++) {
      for (let j = i + 1; j < this.planes.length; j++) {
        const a = this.planes[i];
        const b = this.planes[j];
        if (onParallelFinals(a, b)) continue;
        const d = dist(a.pos, b.pos);
        const v = Math.abs(a.altitude - b.altitude);
        if (d < RULES.separationNm && v < RULES.separationFt) {
          a.conflict = b.conflict = true;
          list.push({ a: a.id, b: b.id, distNm: d, altFt: v });
          const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          now.add(key);
          if (!this.conflictPairs.has(key)) {
            this.stats.separationViolations++;
            this.log('conflict', `Separation lost: ${a.callsign} / ${b.callsign}`, [a.callsign, b.callsign]);
          }
        }
      }
    }
    this.conflictPairs = now;
    this.conflicts = list;
  }

  /**
   * Which runway end (if any) a path ending at `pt` is aiming for. Parallel
   * runways' thresholds can be under 1 nm apart (LHBP: 13L to 31L is
   * 0.94 nm), so rather than "nearest threshold" we
   * pick the end whose extended centreline the path is closest to, ignoring
   * ends whose landing direction disagrees with the path's final leg.
   */
  private pickRunwayEnd(pt: Vec2, finalLeg: number | null): RunwayEnd | null {
    let best: RunwayEnd | null = null;
    let bestScore = Infinity;
    for (const r of this.airport.runways) {
      for (const e of r.ends) {
        if (dist(pt, e.threshold) > RULES.runwaySnapNm) continue;
        if (finalLeg !== null && Math.abs(angleDiff(finalLeg, e.heading)) > 90) continue;
        const { along, cross } = runwayFrame(pt, e);
        const score = cross + Math.max(0, along) * 0.5;
        if (score < bestScore) {
          bestScore = score;
          best = e;
        }
      }
    }
    return best;
  }

  private log(kind: SimEventKind, text: string, callsigns: string[], runway?: string, reason?: string) {
    this.events.push({ seq: this.nextEventSeq++, time: this.time, kind, text, callsigns, runway, reason });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

}
