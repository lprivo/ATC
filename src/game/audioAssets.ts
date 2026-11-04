// Bundled audio files (placeholders from scripts/placeholder-audio.py until the
// real assets land; see assets/audio/README.md). Kept apart from audio.ts so
// tests can stub the require()s.
import type { EffectId, MusicTrack } from './sound';

export const EFFECT_FILES: Record<EffectId, number> = {
  select: require('../../assets/audio/select.wav'),
  step: require('../../assets/audio/step.wav'),
  limit: require('../../assets/audio/limit.wav'),
  drawStart: require('../../assets/audio/drawStart.wav'),
  snap: require('../../assets/audio/snap.wav'),
  cleared: require('../../assets/audio/cleared.wav'),
  conflict: require('../../assets/audio/conflict.wav'),
  landed: require('../../assets/audio/landed.wav'),
  goAround: require('../../assets/audio/goAround.wav'),
  lastMinute: require('../../assets/audio/lastMinute.wav'),
  sessionOver: require('../../assets/audio/sessionOver.wav'),
  radioOn: require('../../assets/audio/radioOn.wav'),
  radioOff: require('../../assets/audio/radioOff.wav'),
};

export const MUSIC_FILES: Record<MusicTrack, number> = {
  menu: require('../../assets/audio/menu.wav'),
  zen: require('../../assets/audio/zen.wav'),
};
