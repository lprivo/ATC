import { describe, expect, it } from 'vitest';
import { AIRLINE_CALLSIGNS, AIRLINE_NAMES } from '../engine/data/airlines';
import { AIRPORTS } from '../engine/airports';
import { digits, pickVoices, RADIO_QUIET_MS, RadioDesk, spokenAltitude, spokenCallsign, spokenRunway, transmission, type PlaneNow } from './radio';

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

describe('spoken words', () => {
  it('reads digits singly, with niner', () => {
    expect(digits('080')).toBe('zero eight zero');
    expect(digits('9')).toBe('niner');
  });

  it('says callsigns with the airline name, and spells unknown ones', () => {
    expect(spokenCallsign('WZZ9003')).toBe('Wizz Air niner zero zero three');
    expect(spokenCallsign('RYR41HB')).toBe('Ryanair four one hotel bravo');
    expect(spokenCallsign('BAW99')).toBe('Speedbird niner niner');
    expect(spokenCallsign('FIX1')).toBe('foxtrot india x-ray one');
  });

  it('says runways as two digits and a side', () => {
    expect(spokenRunway('13L')).toBe('one three left');
    expect(spokenRunway('31R')).toBe('three one right');
    expect(spokenRunway('9')).toBe('zero niner');
    expect(spokenRunway('04C')).toBe('zero four centre');
  });

  it('says altitudes in feet up to 10,000 ft and flight levels above', () => {
    expect(spokenAltitude(4000)).toBe('four thousand feet');
    expect(spokenAltitude(3500)).toBe('three thousand five hundred feet');
    expect(spokenAltitude(10000)).toBe('one zero thousand feet');
    expect(spokenAltitude(12000)).toBe('flight level one two zero');
    expect(spokenAltitude(9049)).toBe('niner thousand feet');
  });
});

describe('transmission', () => {
  it('a turn: the controller says the side, the pilot reads it back and ends with the callsign', () => {
    expect(transmission('1', { heading: 40 }, wzz)).toEqual({
      planeId: '1',
      callsign: 'WZZ9003',
      controller: 'Wizz Air niner zero zero three, turn left heading zero four zero.',
      readback: 'Left heading zero four zero, Wizz Air niner zero zero three.',
    });
    expect(transmission('1', { heading: 120 }, wzz)?.controller).toContain('turn right heading one two zero');
    expect(transmission('1', { heading: 0 }, { ...wzz, heading: 300 })?.controller).toContain('turn right heading three six zero');
    expect(transmission('1', { heading: 81 }, wzz)?.controller).toContain('fly heading zero eight one');
  });

  it('altitude: descend to altitude in feet, climb to a flight level', () => {
    expect(transmission('1', { altitude: 4000 }, wzz)).toMatchObject({
      controller: 'Wizz Air niner zero zero three, descend to altitude four thousand feet.',
      readback: 'Descend four thousand feet, Wizz Air niner zero zero three.',
    });
    expect(transmission('1', { altitude: 12000 }, wzz)).toMatchObject({
      controller: 'Wizz Air niner zero zero three, climb flight level one two zero.',
      readback: 'Climb flight level one two zero, Wizz Air niner zero zero three.',
    });
  });

  it('speed: reduce or increase', () => {
    expect(transmission('1', { speed: 160 }, wzz)).toMatchObject({
      controller: 'Wizz Air niner zero zero three, reduce speed one six zero knots.',
      readback: 'Reduce one six zero knots, Wizz Air niner zero zero three.',
    });
    expect(transmission('1', { speed: 250 }, wzz)?.controller).toContain('increase speed two five zero knots');
  });

  it('several changes go in one call, in the order heading, altitude, speed, landing', () => {
    expect(transmission('1', { speed: 180, altitude: 4000, heading: 40 }, wzz)?.controller).toBe(
      'Wizz Air niner zero zero three, turn left heading zero four zero, descend to altitude four thousand feet, reduce speed one eight zero knots.',
    );
  });

  it('a landing clearance', () => {
    expect(transmission('1', { land: '13L' }, wzz)).toMatchObject({
      controller: 'Wizz Air niner zero zero three, runway one three left, cleared to land.',
      readback: 'Cleared to land runway one three left, Wizz Air niner zero zero three.',
    });
  });

  it('nothing to say: no call', () => {
    expect(transmission('1', {}, wzz)).toBeNull();
  });
});

describe('RadioDesk', () => {
  const look = (id: string) => (id === '1' ? wzz : id === '2' ? { ...wzz, callsign: 'RYR41HB' } : undefined);

  it('waits until the player has left the plane alone, then makes one call with the latest values', () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'altitude', value: 5000 }, 0);
    d.note('1', { kind: 'altitude', value: 4000 }, 300);
    expect(d.due(300 + RADIO_QUIET_MS - 1, look)).toEqual([]);
    const [call, ...rest] = d.due(300 + RADIO_QUIET_MS, look);
    expect(rest).toEqual([]);
    expect(call.controller).toContain('descend to altitude four thousand feet');
    expect(d.due(10_000, look)).toEqual([]);
  });

  it("doesn't repeat what was already said, and says a change back", () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'heading', value: 40 }, 0);
    d.due(RADIO_QUIET_MS, look);
    d.note('1', { kind: 'heading', value: 40 }, 2000);
    expect(d.due(2000 + RADIO_QUIET_MS, look)).toEqual([]);
    d.note('1', { kind: 'heading', value: 60 }, 3000);
    expect(d.due(3000 + RADIO_QUIET_MS, look)[0].controller).toContain('heading zero six zero');
  });

  it('a new altitude after a clearance means the next clearance is said again', () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'land', runway: '13L' }, 0);
    d.due(RADIO_QUIET_MS, look);
    d.note('1', { kind: 'altitude', value: 5000 }, 2000);
    d.due(2000 + RADIO_QUIET_MS, look);
    d.note('1', { kind: 'land', runway: '13L' }, 4000);
    expect(d.due(4000 + RADIO_QUIET_MS, look)[0].controller).toContain('cleared to land');
  });

  it('an altitude in the same burst as a clearance drops the clearance (the sim cancels it too)', () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'land', runway: '13L' }, 0);
    d.note('1', { kind: 'altitude', value: 5000 }, 100);
    const [call] = d.due(100 + RADIO_QUIET_MS, look);
    expect(call.controller).not.toContain('cleared to land');
  });

  it('calls planes in the order they went quiet, and drops planes that are gone', () => {
    const d = new RadioDesk();
    d.note('2', { kind: 'speed', value: 180 }, 0);
    d.note('1', { kind: 'speed', value: 180 }, 100);
    d.note('9', { kind: 'speed', value: 180 }, 50);
    expect(d.due(5000, look).map((t) => t.callsign)).toEqual(['RYR41HB', 'WZZ9003']);
  });

  it('clear() forgets pending calls and what was said', () => {
    const d = new RadioDesk();
    d.note('1', { kind: 'speed', value: 180 }, 0);
    d.clear();
    expect(d.due(5000, look)).toEqual([]);
  });
});

describe('pickVoices', () => {
  const v = (identifier: string, language: string, quality = 'Default', name = identifier) => ({ identifier, name, language, quality });

  it('a British controller and another accent for the pilot, Enhanced first', () => {
    expect(pickVoices([v('us1', 'en-US'), v('gb1', 'en-GB'), v('gb2', 'en-GB', 'Enhanced'), v('fr', 'fr-FR'), v('au', 'en-AU', 'Enhanced')])).toEqual({ controller: 'gb2', pilot: 'au' });
  });

  it('never picks a novelty voice (the croaky Albert, Grandpa, Zarvox...)', () => {
    const picked = pickVoices([
      v('com.apple.speech.synthesis.voice.Albert', 'en-US', 'Default', 'Albert'),
      v('com.apple.eloquence.en-US.Grandpa', 'en-US', 'Default', 'Grandpa'),
      v('x.zarvox', 'en-US', 'Default', 'Zarvox'),
      v('com.apple.voice.compact.en-GB.Daniel', 'en-GB', 'Default', 'Daniel'),
      v('com.apple.voice.compact.en-US.Samantha', 'en-US', 'Default', 'Samantha'),
    ]);
    expect(picked).toEqual({ controller: 'com.apple.voice.compact.en-GB.Daniel', pilot: 'com.apple.voice.compact.en-US.Samantha' });
  });

  it('prefers Premium, then Enhanced, then the natural voices by name', () => {
    expect(
      pickVoices([
        v('com.apple.voice.compact.en-US.Samantha', 'en-US', 'Default', 'Samantha'),
        v('com.apple.voice.enhanced.en-US.Evan', 'en-US', 'Enhanced', 'Evan (Enhanced)'),
        v('com.apple.voice.premium.en-US.Zoe', 'en-US', 'Enhanced', 'Zoe (Premium)'),
        v('com.apple.voice.compact.en-GB.Kate', 'en-GB', 'Default', 'Kate'),
        v('com.apple.voice.compact.en-GB.Daniel', 'en-GB', 'Default', 'Daniel'),
      ]),
    ).toEqual({ controller: 'com.apple.voice.compact.en-GB.Daniel', pilot: 'com.apple.voice.premium.en-US.Zoe' });
  });

  it('falls back to any two English voices, then to the default voice', () => {
    expect(pickVoices([v('us1', 'en-US'), v('us2', 'en_US')])).toEqual({ controller: 'us1', pilot: 'us2' });
    expect(pickVoices([v('fr', 'fr-FR')])).toEqual({ controller: undefined, pilot: undefined });
  });
});
