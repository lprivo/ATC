import { Platform } from 'react-native';

/**
 * Every colour, the fonts and the main radar glyph sizes come from here
 * (layout sizes and fine stroke details are still in the components). To restyle the game, add a
 * new Theme object (or edit one) — components never hard-code colours.
 */
export interface Theme {
  name: string;
  statusBar: 'light' | 'dark';
  colors: {
    background: string;
    rangeRing: string;
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
  };
  font: { mono: string };
  size: {
    blip: number;
    tagFont: number;
    labelFont: number;
    /** Leader line length in minutes of flight. */
    leaderMinutes: number;
  };
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' });

export const radarTheme: Theme = {
  name: 'Radar',
  statusBar: 'light',
  colors: {
    background: '#0b1f26',
    rangeRing: '#1d3a44',
    runway: '#c9d6db',
    runwayLabel: '#7f9aa3',
    fix: '#3f6b78',
    fixLabel: '#4f7f8c',
    plane: '#5dffa0',
    planeSelected: '#ffffff',
    planeConflict: '#ff4d4d',
    trail: '#3a8a64',
    route: '#5ac8ff',
    routeCleared: '#ffd34d',
    routeDraft: '#ffffff',
    panel: '#10282f',
    panelBorder: '#21434d',
    text: '#d8e6ea',
    textDim: '#7f9aa3',
    accent: '#5dffa0',
    danger: '#ff4d4d',
    good: '#5dffa0',
    button: '#183840',
    buttonPressed: '#24525d',
    buttonText: '#d8e6ea',
  },
  font: { mono },
  size: { blip: 7, tagFont: 11, labelFont: 9, leaderMinutes: 1 },
};

export const paperTheme: Theme = {
  name: 'Paper',
  statusBar: 'dark',
  colors: {
    background: '#f4f1ea',
    rangeRing: '#ddd6c8',
    runway: '#333333',
    runwayLabel: '#777777',
    fix: '#9a9282',
    fixLabel: '#8a8272',
    plane: '#1f5fbf',
    planeSelected: '#000000',
    planeConflict: '#d62828',
    trail: '#9db6dc',
    route: '#1f9bbf',
    routeCleared: '#d98e04',
    routeDraft: '#000000',
    panel: '#ffffff',
    panelBorder: '#ddd6c8',
    text: '#222222',
    textDim: '#777777',
    accent: '#1f5fbf',
    danger: '#d62828',
    good: '#2a9d4b',
    button: '#ece7dc',
    buttonPressed: '#d8d0c0',
    buttonText: '#222222',
  },
  font: { mono },
  size: { blip: 7, tagFont: 11, labelFont: 9, leaderMinutes: 1 },
};

export const themes = [radarTheme, paperTheme];
