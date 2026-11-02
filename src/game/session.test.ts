import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../engine/data/airports';
import { allows, findAirports, lengthSec, meanIntervalSec, parseSession, regionCounts, sessionLabel, trafficHorizonSec } from './session';

describe('sessions', () => {
  it('traffic levels are ~6, ~14 and ~24 arrivals an hour', () => {
    expect(meanIntervalSec('light')).toBe(600);
    expect(Math.round(meanIntervalSec('steady'))).toBe(257);
    expect(meanIntervalSec('busy')).toBe(150);
  });

  it('lengths in seconds; endless has none but still gets two hours of traffic', () => {
    expect(lengthSec(30)).toBe(1800);
    expect(lengthSec('endless')).toBeNull();
    expect(trafficHorizonSec('endless')).toBe(7200);
    expect(sessionLabel({ icao: 'LHBP', traffic: 'steady', length: 30 })).toBe('STEADY · 30 MIN');
  });

  it('the free version allows only the free airport, Steady and 30 min; full allows every playable airport', () => {
    const lhbp = CATALOGUE.find((a) => a.icao === 'LHBP')!;
    const loww = CATALOGUE.find((a) => a.icao === 'LOWW')!;
    expect(allows.airport('free', lhbp)).toBe(true);
    expect(allows.airport('free', loww)).toBe(false);
    expect(allows.airport('full', loww)).toBe(false); // no layout yet
    expect(allows.traffic('free', 'busy')).toBe(false);
    expect(allows.traffic('full', 'busy')).toBe(true);
    expect(allows.length('free', 30)).toBe(true);
    expect(allows.length('free', 'endless')).toBe(false);
  });

  it('search matches city, name or ICAO; region filters; free first, then easiest', () => {
    expect(findAirports('lond', 'All').map((a) => a.icao)).toEqual(['EGLL']);
    expect(findAirports('KJFK', 'All')).toHaveLength(1);
    expect(findAirports('', 'Asia').every((a) => a.region === 'Asia')).toBe(true);
    expect(findAirports('', 'All')[0].icao).toBe('LHBP');
  });

  it('30 airports: Europe 18, Americas 7, Asia 5', () => {
    expect(regionCounts()).toEqual([
      { region: 'All', count: 30 },
      { region: 'Europe', count: 18 },
      { region: 'Americas', count: 7 },
      { region: 'Asia', count: 5 },
    ]);
  });

  it('route params parse safely, falling back to the free session', () => {
    expect(parseSession({ icao: 'LHBP', traffic: 'busy', length: '60' })).toEqual({ icao: 'LHBP', traffic: 'busy', length: 60 });
    expect(parseSession({ length: 'endless' }).length).toBe('endless');
    expect(parseSession({ icao: 'LOWW', traffic: 'x', length: '7' })).toEqual({ icao: 'LHBP', traffic: 'steady', length: 30 });
  });
});
