/** 3-digit zero-padded number, e.g. headings ("005") and altitude in hundreds of feet ("070"). */
export const pad3 = (n: number) => String(Math.round(n)).padStart(3, '0');

/** Altitude in hundreds of feet, as shown on radar tags ("070" = 7,000 ft). */
export const altHundreds = (ft: number) => pad3(ft / 100);

/** Sim clock, mm:ss; lives with the session (game logic uses it too), re-exported for the UI. */
export { clock } from '../game/session';
