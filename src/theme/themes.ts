import type { TextStyle } from 'react-native';

/**
 * Every colour, font and the main radar glyph size comes from here. Layout
 * sizes (panel, buttons) still live in the component StyleSheets. To restyle
 * the game, add a new Theme object or edit one; components never hard-code
 * colours.
 *
 * Values follow the Privo ATC design handoff (docs/design/README.md, "Design tokens").
 */
export interface ThemeColors {
  background: string;
  rangeRing: string;
  /** Extended runway centrelines. */
  centreline: string;
  runway: string;
  runwayLabel: string;
  fix: string;
  fixLabel: string;
  plane: string;
  planeSelected: string;
  planeConflict: string;
  trail: string;
  route: string;
  routeCleared: string;
  routeDraft: string;
  panel: string;
  panelBorder: string;
  text: string;
  textDim: string;
  accent: string;
  danger: string;
  good: string;
  button: string;
  buttonPressed: string;
  buttonText: string;
  /** Solid backing behind radar data blocks. */
  labelBg: string;
  /** Runway snap highlight while drawing a path. */
  snapHalo: string;
  /** Text and icons drawn on a `danger` fill. */
  onDanger: string;
  /** Dims the radar behind menus and coach marks. */
  scrim: string;
  /** Radar sweep on the splash and menu. */
  sweep: string;
}

/** Font family names registered by `useAppFonts` (one family per weight, which works on every platform). */
export const FONT_FAMILY = {
  condensed400: 'BarlowCondensed_400Regular',
  condensed500: 'BarlowCondensed_500Medium',
  condensed600: 'BarlowCondensed_600SemiBold',
  body400: 'Barlow_400Regular',
  body500: 'Barlow_500Medium',
  body600: 'Barlow_600SemiBold',
  body700: 'Barlow_700Bold',
} as const;

/** A text style token. A subset of TextStyle, so it can be spread straight into a style. */
export type TypeToken = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontVariant'>;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];
/** Letter spacing in the design is given in em; React Native wants points. */
const em = (size: number, ems: number) => Math.round(size * ems * 100) / 100;

/** Names of the UI type-scale tokens. */
export type TypeTokenName =
  | 'display'
  | 'score'
  | 'title'
  | 'stepperValue'
  | 'callsign'
  | 'button'
  | 'buttonLarge'
  | 'barTitle'
  | 'barValue'
  | 'barCount'
  | 'chip'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'smallTight'
  | 'caps'
  | 'capsSmall';

export type ThemeType = Record<TypeTokenName, TypeToken>;

const type: ThemeType = {
  display: { fontFamily: FONT_FAMILY.condensed600, fontSize: 96, lineHeight: 86, fontVariant: tabular },
  /** Pause-menu score. */
  score: { fontFamily: FONT_FAMILY.condensed600, fontSize: 64, lineHeight: 64, fontVariant: tabular },
  title: { fontFamily: FONT_FAMILY.condensed600, fontSize: 28, lineHeight: 30 },
  stepperValue: { fontFamily: FONT_FAMILY.condensed600, fontSize: 34, lineHeight: 36, fontVariant: tabular },
  callsign: { fontFamily: FONT_FAMILY.condensed600, fontSize: 26, lineHeight: 28, letterSpacing: em(26, 0.02) },
  button: { fontFamily: FONT_FAMILY.condensed600, fontSize: 18, letterSpacing: em(18, 0.04) },
  buttonLarge: { fontFamily: FONT_FAMILY.condensed600, fontSize: 24, letterSpacing: em(24, 0.06) },
  /** Top-bar airport code. */
  barTitle: { fontFamily: FONT_FAMILY.condensed600, fontSize: 19, letterSpacing: em(19, 0.03) },
  /** Top-bar clock. */
  barValue: { fontFamily: FONT_FAMILY.condensed500, fontSize: 17, fontVariant: tabular },
  /** Top-bar counters and segmented-control labels. */
  barCount: { fontFamily: FONT_FAMILY.condensed600, fontSize: 16, fontVariant: tabular },
  /** Small condensed chips (status, toast kind). */
  chip: { fontFamily: FONT_FAMILY.condensed600, fontSize: 12, letterSpacing: em(12, 0.08) },
  body: { fontFamily: FONT_FAMILY.body400, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: FONT_FAMILY.body500, fontSize: 14 },
  small: { fontFamily: FONT_FAMILY.body500, fontSize: 13, lineHeight: 17 },
  smallTight: { fontFamily: FONT_FAMILY.body500, fontSize: 12, fontVariant: tabular },
  caps: { fontFamily: FONT_FAMILY.body600, fontSize: 11, letterSpacing: em(11, 0.12) },
  capsSmall: { fontFamily: FONT_FAMILY.body600, fontSize: 10, letterSpacing: em(10, 0.12) },
};

/** Radar (SVG) text: weight-specific family and size (before `labelScale` for data blocks). */
export interface RadarFont {
  fontFamily: string;
  fontSize: number;
  letterSpacing?: number;
}

export interface ThemeRadarFonts {
  /** Data block line 1 (callsign); scaled by labelScale. */
  label: RadarFont;
  /** Data block line 2 (altitude, speed); scaled by labelScale. */
  label2: RadarFont;
  /** Data block line height; scaled by labelScale. */
  labelLineHeight: number;
  fix: RadarFont;
  runway: RadarFont;
  chip: RadarFont;
}

const radarFont: ThemeRadarFonts = {
  /** Data block line 1 (callsign); scaled by labelScale. */
  label: { fontFamily: FONT_FAMILY.condensed600, fontSize: 13 },
  /** Data block line 2 (altitude, speed); scaled by labelScale. */
  label2: { fontFamily: FONT_FAMILY.condensed500, fontSize: 12 },
  /** Data block line height; scaled by labelScale. */
  labelLineHeight: 15,
  fix: { fontFamily: FONT_FAMILY.condensed500, fontSize: 10, letterSpacing: em(10, 0.06) },
  runway: { fontFamily: FONT_FAMILY.condensed600, fontSize: 11 },
  chip: { fontFamily: FONT_FAMILY.condensed600, fontSize: 10 },
};

/** Radar glyph sizes in points (pt). "nm" values are converted with the current zoom. */
export interface ThemeSize {
  planeSymbol: number;
  planeStroke: number;
  selectBracket: number;
  selectBracketArm: number;
  hitTarget: number;
  hitRadius: number;
  headingVectorMinutes: number;
  headingVectorMin: number;
  conflictRingNm: number;
  conflictRingMin: number;
  labelOffsetNear: number;
  labelOffsetFar: number;
  snapRadius: number;
  loupeRadius: number;
  loupeZoom: number;
  trailDots: number;
  trailDotRadius: number;
}

const size: ThemeSize = {
  /** Side of the plane square. */
  planeSymbol: 11,
  planeStroke: 1.5,
  /** Selected-plane corner brackets: box side and arm length. */
  selectBracket: 26,
  selectBracketArm: 5,
  /** Touch target around a plane symbol: nominal 44 pt, hit-tested with a 24 pt radius (design). */
  hitTarget: 44,
  hitRadius: 24,
  /** Heading vector: this many minutes of flight, at least `headingVectorMin` pt. */
  headingVectorMinutes: 1,
  headingVectorMin: 14,
  /** Conflict ring radius: max(conflictRingNm, conflictRingMin pt). */
  conflictRingNm: 1.5,
  conflictRingMin: 16,
  /** Label distance from the symbol: near ring and far ring (with a leader line). */
  labelOffsetNear: 12,
  labelOffsetFar: 30,
  /** Snap distance to a runway threshold while drawing. */
  snapRadius: 28,
  loupeRadius: 62,
  loupeZoom: 2.2,
  trailDots: 5,
  trailDotRadius: 1.5,
};

/** labelScale per "Label size" setting. */
export const LABEL_SCALE = { S: 0.92, M: 1, L: 1.15 } as const;
export type LabelSize = keyof typeof LABEL_SCALE;

/**
 * A complete theme. Plain data (no functions), so a theme can later be served by
 * a backend and validated against this shape. Corners are always square
 * (blueprint style), so there is no radius token.
 */
export interface Theme {
  id: string;
  name: string;
  statusBar: 'light' | 'dark';
  colors: ThemeColors;
  type: ThemeType;
  radarFont: ThemeRadarFonts;
  size: ThemeSize;
  /** Hairline border width. */
  hairline: number;
}

/** Everything the bundled themes share; each theme only spells out what differs. */
const shared = { type, radarFont, size, hairline: 1 } satisfies Pick<Theme, 'type' | 'radarFont' | 'size' | 'hairline'>;

export const radarTheme: Theme = {
  id: 'radar',
  name: 'Radar',
  statusBar: 'light',
  colors: {
    background: '#0f1b26',
    rangeRing: '#22364a',
    centreline: '#34506b',
    runway: '#e8eef4',
    runwayLabel: '#b5d9fd',
    fix: '#5f7f9e',
    fixLabel: '#8aa6c1',
    plane: '#d6ebff',
    planeSelected: '#ffffff',
    planeConflict: '#ffb547',
    trail: '#4f7090',
    route: '#94bce3',
    routeCleared: '#6fe3c6',
    routeDraft: '#ffffff',
    panel: '#162534',
    panelBorder: '#2c455d',
    text: '#eef6ff',
    textDim: '#97adc2',
    accent: '#749dc4',
    danger: '#ffb547',
    good: '#6fe3c6',
    button: '#1f3245',
    buttonPressed: '#2c455d',
    buttonText: '#eef6ff',
    labelBg: 'rgba(15,27,38,0.84)',
    snapHalo: '#b5d9fd',
    onDanger: '#1a1206',
    scrim: 'rgba(6,12,18,0.72)',
    sweep: 'rgba(148,188,227,0.30)',
  },
  ...shared,
};

export const paperTheme: Theme = {
  id: 'paper',
  name: 'Paper',
  statusBar: 'dark',
  colors: {
    background: '#f2f2f3',
    rangeRing: '#d4d4d7',
    centreline: '#a9b0b7',
    runway: '#1d1f20',
    runwayLabel: '#2c455d',
    fix: '#7a7a7d',
    fixLabel: '#5d5d60',
    plane: '#1d2d3d',
    planeSelected: '#000000',
    planeConflict: '#c2410c',
    trail: '#a9b3bd',
    route: '#597ea3',
    routeCleared: '#0b7a63',
    routeDraft: '#1d1f20',
    panel: '#e9e9ea',
    panelBorder: '#cfcfd2',
    text: '#1d1f20',
    textDim: '#5d5d60',
    accent: '#5980a6',
    danger: '#c2410c',
    good: '#0b7a63',
    button: '#f5f5f8',
    buttonPressed: '#d6ebff',
    buttonText: '#1d1f20',
    labelBg: 'rgba(242,242,243,0.88)',
    snapHalo: '#416180',
    onDanger: '#ffffff',
    scrim: 'rgba(29,31,32,0.45)',
    sweep: 'rgba(89,128,166,0.22)',
  },
  ...shared,
  // Daylight: radar data blocks go to weight 600 for legibility (design note).
  radarFont: { ...radarFont, label2: { ...radarFont.label2, fontFamily: FONT_FAMILY.condensed600 } },
};

export const themes = [radarTheme, paperTheme];
