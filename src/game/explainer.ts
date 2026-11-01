// Content for the pause menu's stat explainer (design S5b). Pure: the text is
// built from the sim's actual rules, so it can't drift from how the game plays.
import { SCORING } from '../engine/scoring';
import { RULES, type Sim } from '../engine/sim';
import type { SimEvent, SimEventKind } from '../engine/types';
import { clock } from '../ui/format';

export type StatKey = 'landed' | 'sep' | 'goAround' | 'exits' | 'airborne';

export interface StatCell {
  key: StatKey;
  label: string;
  value: number;
}

/** The five cells of the pause menu's stat grid. */
export const statCells = (sim: Sim): StatCell[] => [
  { key: 'landed', label: 'Landed', value: sim.stats.landed },
  { key: 'sep', label: 'Sep. lost', value: sim.stats.separationViolations },
  { key: 'goAround', label: 'Go-around', value: sim.stats.goArounds },
  { key: 'exits', label: 'Exits', value: sim.stats.exited },
  { key: 'airborne', label: 'Airborne', value: sim.planes.length },
];

export type ExplainTone = 'good' | 'danger' | 'dim';

export interface Explainer {
  /** Short tag shown as a chip, and its tone. */
  chip: string;
  tone: ExplainTone;
  /** Caps title, e.g. "GO-AROUND". */
  title: string;
  headline: string;
  body: string;
  /** "WHY IT HAPPENS": numbered causes. */
  causes: string[];
  /** "THIS SESSION · n": the player's own incidents, newest first. */
  incidents: { who: string; time: string; reason: string }[];
  tip: string;
}

const KIND: Partial<Record<StatKey, SimEventKind>> = { landed: 'landed', sep: 'conflict', goAround: 'goAround', exits: 'exited' };
const pts = (n: number) => (n > 0 ? `+${n}` : String(n));

function incidentsOf(sim: Sim, key: StatKey) {
  const kind = KIND[key];
  if (!kind) return [];
  return sim.incidents
    .filter((e: SimEvent) => e.kind === kind)
    .slice()
    .reverse()
    .map((e) => ({ who: e.callsigns.join(' · '), time: clock(e.time), reason: reasonOf(e) }));
}

function reasonOf(e: SimEvent) {
  switch (e.kind) {
    case 'landed':
      return e.runway ? `runway ${e.runway}` : 'landed';
    case 'goAround':
      return e.reason ?? 'go-around';
    case 'conflict':
      return 'under 3 nm and 1,000 ft';
    case 'exited':
      return 'left the sector';
    default:
      return '';
  }
}

/** The explainer sheet for one stat. */
export function explain(sim: Sim, key: StatKey): Explainer {
  const incidents = incidentsOf(sim, key);
  switch (key) {
    case 'landed':
      return {
        chip: '✓',
        tone: 'good',
        title: 'LANDED',
        headline: `${pts(SCORING.landed)} points each`,
        body: 'A plane lands when it reaches the threshold of the runway it was cleared to, low enough and lined up. Clear it by drawing its path onto a runway.',
        causes: [
          `It reached the threshold below ${RULES.touchdownMaxAltFt.toLocaleString('en-GB')} ft.`,
          `It was within ${RULES.touchdownMaxAngleDeg}° of the runway heading at touchdown.`,
        ],
        incidents,
        tip: 'Ending the path on a long, straight final gives the plane time to descend and line up.',
      };
    case 'sep':
      return {
        chip: '!',
        tone: 'danger',
        title: 'SEPARATION LOST',
        headline: `${pts(SCORING.separationLoss)} points each`,
        body: `Every pair of planes must stay ${RULES.separationNm} nm apart sideways or ${RULES.separationFt.toLocaleString('en-GB')} ft apart vertically. Each new encounter that breaks both counts once.`,
        causes: [
          `Two planes were closer than ${RULES.separationNm} nm and less than ${RULES.separationFt.toLocaleString('en-GB')} ft apart at the same time.`,
          'Planes established on final to the two parallel runways are allowed closer.',
        ],
        incidents,
        tip: 'Give converging planes different altitudes early: 1,000 ft is enough, and a climb or descent takes time.',
      };
    case 'goAround':
      return {
        chip: 'GA',
        tone: 'danger',
        title: 'GO-AROUND',
        headline: `${pts(SCORING.goAround)} points each`,
        body: 'A cleared plane that can’t land safely climbs away to 3,000 ft and flies the runway heading, waiting for a new path.',
        causes: [
          `Too high: above ${RULES.touchdownMaxAltFt.toLocaleString('en-GB')} ft at the threshold (it descends about ${RULES.glideFtPerNm} ft per nm on final).`,
          `Not lined up: more than ${RULES.touchdownMaxAngleDeg}° off the runway heading at touchdown.`,
          `Not lined up on short final: within ${RULES.finalCheckNm} nm of the threshold and pointing more than ${RULES.finalMaxOffDeg}° away from it.`,
        ],
        incidents,
        tip: 'Start the final at least 3 nm out, straight down the centreline, and lower the plane before you clear it.',
      };
    case 'exits':
      return {
        chip: 'EXIT',
        tone: 'dim',
        title: 'EXITS',
        headline: `${pts(SCORING.exit)} points each`,
        body: 'A plane that flies off the edge of the sector is lost to you.',
        causes: [`It went more than ${sim.airport.rangeNm + 2} nm from the airport, east-west or north-south.`],
        incidents,
        tip: 'Planes keep their heading until you change it: turn arrivals in before they reach the edge.',
      };
    case 'airborne':
      return {
        chip: String(sim.planes.length),
        tone: 'dim',
        title: 'AIRBORNE',
        headline: `${sim.planes.length} in your sector now`,
        body: 'Planes you are controlling right now. More arrive throughout the session.',
        causes: ['Arrivals enter at the sector edge and fly their heading until you give them a path or a new heading.'],
        incidents: [],
        tip: 'With many planes, labels switch to one line; tap a plane to see its full label.',
      };
  }
}
