// What the game sounds like (issue #49): which effect each game moment plays,
// which music plays where, and how music fades between tracks. Pure data and
// functions (no React / React Native / expo-audio imports), so it can be
// tested and later tuned from a backend. The player is `audio.ts`.
import type { SimEvent } from '../engine/types';
import type { HapticMoment } from './hapticMap';

/** A moment that makes a sound: every haptic moment (the player did something), plus things the game does by itself. */
export type SoundMoment =
  | HapticMoment
  /** A plane landed. */
  | 'landed'
  /** A plane went around. */
  | 'goAround'
  /** The session's last minute began. */
  | 'lastMinute'
  /** The session reached its length. */
  | 'sessionOver';

/** An effect file in assets/audio (see `audioAssets.ts`). */
export type EffectId = 'select' | 'step' | 'limit' | 'drawStart' | 'snap' | 'cleared' | 'conflict' | 'landed' | 'goAround' | 'lastMinute' | 'sessionOver';

export interface EffectSpec {
  id: EffectId;
  /** 0–1. Frequent sounds (stepper steps) sit well under the rest. */
  volume: number;
}

export const SOUND_FOR: Readonly<Record<SoundMoment, EffectSpec>> = {
  select: { id: 'select', volume: 0.5 },
  step: { id: 'step', volume: 0.25 },
  limit: { id: 'limit', volume: 0.5 },
  drawStart: { id: 'drawStart', volume: 0.5 },
  snap: { id: 'snap', volume: 0.6 },
  landingConfirmed: { id: 'cleared', volume: 0.6 },
  conflict: { id: 'conflict', volume: 0.8 },
  landed: { id: 'landed', volume: 0.6 },
  goAround: { id: 'goAround', volume: 0.6 },
  lastMinute: { id: 'lastMinute', volume: 0.6 },
  sessionOver: { id: 'sessionOver', volume: 0.7 },
};

/** The sim's own events that play a sound (a landing, a go-around). Conflicts sound once per new pair, from the HUD. */
const EVENT_SOUND: Partial<Record<SimEvent['kind'], SoundMoment>> = { landed: 'landed', goAround: 'goAround' };

/** Sounds for the events after `lastSeq`, at most one of each kind (a burst of landings plays once). */
export function eventSounds(events: readonly SimEvent[], lastSeq: number): SoundMoment[] {
  const out: SoundMoment[] = [];
  for (const e of events) {
    const m = e.seq > lastSeq ? EVENT_SOUND[e.kind] : undefined;
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

// ---- music ------------------------------------------------------------------------

/** A music loop in assets/audio. */
export type MusicTrack = 'menu' | 'zen';

/** Music volume (0–1): under the effects. */
export const MUSIC_VOLUME = 0.45;
/** A change of track fades out and in over this long. */
export const MUSIC_FADE_MS = 1200;

/** Routes with a live game play the in-game loop; everything else (splash, menu, settings, summary) the menu track. */
export function musicForRoute(pathname: string): MusicTrack {
  const route = pathname.split('?')[0].replace(/\/+$/, '');
  return route === '/game' || route === '/tutorial' ? 'zen' : 'menu';
}

/** Volume of the outgoing and incoming tracks `elapsedMs` into a fade (equal-power, so the mix doesn't dip in the middle). */
export function crossfade(elapsedMs: number, fadeMs = MUSIC_FADE_MS): { out: number; in: number } {
  const x = fadeMs <= 0 ? 1 : Math.min(1, Math.max(0, elapsedMs / fadeMs));
  return { out: Math.cos((x * Math.PI) / 2), in: Math.sin((x * Math.PI) / 2) };
}
