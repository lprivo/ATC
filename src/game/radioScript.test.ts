import { describe, expect, it } from 'vitest';
import rendered from '../../assets/voices/index.json';
import manifest from '../../scripts/voices/manifest.json';
import { AIRPORTS } from '../engine/airports';
import { AIRLINE_CALLSIGNS } from '../engine/data/airlines';
import FLIGHTS from '../engine/data/flights.json';
import { DIAL_STEP, STEP_LIMITS } from './controls';
import type { PlaneNow } from './radio';
import {
  altitudeWords,
  callsignWords,
  chunkId,
  chunksFor,
  FILLER_CHANCE,
  GAPS,
  instructionsFor,
  PHRASINGS,
  pilotFor,
  RadioMemory,
  scriptCall,
  runwayWords,
  speedWords,
  toSegments,
  VALUES,
  type Role,
} from './radioScript';
import type { VoiceClips } from './voiceTypes';

const wzz: PlaneNow = { callsign: 'WZZ9003', heading: 80, altitude: 6000, speed: 230 };
const flights = FLIGHTS as unknown as Record<string, string[]>;
const seq = (seed = 1) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};
const index = rendered as unknown as Record<string, { role: Role; clips: Record<string, string[]> }>;

describe('manifest and data', () => {
  it('value ranges match the steppers, and cover every runway end', () => {
    expect(VALUES.headingStep).toBe(DIAL_STEP.heading);
    expect(VALUES.altitude).toEqual({ ...STEP_LIMITS.altitude, step: DIAL_STEP.altitude });
    expect(VALUES.speed).toEqual({ ...STEP_LIMITS.speed, step: DIAL_STEP.speed });
    for (const a of Object.values(AIRPORTS)) for (const r of a.runways) for (const e of r.ends) expect(VALUES.runways).toContain(e.id);
  });

  it('spoken airline names match the airline data, and every airline an airport flies has flight numbers', () => {
    for (const [code, spoken] of Object.entries(AIRLINE_CALLSIGNS)) expect((manifest.airlines as Record<string, string>)[code], code).toBe(spoken);
    for (const a of Object.values(AIRPORTS)) for (const code of a.airlines) expect(flights[code]?.length, code).toBeGreaterThan(5);
  });
});

describe('spoken words', () => {
  it('as the generator builds them', () => {
    expect(callsignWords('WZZ9003')).toBe('Wizz Air niner zero zero three');
    expect(callsignWords('RYR41HB')).toBe('Ryanair four one hotel bravo');
    expect(callsignWords('XYZ1')).toBe('x-ray yankee zulu one');
    expect(altitudeWords(4000)).toBe('four thousand feet');
    expect(altitudeWords(3500)).toBe('three thousand five hundred feet');
    expect(altitudeWords(10000)).toBe('one zero thousand feet');
    expect(altitudeWords(12000)).toBe('flight level one two zero');
    expect(speedWords(180)).toBe('one eight zero knots');
    expect(runwayWords('13L')).toBe('one three left');
    expect(chunkId('Runway one three left, cleared to land')).toBe('x_runway_one_three_left_cleared_to_land');
  });
});

describe('chunksFor', () => {
  it('controller: the callsign, then each instruction (a heading as stem + number)', () => {
    const ins = instructionsFor({ heading: 40, altitude: 4000 }, wzz);
    const chunks = chunksFor('controller', 'WZZ9003', ins, new RadioMemory(), seq(), '1', 0);
    expect(chunks[0]).toEqual({ text: 'Wizz Air niner zero zero three', gapMs: 0 });
    expect(chunks[1].text).toBe('turn left heading');
    expect(chunks[1].gapMs).toBeGreaterThan(100);
    expect(chunks[2].text).toBe('zero four zero');
    expect(chunks[2].gapMs).toBeLessThan(30);
    expect(['descend to altitude four thousand feet', 'descend altitude four thousand feet', 'descend four thousand feet']).toContain(chunks[3].text);
  });

  it('pilot: the readback, then the callsign', () => {
    const chunks = chunksFor('pilot', 'WZZ9003', instructionsFor({ land: '13L' }, wzz), new RadioMemory(), seq(), '1', 0);
    expect(chunks.map((c) => c.text)).toEqual(['cleared to land runway one three left', 'Wizz Air niner zero zero three']);
  });

  it('some calls get one hesitation at a pause, never at the end; the controller none by default', () => {
    const ins = instructionsFor({ heading: 40, altitude: 4000 }, wzz);
    const rng = seq(5);
    const spots = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const chunks = chunksFor('pilot', 'WZZ9003', ins, new RadioMemory(), rng, '1', 1);
      const at = chunks.findIndex((c) => c.filler);
      expect(chunks.filter((c) => c.filler)).toHaveLength(1);
      expect(at).toBeLessThan(chunks.length - 1);
      expect(chunks[at + 1].gapMs).toBe(GAPS.afterFiller);
      spots.add(at);
    }
    expect(spots.size).toBeGreaterThan(2);
    expect(FILLER_CHANCE.controller).toBe(0);
    const rng2 = seq(7);
    expect(Array.from({ length: 40 }, () => chunksFor('controller', 'WZZ9003', ins, new RadioMemory(), rng2, '1').some((c) => c.filler)).some(Boolean)).toBe(false);
    const pilotCalls = Array.from({ length: 200 }, () => chunksFor('pilot', 'WZZ9003', ins, new RadioMemory(), rng2, '1').some((c) => c.filler));
    const share = pilotCalls.filter(Boolean).length / pilotCalls.length;
    expect(share).toBeGreaterThan(FILLER_CHANCE.pilot / 2);
    expect(share).toBeLessThan(FILLER_CHANCE.pilot * 2);
  });

  it('never the same phrasing twice in a row for a plane', () => {
    const memory = new RadioMemory();
    const rng = seq(3);
    let last = '';
    for (let i = 0; i < 15; i++) {
      const text = chunksFor('pilot', 'WZZ9003', instructionsFor({ altitude: 4000 }, wzz), memory, rng, '1', 0)[0].text;
      expect(text).not.toBe(last);
      last = text;
    }
  });
});

describe('recorded coverage (assets/voices/index.json)', () => {
  const headings = Array.from({ length: 360 / VALUES.headingStep }, (_, i) => (i + 1) * VALUES.headingStep);
  const range = (r: { min: number; max: number; step: number }) => Array.from({ length: (r.max - r.min) / r.step + 1 }, (_, i) => r.min + i * r.step);

  it('every voice has every callsign in the flight lists as one phrase', () => {
    for (const [voice, v] of Object.entries(index)) {
      for (const [code, ns] of Object.entries(flights)) {
        if (code === 'about' || !AIRLINE_CALLSIGNS[code]) continue;
        for (const n of ns) expect(v.clips[chunkId(callsignWords(code + n))], `${voice} ${code}${n}`).toContain(v.role === 'controller' ? 'm0' : 'f0');
      }
      const spec = (manifest.cast as Record<string, { fillers?: string[] }>)[voice];
      for (const f of spec.fillers ?? []) expect(v.clips[`h_${f}`], `${voice} h_${f}`).toEqual(['h0', 'h1']);
      if (FILLER_CHANCE[v.role] > 0) expect(spec.fillers?.length, `${voice} hesitations`).toBeGreaterThan(0);
    }
  });

  it('every voice has every phrasing of every value the steppers allow, continuing and (controller) ending', () => {
    const planes: PlaneNow[] = [
      { ...wzz, heading: 180, altitude: 8000, speed: 220 },
      { ...wzz, heading: 0, altitude: 16000, speed: 320 },
      { ...wzz, heading: 180, altitude: 1000, speed: 100 },
    ];
    const commands = [
      ...headings.map((heading) => ({ heading })),
      ...range(VALUES.altitude).map((altitude) => ({ altitude })),
      ...range(VALUES.speed).map((speed) => ({ speed })),
      ...VALUES.runways.map((land) => ({ land })),
    ];
    for (const [voice, v] of Object.entries(index)) {
      for (const plane of planes) {
        for (const cmd of commands) {
          for (const ins of instructionsFor(cmd, plane)) {
            for (const phrase of PHRASINGS[v.role][ins.kind]) {
              let filled = phrase;
              for (const [k, val] of Object.entries(ins.values)) filled = filled.replace(`{${k}}`, val);
              const parts = filled.split('|').map((p) => p.trim());
              parts.forEach((part, i) => {
                const takes = v.clips[chunkId(part)];
                expect(takes, `${voice}: ${part}`).toBeDefined();
                expect(takes).toContain('m0');
                if (v.role === 'controller' && i === parts.length - 1) expect(takes, `${voice}: ${part} (ending)`).toContain('f0');
              });
            }
          }
        }
      }
    }
  });
});

describe('toSegments', () => {
  const take = (t: string) => ({ take: t, ms: 500, file: 0 });
  const clips: VoiceClips = {
    ctl: {
      role: 'controller',
      clips: {
        x_wizz_air_niner_zero_zero_three: [take('m0')],
        x_descend_four_thousand_feet: [take('m0'), take('f0')],
      },
    },
  };

  it('plays whole chunks: continuing takes, the last one ending', () => {
    const segs = toSegments({ voice: 'ctl', clips, chunks: [{ text: 'Wizz Air niner zero zero three', gapMs: 0 }, { text: 'descend four thousand feet', gapMs: 140 }], memory: new RadioMemory(), rng: seq() });
    expect(segs!.map((s) => [s.piece, s.take, s.gapMs])).toEqual([
      ['x_wizz_air_niner_zero_zero_three', 'm0', 0],
      ['x_descend_four_thousand_feet', 'f0', 140],
    ]);
  });

  it("a hesitation plays one of the voice's own, not the same twice running; a voice without any skips it", () => {
    const withFillers: VoiceClips = { p: { role: 'pilot', clips: { ...clips.ctl.clips, h_uh: [take('h0'), take('h1')], h_um: [take('h0')] } } };
    const chunks = [{ text: '', filler: true as const, gapMs: 0 }, { text: 'descend four thousand feet', gapMs: GAPS.afterFiller }, { text: 'Wizz Air niner zero zero three', gapMs: 170 }];
    const memory = new RadioMemory();
    const firsts = Array.from({ length: 6 }, () => toSegments({ voice: 'p', clips: withFillers, chunks, memory, rng: seq() })![0]);
    expect(firsts.every((s) => s.piece.startsWith('h_'))).toBe(true);
    firsts.slice(1).forEach((s, i) => expect(s.piece).not.toBe(firsts[i].piece));
    const plain = toSegments({ voice: 'ctl', clips, chunks, memory: new RadioMemory(), rng: seq() });
    expect(plain!.map((s) => [s.piece, s.gapMs])).toEqual([
      ['x_descend_four_thousand_feet', 0],
      ['x_wizz_air_niner_zero_zero_three', 170],
    ]);
  });

  it("a chunk without a recording: the utterance isn't said (null), rather than said in part", () => {
    expect(toSegments({ voice: 'ctl', clips, chunks: [{ text: 'Ryanair four one hotel bravo', gapMs: 0 }, { text: 'descend four thousand feet', gapMs: 140 }], memory: new RadioMemory(), rng: seq() })).toBeNull();
    expect(toSegments({ voice: 'nobody', clips, chunks: [{ text: 'descend four thousand feet', gapMs: 0 }], memory: new RadioMemory(), rng: seq() })).toBeNull();
  });
});

describe('scriptCall', () => {
  /** The rendered cast, as the app's index has it. */
  const cast: VoiceClips = Object.fromEntries(
    Object.entries(index).map(([voice, v]) => [voice, { role: v.role, clips: Object.fromEntries(Object.entries(v.clips).map(([id, ts]) => [id, ts.map((t) => ({ take: t, ms: 500, file: 0 }))])) }]),
  );

  it("a desk call as the controller's transmission and the pilot's readback, from the recordings", () => {
    const script = scriptCall({ planeId: '1', changes: { altitude: 4000 }, plane: wzz }, cast, new RadioMemory(), seq(), { pilot: 0 });
    expect(script!.controller[0].piece).toBe('x_wizz_air_niner_zero_zero_three');
    expect(script!.controller[1].take).toBe('f0');
    expect(script!.pilot[script!.pilot.length - 1]).toMatchObject({ piece: 'x_wizz_air_niner_zero_zero_three', take: 'f0' });
  });

  it('null for a callsign without a recording, or nothing to say', () => {
    expect(scriptCall({ planeId: '1', changes: { altitude: 4000 }, plane: { ...wzz, callsign: 'WZZ4' } }, cast, new RadioMemory(), seq())).toBeNull();
    expect(scriptCall({ planeId: '1', changes: {}, plane: wzz }, cast, new RadioMemory(), seq())).toBeNull();
  });
});

describe('pilotFor', () => {
  it('gives a plane the same pilot every time, and spreads planes over the pilots', () => {
    const cast: VoiceClips = { ctl: { role: 'controller', clips: {} }, p1: { role: 'pilot', clips: {} }, p2: { role: 'pilot', clips: {} } };
    expect(pilotFor('WZZ9003', cast)).toBe(pilotFor('WZZ9003', cast));
    expect(new Set(['WZZ9003', 'RYR41HB', 'BAW99', 'LOT537', 'DLH1340', 'EZY512'].map((c) => pilotFor(c, cast)))).toEqual(new Set(['p1', 'p2']));
  });
});
