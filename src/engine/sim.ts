import { add, angleDiff, approach, clamp, dirOf, dist, headingTo, normDeg } from './math';
import type { Airport, Plane, RunwayEnd, SimEvent, SimStats, TrafficEntry, Vec2 } from './types';

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
};

/** Radius of a standard-rate turn at the given speed. */
export const turnRadiusNm = (speedKt: number) =>
  speedKt / 3600 / ((PERF.turnRateDegPerSec * Math.PI) / 180);

const MAX_SUBSTEP_SEC = 0.25;
const TRAIL_EVERY_SEC = 4;
const TRAIL_LENGTH = 8;
const MAX_EVENTS = 20;

export class Sim {
  readonly airport: Airport;
  time = 0;
  planes: Plane[] = [];
  stats: SimStats = { landed: 0, exited: 0, goArounds: 0, separationViolations: 0 };
  events: SimEvent[] = [];

  private pending: TrafficEntry[];
  private conflictPairs = new Set<string>();
  private trailTimer = 0;
  private nextId = 1;

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
    p.target.heading = normDeg(Math.round(heading));
    p.route = [];
    p.clearedRunway = null;
  }

  setAltitude(id: string, altitude: number) {
    const p = this.plane(id);
    if (!p) return;
    p.target.altitude = clamp(altitude, PERF.minAltitude, PERF.maxAltitude);
  }

  setSpeed(id: string, speed: number) {
    const p = this.plane(id);
    if (!p) return;
    p.target.speed = clamp(speed, PERF.minSpeed, PERF.maxSpeed);
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
    // Direction of the last ~1.5 nm of the drawn path, to tell which way the player means to land.
    let k = route.length - 1;
    while (k > 0 && dist(route[k], end) < 1.5) k--;
    const finalLeg = k < route.length - 1 || route.length === 1 ? headingTo(route.length === 1 ? p.pos : route[k], end) : null;
    const runway = this.pickRunwayEnd(end, finalLeg);
    if (runway) {
      route[route.length - 1] = runway.threshold;
      p.clearedRunway = runway;
      this.log(`${p.callsign} cleared to land ${runway.id}`);
    } else {
      p.clearedRunway = null;
    }
    p.route = route;
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
    this.planes = this.planes.filter((p) => p.status === 'active');
    this.checkSeparation();
  }

  private spawnDue() {
    while (this.pending.length && this.pending[0].time <= this.time) {
      const t = this.pending.shift()!;
      const entry = this.airport.entries.find((e) => e.name === t.entry) ?? this.airport.entries[0];
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
        status: 'active',
        conflict: false,
        trail: [],
      });
      this.log(`${t.callsign} entering from ${entry.name}`);
    }
  }

  /** Sets targets from the route / landing clearance, and resolves touchdowns. */
  private navigate(p: Plane) {
    const rwy = p.clearedRunway;
    if (rwy) {
      const d = dist(p.pos, rwy.threshold);
      p.target.altitude = Math.min(p.target.altitude, Math.max(0, Math.round(d * RULES.glideFtPerNm)));
      if (d < 10) p.target.speed = Math.min(p.target.speed, PERF.approachSpeed);

      if (d <= RULES.touchdownRadiusNm) {
        const aligned = Math.abs(angleDiff(p.heading, rwy.heading)) <= RULES.touchdownMaxAngleDeg;
        if (aligned && p.altitude <= RULES.touchdownMaxAltFt) {
          p.status = 'landed';
          this.stats.landed++;
          this.log(`${p.callsign} landed ${rwy.id}`);
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
      if (d < capture || (d < 1.5 && off > 100)) p.route.shift();
      else break;
    }
    if (p.route.length) p.target.heading = Math.round(headingTo(p.pos, p.route[0]));
  }

  private goAround(p: Plane, reason: string) {
    const rwy = p.clearedRunway;
    p.clearedRunway = null;
    p.route = [];
    p.target.heading = rwy ? rwy.heading : p.heading;
    p.target.altitude = RULES.goAroundAltitude;
    p.target.speed = 200;
    this.stats.goArounds++;
    this.log(`${p.callsign} going around (${reason})`);
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
        this.log(`${p.callsign} left the sector`);
      }
    }
  }

  private checkSeparation() {
    const now = new Set<string>();
    for (const p of this.planes) p.conflict = false;
    for (let i = 0; i < this.planes.length; i++) {
      for (let j = i + 1; j < this.planes.length; j++) {
        const a = this.planes[i];
        const b = this.planes[j];
        // Parallel approaches to different runways are allowed to be close.
        if (a.clearedRunway && b.clearedRunway && a.clearedRunway.id !== b.clearedRunway.id) continue;
        if (
          dist(a.pos, b.pos) < RULES.separationNm &&
          Math.abs(a.altitude - b.altitude) < RULES.separationFt
        ) {
          a.conflict = b.conflict = true;
          const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          now.add(key);
          if (!this.conflictPairs.has(key)) {
            this.stats.separationViolations++;
            this.log(`Separation lost: ${a.callsign} / ${b.callsign}`);
          }
        }
      }
    }
    this.conflictPairs = now;
  }

  /**
   * Which runway end (if any) a path ending at `pt` is aiming for. Parallel
   * runways have thresholds ~1 nm apart, so rather than "nearest threshold" we
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
        const d = dirOf(e.heading);
        const v = { x: pt.x - e.threshold.x, y: pt.y - e.threshold.y };
        const crossTrack = Math.abs(v.x * d.y - v.y * d.x);
        const along = v.x * d.x + v.y * d.y; // >0 means past the threshold
        const score = crossTrack + Math.max(0, along) * 0.5;
        if (score < bestScore) {
          bestScore = score;
          best = e;
        }
      }
    }
    return best;
  }

  private log(text: string) {
    this.events.push({ time: this.time, text });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }
}
