import { describe, expect, it } from 'vitest';
import { AIRLINE_CALLSIGNS, AIRLINE_NAMES } from '../engine/data/airlines';
import { AIRPORTS } from '../engine/airports';
import { RADIO_QUIET_MS, RadioDesk, type PlaneNow } from './radio';

const wzz: PlaneNow = { callsign: 'WZZ9003', heading: 80, altitude: 6000, speed: 230 };

describe('airline names', () => {
  it('has a spoken callsign for every airline any airport flies, and every named airline', () => {
    for (const a of Object.values(AIRPORTS)) for (const code of a.airlines) expect(AIRLINE_CALLSIGNS[code], `${a.icao} ${code}`).toBeTruthy();
    for (const code of Object.keys(AIRLINE_NAMES)) expect(AIRLINE_CALLSIGNS[code], code).toBeTruthy();
  });

  it('is plain serialisable data', () => {
    expect(JSON.parse(JSON.stringify(AIRLINE_CALLSIGNS))).toEqual(AIRLINE_CALLSIGNS);
  });
});

describe('RadioDesk', () => {
  const look = (id: string) => (id === '1' ? wzz : id === '2' ? { ...wzz, callsign: 'RYR41HB' } : undefined);

  it('waits until the player has left the plane alone, then makes one call with the latest values', () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'altitude', value: 5000 }, 0);
    d.note('1', { kind: 'altitude', value: 4000 }, 300);
    expect(d.due(300 + RADIO_QUIET_MS - 1, look)).toEqual([]);
    expect(d.due(300 + RADIO_QUIET_MS, look)).toEqual([{ planeId: '1', changes: { altitude: 4000 }, plane: wzz }]);
    expect(d.due(10_000, look)).toEqual([]);
  });

  it("doesn't repeat what was already said, and says a change back", () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'heading', value: 40 }, 0);
    d.due(RADIO_QUIET_MS, look);
    d.note('1', { kind: 'heading', value: 40 }, 2000);
    expect(d.due(2000 + RADIO_QUIET_MS, look)).toEqual([]);
    d.note('1', { kind: 'heading', value: 60 }, 3000);
    expect(d.due(3000 + RADIO_QUIET_MS, look)[0].changes).toEqual({ heading: 60 });
  });

  it('a new altitude after a clearance means the next clearance is said again', () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'land', runway: '13L' }, 0);
    d.due(RADIO_QUIET_MS, look);
    d.note('1', { kind: 'altitude', value: 5000 }, 2000);
    d.due(2000 + RADIO_QUIET_MS, look);
    d.note('1', { kind: 'land', runway: '13L' }, 4000);
    expect(d.due(4000 + RADIO_QUIET_MS, look)[0].changes).toEqual({ land: '13L' });
  });

  it('an altitude in the same burst as a clearance drops the clearance (the sim cancels it too)', () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'land', runway: '13L' }, 0);
    d.note('1', { kind: 'altitude', value: 5000 }, 100);
    expect(d.due(100 + RADIO_QUIET_MS, look)[0].changes).toEqual({ altitude: 5000 });
  });

  it('calls planes in the order they went quiet, and drops planes that are gone', () => {
    const d = new RadioDesk();
    d.note('2', { kind: 'speed', value: 180 }, 0);
    d.note('1', { kind: 'speed', value: 180 }, 100);
    d.note('9', { kind: 'speed', value: 180 }, 50);
    expect(d.due(5000, look).map((c) => c.plane.callsign)).toEqual(['RYR41HB', 'WZZ9003']);
  });

  it('clear() forgets pending calls and what was said', () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'speed', value: 180 }, 0);
    d.clear();
    expect(d.due(5000, look)).toEqual([]);
  });
});
