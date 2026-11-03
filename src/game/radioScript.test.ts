import { describe, expect, it } from 'vitest';
import manifest from '../../scripts/voices/manifest.json';
import { AIRLINE_CALLSIGNS } from '../engine/data/airlines';
import type { PlaneNow } from './radio';
import { altitudePieces, callsignPieces, compose, instructionsFor, PHRASINGS, pilotFor, RadioMemory, runwayPieces, type Instruction } from './radioScript';
import type { VoiceClips } from './voiceTypes';

const wzz: PlaneNow = { callsign: 'WZZ9003', heading: 80, altitude: 6000, speed: 230 };

/** Every piece the manifest renders, by id (as generate.py names them). */
const manifestPieces = new Set([
  ...Object.keys(manifest.lists.digits).map((d) => `d${d}`),
  ...Object.keys(manifest.lists.letters).map((l) => `l${l}`),
  ...Object.keys(manifest.lists.words).map((w) => `w_${w}`),
  ...Object.keys(manifest.airlines).filter((k) => k !== 'about').map((a) => `a_${a}`),
  ...Object.keys(manifest.stems).filter((k) => k !== 'about').map((s) => `s_${s}`),
]);

/** A fake clip set: every manifest piece, two takes of each kind, 100 ms long. */
const fakeClips = (roles: Record<string, 'controller' | 'pilot'>): VoiceClips =>
  Object.fromEntries(
    Object.entries(roles).map(([id, role]) => [
      id,
      {
        role,
        clips: Object.fromEntries(
          [...manifestPieces].map((p) => [p, (p.startsWith('s_') || p.startsWith('a_') ? ['t0', 't1'] : ['m0', 'm1', 'f0', 'f1']).map((take) => ({ take, ms: 100, file: 0 }))]),
        ),
      },
    ]),
  );
const clips = fakeClips({ ctl: 'controller', p1: 'pilot', p2: 'pilot' });
const seq = (seed = 1) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};
const pieces = (segs: { piece: string }[]) => segs.map((s) => s.piece);

describe('manifest', () => {
  it('has every piece any phrasing can say', () => {
    for (const role of ['controller', 'pilot'] as const) {
      for (const phrases of Object.values(PHRASINGS[role])) {
        for (const phrase of phrases) {
          for (const side of ['left', 'right']) {
            for (const p of (phrase as readonly string[]).filter((x) => !x.startsWith('{') || x.includes('{side}'))) expect(manifestPieces, p).toContain(p.replace('{side}', side));
          }
        }
      }
    }
    for (const ft of [2000, 3500, 10000, 12000, 24000]) for (const p of altitudePieces(ft)) expect(manifestPieces).toContain(p);
    for (const p of runwayPieces('31C')) expect(manifestPieces).toContain(p);
    for (const p of ['w_knots', 'w_left', 'w_right']) expect(manifestPieces).toContain(p);
  });

  it('has a clip for every airline, under the same spoken name', () => {
    for (const [code, spoken] of Object.entries(AIRLINE_CALLSIGNS)) expect((manifest.airlines as Record<string, string>)[code], code).toBe(spoken);
  });
});

describe('spoken numbers as pieces', () => {
  it('altitudes in feet, and flight levels above 10,000 ft', () => {
    expect(altitudePieces(4000)).toEqual(['d4', 'w_thousand', 'w_feet']);
    expect(altitudePieces(3500)).toEqual(['d3', 'w_thousand', 'd5', 'w_hundred', 'w_feet']);
    expect(altitudePieces(10000)).toEqual(['d1', 'd0', 'w_thousand', 'w_feet']);
    expect(altitudePieces(12000)).toEqual(['s_flight_level', 'd1', 'd2', 'd0']);
  });

  it('runways and callsigns', () => {
    expect(runwayPieces('13L')).toEqual(['d1', 'd3', 'w_left']);
    expect(runwayPieces('9')).toEqual(['d0', 'd9']);
    expect(callsignPieces('RYR41HB', () => true)).toEqual(['a_RYR', 'd4', 'd1', 'lH', 'lB']);
    expect(callsignPieces('FIX1', (p) => p !== 'a_FIX')).toEqual(['lF', 'lI', 'lX', 'd1']);
  });
});

describe('instructionsFor', () => {
  it('turn side from the current heading, climb or descend, flight levels, speed and landing, in order', () => {
    const ins = instructionsFor({ land: '13L', speed: 180, altitude: 12000, heading: 40 }, wzz);
    expect(ins.map((i) => [i.kind, i.side])).toEqual([
      ['turn', 'left'],
      ['climbFL', undefined],
      ['reduce', undefined],
      ['land', undefined],
    ]);
    expect(instructionsFor({ altitude: 4000 }, wzz)[0].kind).toBe('descend');
    expect(instructionsFor({ heading: 81 }, wzz)[0].kind).toBe('fly');
  });
});

describe('compose', () => {
  const descend: Instruction[] = instructionsFor({ altitude: 4000 }, wzz);

  it('controller: callsign first, then the instruction; the last digit or word falls', () => {
    const segs = compose({ role: 'controller', voice: 'ctl', clips, callsign: 'WZZ9003', instructions: descend, memory: new RadioMemory(), rng: seq(), planeId: '1' });
    const ps = pieces(segs);
    expect(ps.slice(0, 5)).toEqual(['a_WZZ', 'd9', 'd0', 'd0', 'd3']);
    expect(ps.slice(-3)).toEqual(['d4', 'w_thousand', 'w_feet']);
    expect(['s_descend_to_altitude', 's_descend_altitude', 's_descend']).toContain(ps[5]);
    expect(segs[segs.length - 1].take).toMatch(/^f/);
    expect(segs[3].take).toMatch(/^m/); // inside the callsign
    expect(segs[0].gapMs).toBe(0);
    expect(segs[5].gapMs).toBeGreaterThan(100); // a pause after the callsign
  });

  it('pilot: the readback first, the callsign last, falling at its end', () => {
    const segs = compose({ role: 'pilot', voice: 'p1', clips, callsign: 'WZZ9003', instructions: descend, memory: new RadioMemory(), rng: seq(), planeId: '1' });
    const ps = pieces(segs);
    expect(ps.slice(-5)).toEqual(['a_WZZ', 'd9', 'd0', 'd0', 'd3']);
    expect(segs[segs.length - 1].take).toMatch(/^f/);
    expect(['s_descend', 's_down_to', 's_descending']).toContain(ps[0]);
  });

  it('never the same phrasing twice in a row for a plane, nor the same take of a piece', () => {
    const memory = new RadioMemory();
    const rng = seq(7);
    let lastStem = '';
    let lastTake = '';
    for (let i = 0; i < 20; i++) {
      const segs = compose({ role: 'pilot', voice: 'p1', clips, callsign: 'WZZ9003', instructions: descend, memory, rng, planeId: '1' });
      expect(segs[0].piece).not.toBe(lastStem);
      const four = segs.find((s) => s.piece === 'd4')!;
      expect(four.take).not.toBe(lastTake);
      lastStem = segs[0].piece;
      lastTake = four.take;
    }
  });

  it('several instructions get a pause between them', () => {
    const segs = compose({ role: 'controller', voice: 'ctl', clips, callsign: 'WZZ9003', instructions: instructionsFor({ heading: 40, altitude: 4000 }, wzz), memory: new RadioMemory(), rng: seq(), planeId: '1' });
    const second = segs.findIndex((s) => s.piece.startsWith('s_descend'));
    expect(segs[second].gapMs).toBeGreaterThan(100);
  });
});

describe('pilotFor', () => {
  it('gives a plane the same pilot every time, and spreads planes over the pilots', () => {
    expect(pilotFor('WZZ9003', clips)).toBe(pilotFor('WZZ9003', clips));
    const used = new Set(['WZZ9003', 'RYR41HB', 'BAW99', 'LOT537', 'DLH1340', 'EZY512'].map((c) => pilotFor(c, clips)));
    expect(used).toEqual(new Set(['p1', 'p2']));
  });
});
