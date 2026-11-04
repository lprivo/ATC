import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakePlayer {
  src: unknown;
  volume: number;
  loop: boolean;
  paused: boolean;
  currentTime: number;
  removed: boolean;
  plays: number;
  play(): void;
  pause(): void;
  remove(): void;
  seekTo(s: number): Promise<void>;
}
const players: FakePlayer[] = [];
const modes: unknown[] = [];
const sessionActive: boolean[] = [];
const playerOptions: unknown[] = [];
let appStateListener: ((s: string) => void) | null = null;

vi.mock('expo-audio', () => ({
  setAudioModeAsync: (m: unknown) => (modes.push(m), Promise.resolve()),
  setIsAudioActiveAsync: (on: boolean) => (sessionActive.push(on), Promise.resolve()),
  createAudioPlayer: (src: unknown, options?: unknown) => {
    playerOptions.push(options);
    const p: FakePlayer = {
      src,
      volume: 1,
      loop: false,
      paused: true,
      currentTime: 0,
      removed: false,
      plays: 0,
      play() {
        this.paused = false;
        this.plays++;
        this.currentTime = 0.1;
      },
      pause() {
        this.paused = true;
      },
      remove() {
        this.removed = true;
      },
      seekTo() {
        this.currentTime = 0;
        return Promise.resolve();
      },
    };
    players.push(p);
    return p;
  },
}));
vi.mock('react-native', () => ({ AppState: { addEventListener: (_: string, f: (s: string) => void) => ((appStateListener = f), { remove() {} }) } }));
vi.mock('./audioAssets', () => ({
  EFFECT_FILES: new Proxy({}, { get: (_, k) => `fx:${String(k)}` }),
  MUSIC_FILES: { menu: 'music:menu', zen: 'music:zen' },
}));

const audio = await import('./audio');
const { MUSIC_FADE_MS, MUSIC_VOLUME, SOUND_FOR } = await import('./sound');

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  audio.setMusicTrack(null);
  vi.advanceTimersByTime(MUSIC_FADE_MS * 2);
  vi.useRealTimers();
  players.length = 0;
  audio.setEffectsEnabled(true);
  audio.setMusicEnabled(true);
  audio.setEffectsVolume(1);
  audio.setMusicVolume(1);
});

describe('effects', () => {
  it('sets the audio mode once: mix with other apps, quiet with the mute switch', () => {
    audio.playSound('select');
    audio.playSound('snap');
    expect(modes).toEqual([{ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }]);
  });

  it("plays the moment's effect at its volume, reusing one player per effect", async () => {
    audio.playSound('step');
    const step = players.find((p) => p.src === 'fx:step')!;
    expect(step.plays).toBe(1);
    expect(step.volume).toBe(SOUND_FOR.step.volume);
    audio.playSound('step'); // plays again from the start
    await Promise.resolve();
    expect(players.filter((p) => p.src === 'fx:step')).toHaveLength(1);
    expect(step.plays).toBe(2);
    audio.playSound('landingConfirmed');
    expect(players.some((p) => p.src === 'fx:cleared')).toBe(true);
  });

  it("follows the player's effects volume, on top of each effect's own", () => {
    audio.setEffectsVolume(0.5);
    audio.playSound('landed');
    expect(players.find((p) => p.src === 'fx:landed')!.volume).toBeCloseTo(SOUND_FOR.landed.volume * 0.5);
  });

  it('plays nothing with effects switched off', () => {
    audio.setEffectsEnabled(false);
    audio.playSound('conflict');
    expect(players.filter((p) => p.src === 'fx:conflict')).toHaveLength(0);
  });
});

describe('music', () => {
  const tracks = () => players.filter((p) => String(p.src).startsWith('music:'));

  it('fades the wanted track in on a loop, and crossfades to a new one', () => {
    audio.setMusicTrack('menu');
    const menu = tracks()[0];
    expect(menu).toMatchObject({ src: 'music:menu', loop: true, volume: 0, paused: false });
    vi.advanceTimersByTime(MUSIC_FADE_MS + 100);
    expect(menu.volume).toBeCloseTo(MUSIC_VOLUME);

    audio.setMusicTrack('zen');
    const zen = tracks()[1];
    vi.advanceTimersByTime(MUSIC_FADE_MS / 2);
    expect(menu.volume).toBeGreaterThan(0);
    expect(zen.volume).toBeGreaterThan(0);
    vi.advanceTimersByTime(MUSIC_FADE_MS);
    expect(zen.volume).toBeCloseTo(MUSIC_VOLUME);
    expect(menu.removed).toBe(true);
  });

  it("follows the player's music volume, at once and through a fade, and under a radio call", () => {
    audio.setMusicTrack('menu');
    vi.advanceTimersByTime(MUSIC_FADE_MS + 100);
    const menu = tracks()[0];
    audio.setMusicVolume(0.5);
    expect(menu.volume).toBeCloseTo(MUSIC_VOLUME * 0.5);
    audio.duckMusic(true);
    expect(menu.volume).toBeLessThan(MUSIC_VOLUME * 0.5);
    audio.duckMusic(false);
    audio.setMusicTrack('zen');
    vi.advanceTimersByTime(MUSIC_FADE_MS + 100);
    expect(tracks()[1].volume).toBeCloseTo(MUSIC_VOLUME * 0.5);
  });

  it('asking for the track already playing changes nothing', () => {
    audio.setMusicTrack('menu');
    audio.setMusicTrack('menu');
    expect(tracks()).toHaveLength(1);
  });

  it('switching music off fades it out; on again brings the wanted track back', () => {
    audio.setMusicTrack('zen');
    vi.advanceTimersByTime(MUSIC_FADE_MS + 100);
    audio.setMusicEnabled(false);
    vi.advanceTimersByTime(MUSIC_FADE_MS + 100);
    expect(tracks()[0].removed).toBe(true);
    audio.setMusicEnabled(true);
    expect(tracks()[1]).toMatchObject({ src: 'music:zen', paused: false });
  });

  it('a new change mid-fade finishes the old fade at once, so at most two tracks play', () => {
    audio.setMusicTrack('menu');
    vi.advanceTimersByTime(MUSIC_FADE_MS + 100);
    audio.setMusicTrack('zen');
    vi.advanceTimersByTime(MUSIC_FADE_MS / 3);
    audio.setMusicTrack('menu');
    const [menu1, zen, menu2] = tracks();
    expect(menu1.removed).toBe(true);
    expect(zen.removed).toBe(false); // now fading out
    expect(menu2.paused).toBe(false);
    vi.advanceTimersByTime(MUSIC_FADE_MS + 100);
    expect(zen.removed).toBe(true);
    expect(menu2.volume).toBeCloseTo(MUSIC_VOLUME);
  });

  it('pauses in the background and resumes when the app is back, once audio is on again', async () => {
    audio.setMusicTrack('menu');
    const menu = tracks()[0];
    appStateListener!('background');
    expect(menu.paused).toBe(true);
    audio.playSound('select');
    expect(players.some((p) => p.src === 'fx:select' && p.plays > 0)).toBe(false);
    appStateListener!('active');
    expect(menu.paused).toBe(true); // expo-audio would ignore play() until then
    await Promise.resolve();
    await Promise.resolve();
    expect(menu.paused).toBe(false);
  });

  it("a moment's 'inactive' (launch, Control Centre) pauses and resumes at once, without switching audio off", () => {
    audio.setMusicTrack('menu');
    const menu = tracks()[0];
    sessionActive.length = 0;
    appStateListener!('inactive');
    expect(menu.paused).toBe(true);
    appStateListener!('active');
    expect(menu.paused).toBe(false);
    expect(sessionActive).toEqual([]);
  });

  it('keeps the audio session on while the app is open (so the volume buttons control the game, not the ringer), and lets it go in the background', () => {
    audio.setMusicTrack('menu');
    audio.playSound('select');
    expect(playerOptions.length).toBeGreaterThan(1);
    for (const o of playerOptions) expect(o).toEqual({ keepAudioSessionActive: true });
    sessionActive.length = 0;
    appStateListener!('background');
    appStateListener!('active');
    expect(sessionActive).toEqual([false, true]);
  });
});
