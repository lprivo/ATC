/**
 * Display names for ICAO airline codes, as plain data (could later come from a
 * backend). Placeholder: the design treats real airline names as placeholders.
 */
export const AIRLINE_NAMES: Readonly<Record<string, string>> = {
  WZZ: 'Wizz Air',
  RYR: 'Ryanair',
  DLH: 'Lufthansa',
  AFR: 'Air France',
  BAW: 'British Airways',
  EZY: 'easyJet',
  KLM: 'KLM',
  LOT: 'LOT Polish',
  AUA: 'Austrian',
  SWR: 'Swiss',
  THY: 'Turkish Airlines',
  QTR: 'Qatar Airways',
  EWG: 'Eurowings',
  FIN: 'Finnair',
  TVS: 'Smartwings',
};

/**
 * What each airline is called on the radio (its radiotelephony callsign), said
 * before the flight number: WZZ9003 is "Wizz Air niner zero zero three",
 * BAW99 "Speedbird niner niner". Written for a speech voice to say, so it can
 * differ from the official spelling (KLM is spelled out, AFR's "AIRFRANS" is
 * said "Air France", TVS is "Skytravel"). Every airline with a name, and every
 * airline an airport flies, needs one (tested).
 */
export const AIRLINE_CALLSIGNS: Readonly<Record<string, string>> = {
  WZZ: 'Wizz Air',
  RYR: 'Ryanair',
  DLH: 'Lufthansa',
  AFR: 'Air France',
  BAW: 'Speedbird',
  EZY: 'Easy',
  KLM: 'K L M',
  LOT: 'Pollot',
  AUA: 'Austrian',
  SWR: 'Swiss',
  THY: 'Turkish',
  QTR: 'Qatari',
  EWG: 'Eurowings',
  FIN: 'Finnair',
  TVS: 'Skytravel',
};

/** Airline name for a callsign like "WZZ8638", or null if unknown. */
export const airlineOf = (callsign: string) => AIRLINE_NAMES[callsign.slice(0, 3)] ?? null;
