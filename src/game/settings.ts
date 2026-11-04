// Player settings (design S4) and their defaults. Pure: no React or storage,
// so it can be tested and later overlaid by remote config.
import type { LabelSize } from '../theme/themes';
import type { LabelMode } from '../ui/labels';
import type { InGameAudio } from './sound';

export type Handedness = 'right' | 'left';
export type AltUnit = 'ft' | 'm';
export type DistUnit = 'nm' | 'km';

export interface Settings {
  /** Theme id ('radar' | 'paper'); ignored while followSystem is on. */
  theme: string;
  /** Use Paper in light mode and Radar in dark mode. */
  followSystem: boolean;
  /** Sound effects (game moments). */
  sound: boolean;
  /** Menu music and the in-game background. */
  music: boolean;
  /** In a session: the calm Zen loop, or the radio room. */
  inGameAudio: InGameAudio;
  /** Spoken calls and pilot readbacks for the player's commands. */
  radioVoice: boolean;
  /** Volumes, 0–1, on top of the game's own mix: sound effects, music, and the radio (calls, readbacks and their clicks). */
  soundVolume: number;
  musicVolume: number;
  radioVolume: number;
  haptics: boolean;
  /** Controls on the left mirrors the sheet and re-centre for left-handed play. */
  handedness: Handedness;
  altUnit: AltUnit;
  distUnit: DistUnit;
  labelMode: LabelMode;
  labelSize: LabelSize;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'radar',
  followSystem: false,
  sound: true,
  music: true,
  inGameAudio: 'zen',
  radioVoice: true,
  soundVolume: 1,
  musicVolume: 1,
  radioVolume: 1,
  haptics: true,
  handedness: 'right',
  altUnit: 'ft',
  distUnit: 'nm',
  labelMode: 'auto',
  labelSize: 'M',
};

/** Stored settings JSON → a complete, valid Settings (unknown or bad fields fall back to defaults). */
export function parseSettings(json: string | null): Settings {
  if (!json) return DEFAULT_SETTINGS;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const r = raw as Record<string, unknown>;
  const pick = <T,>(key: keyof Settings, ok: readonly T[]): T => (ok.includes(r[key] as T) ? (r[key] as T) : (DEFAULT_SETTINGS[key] as T));
  const volume = (key: keyof Settings): number => (typeof r[key] === 'number' && Number.isFinite(r[key]) ? Math.min(1, Math.max(0, r[key] as number)) : (DEFAULT_SETTINGS[key] as number));
  const bool = (key: keyof Settings): boolean => (typeof r[key] === 'boolean' ? (r[key] as boolean) : (DEFAULT_SETTINGS[key] as boolean));
  return {
    theme: typeof r.theme === 'string' ? r.theme : DEFAULT_SETTINGS.theme,
    followSystem: bool('followSystem'),
    sound: bool('sound'),
    music: bool('music'),
    inGameAudio: pick('inGameAudio', ['zen', 'radio'] as const),
    radioVoice: bool('radioVoice'),
    soundVolume: volume('soundVolume'),
    musicVolume: volume('musicVolume'),
    radioVolume: volume('radioVolume'),
    haptics: bool('haptics'),
    handedness: pick('handedness', ['right', 'left'] as const),
    altUnit: pick('altUnit', ['ft', 'm'] as const),
    distUnit: pick('distUnit', ['nm', 'km'] as const),
    labelMode: pick('labelMode', ['auto', 'full', 'min'] as const),
    labelSize: pick('labelSize', ['S', 'M', 'L'] as const),
  };
}

/** The theme to use: with followSystem, Paper in light mode and Radar in dark mode. */
export const effectiveTheme = (s: Settings, systemScheme: 'light' | 'dark' | null | undefined) =>
  s.followSystem ? (systemScheme === 'light' ? 'paper' : 'radar') : s.theme;

// ---- units -----------------------------------------------------------------

const M_PER_FT = 0.3048;
const KM_PER_NM = 1.852;

/** An altitude for display, e.g. "7,000 ft" → "2,130 m" (metres rounded to 10). */
export function formatAltitude(ft: number, unit: AltUnit, withUnit = false) {
  const v = unit === 'm' ? Math.round((ft * M_PER_FT) / 10) * 10 : Math.round(ft);
  return v.toLocaleString('en-GB') + (withUnit ? ` ${unit}` : '');
}

/** A distance for display, one decimal: "2.7 nm" / "5.0 km". */
export function formatDistance(nm: number, unit: DistUnit) {
  const v = unit === 'km' ? nm * KM_PER_NM : nm;
  return `${(Math.floor(v * 10) / 10).toFixed(1)} ${unit}`;
}

/**
 * Vertical separation of a conflict, rounded down (100 ft / 10 m) so it never
 * reads as the 1,000 ft (≈305 m) minimum it is breaking: "400 ft" / "120 m".
 */
export function conflictAltitude(altFt: number, unit: AltUnit) {
  return unit === 'm' ? `${Math.floor((altFt * M_PER_FT) / 10) * 10} m` : `${Math.floor(altFt / 100) * 100} ft`;
}

/** Caps label for the altitude stepper / cells. */
export const altLabel = (u: AltUnit) => (u === 'm' ? 'ALT M' : 'ALT FT');
