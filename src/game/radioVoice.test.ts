import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const log: string[] = [];
/** Ends the transmission playing now. */
let finishTransmission: (() => void) | null = null;

vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, AccessibilityInfo: { isScreenReaderEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove() {} }) } }));
vi.mock('./audio', () => ({ duckMusic: (on: boolean) => log.push(on ? 'duck' : 'unduck') }));
vi.mock('./clipPlayer', () => ({
  randomRate: () => 1,
  playTransmission: (segs: { piece: string }[], o: { stopped?: () => boolean }) => {
    log.push(`play ${segs.map((s) => s.piece).join(' + ')}`);
    return new Promise<void>((resolve) => {
      finishTransmission = resolve;
      const poll = setInterval(() => o.stopped?.() && (clearInterval(poll), log.push('cut off'), resolve()), 50);
    });
  },
}));
const take = (t: string) => ({ take: t, ms: 500, file: 0 });
vi.mock('./voiceClips', () => ({
  VOICE_CLIPS: {
    controller: {
      role: 'controller',
      clips: { x_wizz_air_niner_zero_zero_three: [take('m0')], x_descend_to_altitude_four_thousand_feet: [take('m0'), take('f0')], x_descend_altitude_four_thousand_feet: [take('m0'), take('f0')], x_descend_four_thousand_feet: [take('m0'), take('f0')] },
    },
    pilot: {
      role: 'pilot',
      clips: { x_wizz_air_niner_zero_zero_three: [take('f0')], x_descend_four_thousand_feet: [take('m0')], x_down_to_four_thousand_feet: [take('m0')], x_descending_four_thousand_feet: [take('m0')], h_uh: [take('h0')] },
    },
  },
}));
vi.mock('./radioScript', async (orig) => {
  const real = await orig<typeof import('./radioScript')>();
  // No hesitations here: the calls are checked exactly.
  return { ...real, scriptCall: (c: never, clips: never, m: never, rng: never) => real.scriptCall(c, clips, m, rng, { pilot: 0, controller: 0 }) };
});

const radio = await import('./radioVoice');
const { RADIO_QUIET_MS } = await import('./radio');

const wzz = { callsign: 'WZZ9003', heading: 80, altitude: 6000, speed: 230 };

/** Lets the transmission finish and the gaps after it run. */
async function transmissionEnds() {
  finishTransmission?.();
  finishTransmission = null;
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
  it('after the player stops, the controller calls, then the pilot reads back, from the recordings, with the music ducked', async () => {
    radio.radioCommand('1', { kind: 'altitude', value: 5000 });
    radio.radioCommand('1', { kind: 'altitude', value: 4000 });
    await vi.advanceTimersByTimeAsync(RADIO_QUIET_MS - 200);
    expect(log).toEqual([]);
    await vi.advanceTimersByTimeAsync(400);
    expect(log[0]).toBe('duck');
    expect(log[1]).toMatch(/^play x_wizz_air_niner_zero_zero_three \+ x_descend_(to_altitude_|altitude_)?four_thousand_feet$/);
    await transmissionEnds();
    expect(log[2]).toMatch(/^play x_(descend|down_to|descending)_four_thousand_feet \+ x_wizz_air_niner_zero_zero_three$/);
    await transmissionEnds();
    expect(log.slice(3)).toEqual(['unduck']);
  });

  it('says nothing while inactive (paused, fast-forward), and catches up after', async () => {
    radio.setRadioActive(false);
    radio.radioCommand('1', { kind: 'altitude', value: 4000 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(log).toEqual([]);
    radio.setRadioActive(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(log.some((l) => l.startsWith('play x_wizz_air'))).toBe(true);
  });

  it('says nothing with the radio voice switched off', async () => {
    radio.setRadioEnabled(false);
    radio.radioCommand('1', { kind: 'altitude', value: 4000 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(log.filter((l) => l.startsWith('play'))).toEqual([]);
  });

  it("a call it has no recording for isn't said (rather than said in part)", async () => {
    radio.setRadioPlanes((id) => (id === '1' ? { ...wzz, callsign: 'WZZ4' } : undefined));
    radio.radioCommand('1', { kind: 'altitude', value: 4000 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(log).toEqual([]);
  });

  it('a reset (new session) cuts off the call under way: no readback after it', async () => {
    radio.radioCommand('1', { kind: 'altitude', value: 4000 });
    await vi.advanceTimersByTimeAsync(RADIO_QUIET_MS + 300);
    expect(log.filter((l) => l.startsWith('play'))).toHaveLength(1);
    radio.resetRadio();
    await vi.advanceTimersByTimeAsync(2000);
    expect(log).toContain('cut off');
    expect(log.filter((l) => l.startsWith('play'))).toHaveLength(1);
  });
});
