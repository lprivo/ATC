// World units: positions in nautical miles (x = east, y = north) relative to the
// airport reference point. Headings in degrees true, 0 = north, clockwise.
// Altitude in feet, speed in knots, time in seconds of sim time.

export interface Vec2 {
  x: number;
  y: number;
}

export interface RunwayEnd {
  /** e.g. "31R" — the end you land on, named after the landing heading. */
  id: string;
  /** Touchdown point. */
  threshold: Vec2;
  /** Landing heading. */
  heading: number;
}

export interface Runway {
  name: string; // e.g. "13L/31R"
  ends: [RunwayEnd, RunwayEnd];
}

export interface Fix {
  name: string;
  pos: Vec2;
}

export interface EntryPoint {
  name: string;
  pos: Vec2;
  /** Initial heading of traffic entering here. */
  heading: number;
}

export interface Airport {
  icao: string;
  name: string;
  /** Half-width of the playable square, in nm. */
  rangeNm: number;
  runways: Runway[];
  fixes: Fix[];
  entries: EntryPoint[];
  /** ICAO airline codes used by the random traffic generator. */
  airlines: string[];
}

/**
 * One scheduled flight. The random generator and (later) the real-schedule
 * replay both produce a list of these, so the sim doesn't care where traffic
 * comes from.
 */
export interface TrafficEntry {
  /** Sim time (s) at which the flight appears. */
  time: number;
  callsign: string;
  aircraftType: string;
  kind: 'arrival'; // 'departure' later
  /** EntryPoint name. */
  entry: string;
  altitude: number;
  speed: number;
}

export type PlaneStatus = 'active' | 'landed' | 'exited';

export interface Plane {
  id: string;
  callsign: string;
  aircraftType: string;
  kind: 'arrival';
  pos: Vec2;
  heading: number;
  altitude: number;
  speed: number;
  target: { heading: number; altitude: number; speed: number };
  /** Player-drawn path, consumed as the plane flies it. */
  route: Vec2[];
  /** Runway end the plane is cleared to land on (set when a route ends at a threshold). */
  clearedRunway: RunwayEnd | null;
  /** Altitude/speed targets from before the approach, restored if the clearance is cancelled. */
  approachFrom: { altitude: number; speed: number } | null;
  status: PlaneStatus;
  conflict: boolean;
  trail: Vec2[];
}

export interface SimStats {
  landed: number;
  exited: number;
  goArounds: number;
  separationViolations: number;
}

export interface SimEvent {
  time: number;
  text: string;
}
