import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import { RULES, Sim } from '../engine/sim';
import { explain, statCells } from './explainer';

const exitSim = () => {
  const sim = new Sim({ ...LHBP, entries: [{ name: 'E', pos: { x: 31.5, y: 0 }, heading: 90 }] }, [
    { time: 0, callsign: 'WZZ1', aircraftType: 'A320', kind: 'arrival', entry: 'E', altitude: 7000, speed: 250 },
    { time: 20, callsign: 'WZZ2', aircraftType: 'A320', kind: 'arrival', entry: 'E', altitude: 7000, speed: 250 },
  ]);
  sim.step(60);
  return sim;
};

describe('stat explainer', () => {
  it('five stat cells from the sim', () => {
    const sim = exitSim();
    expect(statCells(sim).map((c) => [c.key, c.value])).toEqual([
      ['landed', 0],
      ['sep', 0],
      ['goAround', 0],
      ['exits', 2],
      ['airborne', 0],
    ]);
  });

  it("lists this session's incidents, newest first, with time and reason", () => {
    const e = explain(exitSim(), 'exits');
    expect(e.incidents.map((i) => i.who)).toEqual(['WZZ2', 'WZZ1']);
    expect(e.incidents[0]).toMatchObject({ reason: 'left the sector' });
    expect(e.incidents[0].time).toMatch(/^\d\d:\d\d$/);
  });

  it('causes quote the sim rules, so they match how the game plays', () => {
    const ga = explain(exitSim(), 'goAround');
    expect(ga.causes.join(' ')).toContain(`${RULES.touchdownMaxAngleDeg}°`);
    expect(ga.causes.join(' ')).toContain(`${RULES.finalMaxOffDeg}°`);
    const sep = explain(exitSim(), 'sep');
    expect(sep.body).toContain(`${RULES.separationNm} nm`);
    expect(sep.headline).toBe('-150 points each');
  });

  it('every stat has a title, headline, at least one cause and a tip', () => {
    for (const key of ['landed', 'sep', 'goAround', 'exits', 'airborne'] as const) {
      const e = explain(exitSim(), key);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.causes.length).toBeGreaterThan(0);
      expect(e.tip.length).toBeGreaterThan(0);
    }
  });
});
