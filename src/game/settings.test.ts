import { describe, expect, it } from 'vitest';
import { conflictAltitude, DEFAULT_SETTINGS, effectiveTheme, formatAltitude, formatDistance, parseSettings } from './settings';

describe('settings', () => {
  it('missing, broken or partial storage falls back to defaults field by field', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ haptics: false, altUnit: 'm', labelSize: 'XL' }))).toEqual({
      ...DEFAULT_SETTINGS,
      haptics: false,
      altUnit: 'm',
    });
  });

  it('follow system: Paper in light mode, Radar in dark (or unknown) mode', () => {
    const s = { ...DEFAULT_SETTINGS, followSystem: true, theme: 'paper' };
    expect(effectiveTheme(s, 'light')).toBe('paper');
    expect(effectiveTheme(s, 'dark')).toBe('radar');
    expect(effectiveTheme(s, null)).toBe('radar');
    expect(effectiveTheme({ ...s, followSystem: false }, 'dark')).toBe('paper');
  });

  it('units: metres rounded to 10, kilometres to one decimal (rounded down)', () => {
    expect(formatAltitude(7000, 'ft')).toBe('7,000');
    expect(formatAltitude(7000, 'm')).toBe('2,130');
    expect(formatAltitude(7000, 'm', true)).toBe('2,130 m');
    expect(formatDistance(2.7, 'nm')).toBe('2.7 nm');
    expect(formatDistance(2.7, 'km')).toBe('5.0 km');
    // Conflict separation rounds down in both units (950 ft is 289.6 m).
    expect(conflictAltitude(950, 'm')).toBe('280 m');
    expect(conflictAltitude(999, 'ft')).toBe('900 ft');
  });
});
