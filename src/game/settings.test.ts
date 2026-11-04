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

  it('music is on by default, and an older save without it keeps it on', () => {
    expect(DEFAULT_SETTINGS.music).toBe(true);
    expect(parseSettings(JSON.stringify({ sound: false })).music).toBe(true);
    expect(parseSettings(JSON.stringify({ music: false })).music).toBe(false);
    expect(parseSettings(JSON.stringify({ music: 'no' })).music).toBe(true);
  });

  it('Zen in a game and the radio voice by default; a bad value falls back', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ inGameAudio: 'zen', radioVoice: true });
    expect(parseSettings(JSON.stringify({ inGameAudio: 'zen', radioVoice: false }))).toMatchObject({ inGameAudio: 'zen', radioVoice: false });
    expect(parseSettings(JSON.stringify({ inGameAudio: 'loud' })).inGameAudio).toBe('zen');
  });

  it('volumes: full by default; kept between 0 and 1; a bad value falls back', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ soundVolume: 1, musicVolume: 1, radioVolume: 1 });
    expect(parseSettings(JSON.stringify({ soundVolume: 0.4, musicVolume: 3, radioVolume: -1 }))).toMatchObject({ soundVolume: 0.4, musicVolume: 1, radioVolume: 0 });
    expect(parseSettings(JSON.stringify({ musicVolume: 'loud', radioVolume: null }))).toMatchObject({ musicVolume: 1, radioVolume: 1 });
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
