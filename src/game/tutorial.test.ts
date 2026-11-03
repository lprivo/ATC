import { describe, expect, it } from 'vitest';
import { LHBP } from '../engine/airports/lhbp';
import { add, dirOf, dist } from '../engine/math';
import { cardFor, fillCopy, startTutorial, stepLabel, tick, TUTORIAL, tutorialSim, type TutorialObservation, type TutorialState } from './tutorial';

const def = TUTORIAL;
/** The player hasn't done anything yet: plane in the air at 6,000 ft, radar at the sector zoom. */
const idle: TutorialObservation = { planeActive: true, selected: null, targetAltitude: 6000, cleared: false, zoom: 8, maxZoom: 48 };
const at = (step: number, more: Partial<TutorialState> = {}): TutorialState => ({ step, entered: true, zoomLow: null, ...more });
const stepOf = (g: string) => def.steps.findIndex((s) => s.gesture === g);

describe('tutorial definition', () => {
  it('is plain serialisable data', () => {
    expect(JSON.parse(JSON.stringify(def))).toEqual(def);
  });

  it('has four steps in the design order, labelled n / 4', () => {
    expect(def.steps.map((s) => s.gesture)).toEqual(['select', 'descend', 'clear', 'pinch']);
    expect(stepLabel(def, startTutorial(def, 0))).toBe('1 / 4');
    expect(stepLabel(def, startTutorial(def, 3))).toBe('4 / 4');
    expect(stepLabel(def, startTutorial(def, 4))).toBe('4 / 4');
  });

  it('clamps a starting step to the steps', () => {
    expect(startTutorial(def, -1).step).toBe(0);
    expect(startTutorial(def, 7).step).toBe(4);
    expect(startTutorial(def, 2.4).step).toBe(2);
    expect(startTutorial(def, NaN).step).toBe(0);
  });

  it('fills the copy with the callsign, runway and altitude', () => {
    const copy = fillCopy({ title: 'Bring {callsign} down to {altitude}', body: 'then to {runway}' }, { callsign: 'WZZ9003', runway: '13L', altitude: '1,220 m' });
    expect(copy).toEqual({ title: 'Bring WZZ9003 down to 1,220 m', body: 'then to 13L' });
  });

  it('leaves unknown placeholders alone and inserts values literally', () => {
    const copy = fillCopy({ title: '{foo} {altitude}', body: '' }, { callsign: 'X', runway: 'Y', altitude: '$& $1' });
    expect(copy.title).toBe('{foo} $& $1');
  });
});

describe('tutorial step machine', () => {
  it('select: waits for the tutorial plane to be selected (not another plane)', () => {
    const s = at(stepOf('select'));
    expect(tick(def, s, idle).state.step).toBe(0);
    expect(tick(def, s, { ...idle, selected: 'RYR41HB' }).state.step).toBe(0);
    expect(tick(def, s, { ...idle, selected: 'WZZ9003' }).state.step).toBe(1);
  });

  it('descend: waits for an order of 4,000 ft or lower', () => {
    const s = at(stepOf('descend'));
    const sel = { ...idle, selected: 'WZZ9003' };
    expect(tick(def, s, { ...sel, targetAltitude: 5000 }).state.step).toBe(1);
    expect(tick(def, s, { ...sel, targetAltitude: 4000 }).state.step).toBe(2);
    expect(tick(def, s, { ...sel, targetAltitude: 3000 }).state.step).toBe(2);
  });

  it('clear: closes the controls on entering, then waits for a landing clearance', () => {
    const entering = startTutorial(def, stepOf('clear'));
    const first = tick(def, entering, { ...idle, selected: 'WZZ9003' });
    expect(first.deselect).toBe(true);
    expect(first.state).toEqual({ step: 2, entered: true, zoomLow: 8 });
    const second = tick(def, first.state, idle);
    expect(second.deselect).toBe(false);
    expect(second.state.step).toBe(2);
    expect(tick(def, first.state, { ...idle, cleared: true }).state.step).toBe(3);
  });

  it('clear: already cleared when it starts, it closes the controls and moves on in one tick', () => {
    const r = tick(def, startTutorial(def, stepOf('clear')), { ...idle, selected: 'WZZ9003', cleared: true });
    expect(r.deselect).toBe(true);
    expect(r.state.step).toBe(3);
  });

  it('only the clear step closes the controls', () => {
    for (const step of [0, 1, 3]) expect(tick(def, startTutorial(def, step), idle).deselect).toBe(false);
  });

  it('pinch: waits for a zoom in to 1.5 × the widest zoom of the step', () => {
    const entering = startTutorial(def, stepOf('pinch'));
    const first = tick(def, entering, idle);
    expect(first.state).toEqual({ step: 3, entered: true, zoomLow: 8 });
    expect(tick(def, first.state, { ...idle, zoom: 11.9 }).state.step).toBe(3);
    expect(tick(def, first.state, { ...idle, zoom: 12 }).state.step).toBe(4);
  });

  it('pinch: already zoomed in when it starts, it still waits for a pinch in', () => {
    const first = tick(def, startTutorial(def, stepOf('pinch')), { ...idle, zoom: 30 });
    expect(first.state.step).toBe(3);
    expect(tick(def, first.state, { ...idle, zoom: 30 }).state.step).toBe(3);
    // Zooming out lowers the baseline; then a pinch in from there finishes it.
    const out = tick(def, first.state, { ...idle, zoom: 10 });
    expect(out.state).toEqual({ step: 3, entered: true, zoomLow: 10 });
    expect(tick(def, out.state, { ...idle, zoom: 14.9 }).state.step).toBe(3);
    expect(tick(def, out.state, { ...idle, zoom: 15 }).state.step).toBe(4);
  });

  it('pinch: zoomed in close when it starts, zooming in to the closest zoom is enough', () => {
    const first = tick(def, startTutorial(def, stepOf('pinch')), { ...idle, zoom: 40 });
    expect(tick(def, first.state, { ...idle, zoom: 47 }).state.step).toBe(3);
    expect(tick(def, first.state, { ...idle, zoom: 48 }).state.step).toBe(4);
    // Already at the closest zoom: it has to zoom out first.
    const atMax = tick(def, startTutorial(def, stepOf('pinch')), { ...idle, zoom: 48 });
    expect(tick(def, atMax.state, { ...idle, zoom: 48 }).state.step).toBe(3);
  });

  it('pinch: waits for the radar to lay out', () => {
    const first = tick(def, startTutorial(def, stepOf('pinch')), { ...idle, zoom: null });
    expect(first.state).toEqual({ step: 3, entered: true, zoomLow: null });
    expect(tick(def, first.state, { ...idle, zoom: 40 }).state.step).toBe(3);
  });

  it('advances one step per tick even when the player is ahead', () => {
    const all: TutorialObservation = { ...idle, selected: 'WZZ9003', targetAltitude: 4000, cleared: true };
    expect(tick(def, at(0), all).state.step).toBe(1);
    expect(tick(def, at(1), all).state.step).toBe(2);
  });

  it('asks for a restart when the plane is gone before the pinch step, and not after', () => {
    const gone = { ...idle, planeActive: false, targetAltitude: null };
    for (const step of [0, 1, 2]) {
      const r = tick(def, at(step), gone);
      expect(r.restart).toBe(true);
      expect(r.state.step).toBe(step);
    }
    expect(tick(def, at(3), gone).restart).toBe(false);
    expect(tick(def, at(4), gone).restart).toBe(false);
  });

  it('does nothing once done', () => {
    const done = at(4);
    const r = tick(def, done, { ...idle, selected: 'WZZ9003', cleared: true, zoom: 40 });
    expect(r).toEqual({ state: done, restart: false, deselect: false });
  });

  it('keeps the same state object while nothing changes (no re-render)', () => {
    const s = at(0, { zoomLow: 8 });
    expect(tick(def, s, idle).state).toBe(s);
  });
});

describe('tutorial cards', () => {
  it("each step shows its own card; done shows none", () => {
    expect(cardFor(def, at(0), null)?.copy.title).toBe('Tap a plane to take control');
    expect(cardFor(def, at(2), null)).toMatchObject({ spotlight: 'route', legend: true });
    expect(cardFor(def, at(4), null)).toBeNull();
  });

  it('descend: asks for the plane again while its controls are closed', () => {
    expect(cardFor(def, at(1), 'WZZ9003')).toMatchObject({ spotlight: 'sheet', copy: { title: 'Bring it down to {altitude}' } });
    expect(cardFor(def, at(1), null)).toMatchObject({ spotlight: 'plane', copy: def.reselect });
    expect(cardFor(def, at(1), 'RYR41HB')).toMatchObject({ spotlight: 'plane', copy: def.reselect });
  });
});

describe('tutorial scene', () => {
  it('has the tutorial plane at 6,000 ft and RYR41HB 7 nm out on the 31R final, cleared, nothing in conflict and nothing to come', () => {
    const sim = tutorialSim();
    const wzz = sim.planes.find((p) => p.callsign === 'WZZ9003')!;
    const ryr = sim.planes.find((p) => p.callsign === 'RYR41HB')!;
    expect(wzz.altitude).toBe(6000);
    expect(wzz.clearedRunway).toBeNull();
    expect(ryr.clearedRunway?.id).toBe('31R');
    const thr = LHBP.runways.flatMap((r) => r.ends).find((e) => e.id === '31R')!;
    expect(dist(ryr.pos, add(thr.threshold, dirOf(thr.heading + 180), 7))).toBeLessThan(0.01);
    expect(sim.conflicts).toHaveLength(0);
    expect(sim.remainingTraffic).toBe(0);
  });

  it('rejects a definition that does not hold together', () => {
    expect(() => tutorialSim({ ...def, runway: '09' })).toThrow(/no runway end 09/);
    expect(() => tutorialSim({ ...def, airport: 'XXXX' })).toThrow(/no airport XXXX/);
    expect(() => tutorialSim({ ...def, steps: [] })).toThrow(/no steps/);
    expect(() => tutorialSim({ ...def, steps: [{ ...def.steps[0], gesture: 'wave' as never }] })).toThrow(/unknown gesture wave/);
    expect(() => tutorialSim({ ...def, callsign: 'NOPE1' })).toThrow(/no plane NOPE1/);
  });

  it('plays out: after two minutes of reading, the plane descends to 4,000 ft, is cleared to 13L and lands, without a separation loss', () => {
    const sim = tutorialSim();
    const wzz = sim.planes.find((p) => p.callsign === 'WZZ9003')!;
    for (let t = 0; t < 60; t++) sim.step(1);
    sim.setAltitude(wzz.id, 4000);
    for (let t = 0; t < 60; t++) sim.step(1);
    const end = sim.runwayEnd('13L')!;
    // A path round to a 6 nm final, as the player might draw it.
    const final = add(end.threshold, dirOf(end.heading + 180), 6);
    sim.setRoute(wzz.id, [add(final, { x: 0, y: 3 }), final, end.threshold], '13L');
    let landed = false;
    for (let t = 0; t < 900 && !landed; t++) {
      sim.step(1);
      landed = wzz.status === 'landed';
    }
    expect(landed).toBe(true);
    expect(sim.stats.goArounds).toBe(0);
    expect(sim.stats.separationViolations).toBe(0);
    expect(sim.stats.landed).toBe(2); // RYR41HB too
  });

  it('keeps the tutorial plane in the air for ten minutes if the player only reads', () => {
    const sim = tutorialSim();
    const wzz = sim.planes.find((p) => p.callsign === 'WZZ9003')!;
    for (let t = 0; t < 600; t++) sim.step(1);
    expect(wzz.status).toBe('active');
  });
});
