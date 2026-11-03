import { describe, expect, it } from 'vitest';
import { add, dirOf } from '../engine/math';
import { tutorial } from './fixtures';
import { advance, pinchTarget, stepDone, stepLabel, TUTORIAL_CALLSIGN, TUTORIAL_DONE, TUTORIAL_STEPS, type TutorialObservation } from './tutorial';

const idle: TutorialObservation = { selected: null, targetAltitude: 6000, cleared: false, zoom: 8, zoomAtStep: 8 };

describe('tutorial steps', () => {
  it('has four steps, T1 to T4, and labels them n / 4', () => {
    expect(TUTORIAL_STEPS).toHaveLength(4);
    expect(TUTORIAL_DONE).toBe(4);
    expect(stepLabel(0)).toBe('1 / 4');
    expect(stepLabel(3)).toBe('4 / 4');
    expect(stepLabel(4)).toBe('4 / 4');
  });

  it('copy is plain serialisable data', () => {
    expect(JSON.parse(JSON.stringify(TUTORIAL_STEPS))).toEqual(TUTORIAL_STEPS);
  });

  it('T1 waits for the tutorial plane to be selected (not another plane)', () => {
    expect(stepDone(0, idle)).toBe(false);
    expect(stepDone(0, { ...idle, selected: 'RYR41HB' })).toBe(false);
    expect(stepDone(0, { ...idle, selected: 'WZZ9003' })).toBe(true);
  });

  it('T2 waits for an order of 4,000 ft or lower', () => {
    expect(stepDone(1, { ...idle, targetAltitude: 5000 })).toBe(false);
    expect(stepDone(1, { ...idle, targetAltitude: 4000 })).toBe(true);
    expect(stepDone(1, { ...idle, targetAltitude: 3000 })).toBe(true);
    expect(stepDone(1, { ...idle, targetAltitude: null })).toBe(false);
  });

  it('T3 waits for a landing clearance', () => {
    expect(stepDone(2, idle)).toBe(false);
    expect(stepDone(2, { ...idle, cleared: true })).toBe(true);
  });

  it('T4 waits for a zoom in to twice the zoom it started at, at most runway zoom', () => {
    expect(pinchTarget(8)).toBe(16);
    expect(pinchTarget(20)).toBe(26);
    expect(stepDone(3, { ...idle, zoom: 15.9 })).toBe(false);
    expect(stepDone(3, { ...idle, zoom: 16 })).toBe(true);
    expect(stepDone(3, { ...idle, zoom: 25, zoomAtStep: 20 })).toBe(false);
    expect(stepDone(3, { ...idle, zoom: 26, zoomAtStep: 20 })).toBe(true);
  });

  it('advances one step at a time and stops at done', () => {
    const all: TutorialObservation = { selected: 'WZZ9003', targetAltitude: 4000, cleared: true, zoom: 30, zoomAtStep: 8 };
    expect(advance(0, all)).toBe(1);
    expect(advance(1, all)).toBe(2);
    expect(advance(3, all)).toBe(4);
    expect(advance(4, all)).toBe(4);
    expect(advance(1, idle)).toBe(1);
  });
});

describe('tutorial scene', () => {
  it('has the tutorial plane at 6,000 ft and RYR41HB cleared to 31R, nothing in conflict and nothing to come', () => {
    const sim = tutorial();
    const wzz = sim.planes.find((p) => p.callsign === TUTORIAL_CALLSIGN)!;
    const ryr = sim.planes.find((p) => p.callsign === 'RYR41HB')!;
    expect(wzz.altitude).toBe(6000);
    expect(wzz.clearedRunway).toBeNull();
    expect(ryr.clearedRunway?.id).toBe('31R');
    expect(sim.conflicts).toHaveLength(0);
    expect(sim.remainingTraffic).toBe(0);
  });

  it('plays out: after two minutes of reading, the plane descends to 4,000 ft, is cleared to 13L and lands, without a separation loss', () => {
    const sim = tutorial();
    const wzz = sim.planes.find((p) => p.callsign === TUTORIAL_CALLSIGN)!;
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

  it('stays in the sector for ten minutes if the player only reads', () => {
    const sim = tutorial();
    const wzz = sim.planes.find((p) => p.callsign === TUTORIAL_CALLSIGN)!;
    for (let t = 0; t < 600; t++) sim.step(1);
    expect(wzz.status).not.toBe('exited');
  });
});
