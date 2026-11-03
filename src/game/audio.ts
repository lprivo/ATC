import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
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
let wantedTrack: MusicTrack | null = null;
let appActive = true;
let started = false;

function start() {
  if (started) return;
  started = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {});
  AppState.addEventListener('change', (s) => {
    appActive = s === 'active';
    if (music) {
      if (appActive && music.player.paused) safe(() => music!.player.play());
      if (!appActive) safe(() => music!.player.pause());
    }
    if (appActive) applyMusic();
  });
}

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
  playEffect(spec.id, spec.volume);
}

/** Plays an effect whatever the Sound effects setting (the radio's own clicks follow the Radio voice setting). */
export function playEffect(id: EffectId, volume: number) {
  if (!appActive) return;
  safe(() => {
    start();
    let p = effects.get(id);
    if (!p) {
      p = createAudioPlayer(EFFECT_FILES[id]);
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
      incoming = createAudioPlayer(MUSIC_FILES[target]);
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
        if (incoming) incoming.volume = MUSIC_VOLUME * duck * v.in;
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
  if (music && !fade) safe(() => (music!.player.volume = MUSIC_VOLUME * duck));
}

function stop(p: AudioPlayer) {
  safe(() => {
    p.pause();
    p.remove();
  });
}
