/** 3-digit zero-padded number, e.g. headings ("005") and altitude in hundreds of feet ("070"). */
export const pad3 = (n: number) => String(Math.round(n)).padStart(3, '0');

/** Altitude in hundreds of feet, as shown on radar tags ("070" = 7,000 ft). */
export const altHundreds = (ft: number) => pad3(ft / 100);

/** Sim clock, mm:ss (e.g. "02:11"). */
export const clock = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
