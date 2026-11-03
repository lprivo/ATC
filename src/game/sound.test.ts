import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../engine/types';
import { HAPTIC_FOR } from './hapticMap';
import { crossfade, eventSounds, musicForRoute, SOUND_FOR } from './sound';

const ev = (seq: number, kind: SimEvent['kind']): SimEvent => ({ seq, time: seq, kind, text: '', callsigns: ['X'] });

describe('sound map', () => {
  it('gives every haptic moment a sound too', () => {
    for (const m of Object.keys(HAPTIC_FOR)) expect(SOUND_FOR).toHaveProperty(m);
  });

  it('is plain serialisable data with volumes in 0–1', () => {
    expect(JSON.parse(JSON.stringify(SOUND_FOR))).toEqual(SOUND_FOR);
    for (const s of Object.values(SOUND_FOR)) expect(s.volume > 0 && s.volume <= 1).toBe(true);
  });

  it('keeps stepper steps quieter than a conflict', () => {
    expect(SOUND_FOR.step.volume).toBeLessThan(SOUND_FOR.conflict.volume);
  });
});

describe('eventSounds', () => {
  it('plays landings and go-arounds after the last seen event, once per kind', () => {
    const events = [ev(1, 'landed'), ev(2, 'cleared'), ev(3, 'landed'), ev(4, 'goAround'), ev(5, 'landed')];
    expect(eventSounds(events, 0)).toEqual(['landed', 'goAround']);
    expect(eventSounds(events, 3)).toEqual(['goAround', 'landed']);
    expect(eventSounds(events, 5)).toEqual([]);
  });

  it('ignores events without a sound (clearances, entries, conflicts)', () => {
    expect(eventSounds([ev(1, 'cleared'), ev(2, 'entered'), ev(3, 'conflict'), ev(4, 'exited')], 0)).toEqual([]);
  });
});

describe('music', () => {
  it('plays the in-game loop in the game and the tutorial, the menu track elsewhere', () => {
    expect(musicForRoute('/game')).toBe('zen');
    expect(musicForRoute('/game/')).toBe('zen');
    expect(musicForRoute('/tutorial')).toBe('zen');
    expect(musicForRoute('/menu')).toBe('menu');
    expect(musicForRoute('/summary')).toBe('menu');
    expect(musicForRoute('/')).toBe('menu');
    expect(musicForRoute('/settings?x=1')).toBe('menu');
  });

  it('in a game, plays the Zen loop, or nothing in the radio room (no background yet)', () => {
    expect(musicForRoute('/game', 'zen')).toBe('zen');
    expect(musicForRoute('/game', 'radio')).toBeNull();
    expect(musicForRoute('/tutorial', 'radio')).toBeNull();
    expect(musicForRoute('/menu', 'radio')).toBe('menu');
  });

  it('crossfades equal-power from the old track to the new one', () => {
    expect(crossfade(0, 1000)).toEqual({ out: 1, in: 0 });
    const mid = crossfade(500, 1000);
    expect(mid.out).toBeCloseTo(Math.SQRT1_2);
    expect(mid.in).toBeCloseTo(Math.SQRT1_2);
    expect(mid.out ** 2 + mid.in ** 2).toBeCloseTo(1);
    const end = crossfade(1000, 1000);
    expect(end.out).toBeCloseTo(0);
    expect(end.in).toBe(1);
    expect(crossfade(5000, 1000).in).toBe(1);
    expect(crossfade(-10, 1000).out).toBe(1);
    expect(crossfade(10, 0).in).toBe(1);
  });
});
