import type { Airport } from '../types';
import { LHBP } from './lhbp';

/** Playable airport layouts by ICAO code (content as data: more can be added or served later). */
export const AIRPORTS: Readonly<Record<string, Airport>> = { LHBP };

export const airportByIcao = (icao: string): Airport | undefined => AIRPORTS[icao];
