/** 3-digit zero-padded number, e.g. headings ("005") and altitude in hundreds of feet ("070"). */
export const pad3 = (n: number) => String(Math.round(n)).padStart(3, '0');

/** Feet with thousands separators, e.g. "7,000". */
export const feet = (n: number) => Math.round(n).toLocaleString('en-GB');

/** Altitude in hundreds of feet, as shown on radar tags ("070" = 7,000 ft). */
export const altHundreds = (ft: number) => pad3(ft / 100);
