import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const log: string[] = [];
let finishSpeech: (() => void) | null = null;

vi.mock('expo-speech', () => ({
  getAvailableVoicesAsync: () => Promise.resolve([{ identifier: 'gb', name: 'Daniel', language: 'en-GB', quality: 'Enhanced' }, { identifier: 'us', name: 'Samantha', language: 'en-US', quality: 'Default' }]),
  speak: (text: string, o: { voice?: string; onDone?: () => void; onStopped?: () => void }) => {
    log.push(`say[${o.voice}] ${text}`);
    finishSpeech = () => o.onDone?.();
  },
  stop: () => log.push('stop'),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, AccessibilityInfo: { isScreenReaderEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove() {} }) } }));
vi.mock('./audio', () => ({ playEffect: (id: string) => log.push(id), duckMusic: (on: boolean) => log.push(on ? 'duck' : 'unduck') }));

const radio = await import('./radioVoice');
const { RADIO_QUIET_MS } = await import('./radio');

const wzz = { callsign: 'WZZ9003', heading: 80, altitude: 6000, speed: 230 };

/** Lets the speech finish and the gaps after it run. */
async function speechEnds() {
  finishSpeech?.();
  finishSpeech = null;
  await vi.advanceTimersByTimeAsync(1000);
}

beforeEach(() => {
  vi.useFakeTimers();
  log.length = 0;
  radio.setRadioEnabled(true);
  radio.setRadioPlanes((id) => (id === '1' ? wzz : undefined));
  radio.setRadioActive(true);
});
afterEach(() => {
  radio.setRadioActive(false);
  radio.resetRadio();
  vi.useRealTimers();
});

describe('radio voice', () => {
  it('after the player stops, the controller calls, then the pilot reads back, each between clicks, with the music ducked', async () => {
    radio.radioCommand('1', { kind: 'altitude', value: 5000 });
    radio.radioCommand('1', { kind: 'altitude', value: 4000 });
    await vi.advanceTimersByTimeAsync(RADIO_QUIET_MS - 200);
    expect(log).toEqual([]);
    await vi.advanceTimersByTimeAsync(400);
    expect(log).toEqual(['duck', 'radioOn', 'say[gb] Wizz Air niner zero zero three, descend to altitude four thousand feet.']);
    await speechEnds();
    expect(log.slice(3)).toEqual(['radioOff', 'radioOn', 'say[us] Descend four thousand feet, Wizz Air niner zero zero three.']);
    await speechEnds();
    expect(log.slice(6)).toEqual(['radioOff', 'unduck']);
  });

  it('says nothing while inactive (paused, fast-forward), and catches up after', async () => {
    radio.setRadioActive(false);
    radio.radioCommand('1', { kind: 'speed', value: 180 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(log).toEqual([]);
    radio.setRadioActive(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(log.some((l) => l.includes('reduce speed one eight zero knots'))).toBe(true);
  });

  it('says nothing with the radio voice switched off', async () => {
    radio.setRadioEnabled(false);
    radio.radioCommand('1', { kind: 'speed', value: 180 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(log.filter((l) => l.startsWith('say'))).toEqual([]);
  });

  it('a reset (new session) stops the call under way: no readback after it', async () => {
    radio.radioCommand('1', { kind: 'heading', value: 40 });
    await vi.advanceTimersByTimeAsync(RADIO_QUIET_MS + 300);
    expect(log.filter((l) => l.startsWith('say'))).toHaveLength(1);
    radio.resetRadio();
    expect(log).toContain('stop');
    await speechEnds();
    await speechEnds();
    expect(log.filter((l) => l.startsWith('say'))).toHaveLength(1);
  });
});
