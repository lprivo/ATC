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

/** Airline name for a callsign like "WZZ8638", or null if unknown. */
export const airlineOf = (callsign: string) => AIRLINE_NAMES[callsign.slice(0, 3)] ?? null;
