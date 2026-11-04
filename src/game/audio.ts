import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';
import { EFFECT_FILES, MUSIC_FILES } from './audioAssets';
import { crossfade, MUSIC_FADE_MS, MUSIC_VOLUME, SOUND_FOR, type EffectId, type MusicTrack, type SoundMoment } from './sound';

/**
 * The game's audio player (issue #49): effects for game moments and one
 * looping music track at a time, faded between. Module state, like haptics:
 * the settings switch it on and off (`setEffectsEnabled`, `setMusicEnabled`),
 * the root layout says which track the screen wants (`setMusicTrack`).
 *
 * Plays nicely with the phone: mixes with the player's own audio instead of
 * stopping it, stays quiet with the mute switch, and pauses the music while
 * the app is in the background. Failures (no audio device, a browser that
 * blocks autoplay) are ignored: sound is never worth a crash.
 */

let effectsOn = true;
let musicOn = true;
/** The player's volumes (Settings), on top of the game's own mix. */
let effectsVolume = 1;
let musicVolume = 1;
let wantedTrack: MusicTrack | null = null;
let appActive = true;
let started = false;
/** Audio was switched off for the background (`setIsAudioActiveAsync(false)`). */
let audioOff = false;

function start() {
  if (started) return;
  started = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
  AppState.addEventListener('change', (s) => {
    appActive = s === 'active';
    if (!appActive && music) safe(() => music!.player.pause());
    // The players keep the audio session on while the app is open (`KEEP_SESSION`); let it go in the background
    // only (not for a moment's 'inactive': launch, Control Centre, a notification). Coming back, resume once audio
    // is on again: until then expo-audio ignores play().
    if (s === 'background') {
      audioOff = true;
      setIsAudioActiveAsync(false).catch(() => {});
    }
    if (!appActive) return;
    const resume = () => {
      if (!appActive) return;
      if (music?.player.paused) safe(() => music!.player.play());
      applyMusic();
    };
    if (!audioOff) return resume();
    audioOff = false;
    setIsAudioActiveAsync(true).then(resume, resume);
  });
}

/**
 * Every player keeps the iOS audio session on after it finishes. Otherwise
 * expo-audio switches the session off whenever nothing is playing (between
 * two radio phrases, or two effects): the volume buttons then change the
 * ringer instead of the game, and switching it on again can stutter the next
 * sound's start.
 */
export const KEEP_SESSION = { keepAudioSessionActive: true } as const;

const safe = (f: () => void) => {
  try {
    f();
  } catch {
    // Sound is best effort.
  }
};

// ---- effects ------------------------------------------------------------------

const effects = new Map<EffectId, AudioPlayer>();

export const setEffectsEnabled = (on: boolean) => {
  effectsOn = on;
};

/** Plays the effect for a game moment (from the start, if it's still playing). Off with the Sound effects setting. */
export function playSound(moment: SoundMoment) {
  if (!effectsOn) return;
  const spec = SOUND_FOR[moment];
  playEffect(spec.id, spec.volume * effectsVolume);
}

/** Plays an effect whatever the Sound effects setting (the radio's own clicks follow the Radio voice setting). */
export function playEffect(id: EffectId, volume: number) {
  if (!appActive) return;
  safe(() => {
    start();
    let p = effects.get(id);
    if (!p) {
      p = createAudioPlayer(EFFECT_FILES[id], KEEP_SESSION);
      effects.set(id, p);
    }
    const player = p;
    player.volume = volume;
    if (player.currentTime > 0) player.seekTo(0).then(() => player.play(), () => {});
    else player.play();
  });
}

// ---- music ----------------------------------------------------------------------

/** The track playing (or fading in), and the one fading out. */
let music: { track: MusicTrack; player: AudioPlayer } | null = null;
let fade: { outgoing: AudioPlayer | null; timer: ReturnType<typeof setInterval> } | null = null;
/** Music sits lower under a radio call. */
let duck = 1;
const DUCKED = 0.35;
const FADE_TICK_MS = 50;

const musicLevel = () => MUSIC_VOLUME * musicVolume * duck;

/** The player's sound effects volume, 0–1. */
export function setEffectsVolume(v: number) {
  effectsVolume = v;
}

/** The player's music volume, 0–1: the track playing follows at once. */
export function setMusicVolume(v: number) {
  musicVolume = v;
  if (music && !fade) safe(() => (music!.player.volume = musicLevel()));
}

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  applyMusic();
}

/** The track the current screen wants (null: none). */
export function setMusicTrack(track: MusicTrack | null) {
  wantedTrack = track;
  applyMusic();
}

function applyMusic() {
  const target = musicOn ? wantedTrack : null;
  if ((music?.track ?? null) === target) return;
  safe(() => {
    start();
    // A fade still running finishes at once: only two tracks are ever heard together.
    if (fade) {
      clearInterval(fade.timer);
      if (fade.outgoing) stop(fade.outgoing);
      fade = null;
    }
    // The track playing now fades out from wherever it is (it may itself be part-way through fading in).
    const outgoing = music?.player ?? null;
    const outFrom = outgoing ? outgoing.volume : 0;
    let incoming: AudioPlayer | null = null;
    if (target) {
      incoming = createAudioPlayer(MUSIC_FILES[target], KEEP_SESSION);
      incoming.loop = true;
      incoming.volume = 0;
      if (appActive) incoming.play();
    }
    music = target && incoming ? { track: target, player: incoming } : null;
    const began = Date.now();
    const timer = setInterval(() => {
      const v = crossfade(Date.now() - began, MUSIC_FADE_MS);
      safe(() => {
        if (outgoing) outgoing.volume = outFrom * v.out;
        if (incoming) incoming.volume = musicLevel() * v.in;
      });
      if (v.in >= 1) {
        clearInterval(timer);
        if (outgoing) stop(outgoing);
        fade = null;
      }
    }, FADE_TICK_MS);
    fade = { outgoing, timer };
  });
}

/** Lowers the music under a radio call (and back). */
export function duckMusic(on: boolean) {
  duck = on ? DUCKED : 1;
  // A fade in progress picks the new level up on its next tick.
  if (music && !fade) safe(() => (music!.player.volume = musicLevel()));
}

function stop(p: AudioPlayer) {
  safe(() => {
    p.pause();
    p.remove();
  });
}
