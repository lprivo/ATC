// Session options (design S3b) and what the free version allows. Pure.
import { CATALOGUE, type CatalogueAirport, type Region } from '../engine/data/airports';

export type Traffic = 'light' | 'steady' | 'busy';
export type SessionLength = 15 | 30 | 60 | 'endless';
export type Entitlement = 'free' | 'full';

/** Arrivals per hour for each traffic level (design: ~6, ~14, ~24). */
export const TRAFFIC_PER_HOUR: Readonly<Record<Traffic, number>> = { light: 6, steady: 14, busy: 24 };
export const TRAFFIC_LABEL: Readonly<Record<Traffic, string>> = { light: 'Light', steady: 'Steady', busy: 'Busy' };
export const LENGTHS: readonly SessionLength[] = [15, 30, 60, 'endless'];

export interface Session {
  icao: string;
  traffic: Traffic;
  length: SessionLength;
}

/** The free version: one airport, fixed at Steady and 30 minutes. */
export const FREE_SESSION: Session = { icao: 'LHBP', traffic: 'steady', length: 30 };

/** Average gap between arrivals for a traffic level, in sim seconds. */
export const meanIntervalSec = (t: Traffic) => 3600 / TRAFFIC_PER_HOUR[t];

/** Session length in sim seconds, or null for endless. */
export const lengthSec = (l: SessionLength) => (l === 'endless' ? null : l * 60);

/** How much traffic to generate: the session length, or two hours for endless (regenerated later if needed). */
export const trafficHorizonSec = (l: SessionLength) => lengthSec(l) ?? 2 * 3600;

export const lengthLabel = (l: SessionLength) => (l === 'endless' ? 'Endless' : `${l} min`);
/** "STEADY · 30 MIN" */
export const sessionLabel = (s: Session) => `${TRAFFIC_LABEL[s.traffic].toUpperCase()} · ${lengthLabel(s.length).toUpperCase()}`;

/** Whether an option is available with this entitlement (free: only the free airport, Steady, 30 min). */
export const allows = {
  airport: (e: Entitlement, ap: CatalogueAirport) => ap.playable && (e === 'full' || ap.free),
  traffic: (e: Entitlement, t: Traffic) => e === 'full' || t === FREE_SESSION.traffic,
  length: (e: Entitlement, l: SessionLength) => e === 'full' || l === FREE_SESSION.length,
};

/** Search by city, airport name or ICAO, then filter by region; free airports first, then by difficulty. */
export function findAirports(query: string, region: Region | 'All', list: readonly CatalogueAirport[] = CATALOGUE) {
  const q = query.trim().toLowerCase();
  return list
    .filter((ap) => region === 'All' || ap.region === region)
    .filter((ap) => !q || [ap.icao, ap.name, ap.city].some((s) => s.toLowerCase().includes(q)))
    .slice()
    .sort((x, y) => Number(y.free) - Number(x.free) || x.difficulty - y.difficulty || x.icao.localeCompare(y.icao));
}

/** Region chips with counts, e.g. "Europe 18". */
export const regionCounts = (list: readonly CatalogueAirport[] = CATALOGUE) => {
  const regions: Region[] = ['Europe', 'Americas', 'Asia'];
  return [{ region: 'All' as const, count: list.length }, ...regions.map((r) => ({ region: r, count: list.filter((ap) => ap.region === r).length }))];
};

/** Parse route params into a session, falling back to the free defaults for anything missing or unknown. */
export function parseSession(p: { icao?: string; traffic?: string; length?: string }): Session {
  const traffic = (['light', 'steady', 'busy'] as const).find((t) => t === p.traffic) ?? FREE_SESSION.traffic;
  const n = p.length === 'endless' ? 'endless' : Number(p.length);
  const length = LENGTHS.find((l) => l === n) ?? FREE_SESSION.length;
  const icao = CATALOGUE.some((ap) => ap.icao === p.icao && ap.playable) ? p.icao! : FREE_SESSION.icao;
  return { icao, traffic, length };
}
