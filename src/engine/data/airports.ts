/**
 * The airport catalogue for Choose airport (design S3a), as plain data so it
 * can later be served by a backend. Only airports with an `Airport` definition
 * (`playable`) can be flown today; the rest are listed for the full version.
 * Difficulty: 1 easy … 3 hard.
 */
export type Region = 'Europe' | 'Americas' | 'Asia';

export interface CatalogueAirport {
  icao: string;
  name: string;
  city: string;
  country: string;
  region: Region;
  difficulty: 1 | 2 | 3;
  /** In the free version. */
  free: boolean;
  /** Has a playable layout in this build. */
  playable: boolean;
  /** Short runway description for the session setup screen. */
  runways: string;
}

const a = (icao: string, name: string, city: string, country: string, region: Region, difficulty: 1 | 2 | 3, runways: string): CatalogueAirport => ({
  icao,
  name,
  city,
  country,
  region,
  difficulty,
  free: false,
  playable: false,
  runways,
});

export const CATALOGUE: readonly CatalogueAirport[] = [
  { ...a('LHBP', 'Budapest Liszt Ferenc', 'Budapest', 'Hungary', 'Europe', 2, '2 parallel runways, 1.6 km apart'), free: true, playable: true },
  a('LOWW', 'Vienna International', 'Vienna', 'Austria', 'Europe', 2, '2 crossing runways'),
  a('EPWA', 'Warsaw Chopin', 'Warsaw', 'Poland', 'Europe', 2, '2 crossing runways'),
  a('LKPR', 'Prague Václav Havel', 'Prague', 'Czechia', 'Europe', 2, '2 crossing runways'),
  a('EGLL', 'London Heathrow', 'London', 'United Kingdom', 'Europe', 3, '2 parallel runways'),
  a('EHAM', 'Amsterdam Schiphol', 'Amsterdam', 'Netherlands', 'Europe', 3, '6 runways'),
  a('EDDF', 'Frankfurt', 'Frankfurt', 'Germany', 'Europe', 3, '4 runways'),
  a('EDDM', 'Munich', 'Munich', 'Germany', 'Europe', 2, '2 parallel runways'),
  a('LFPG', 'Paris Charles de Gaulle', 'Paris', 'France', 'Europe', 3, '4 parallel runways'),
  a('LEMD', 'Madrid Barajas', 'Madrid', 'Spain', 'Europe', 3, '4 runways'),
  a('LIRF', 'Rome Fiumicino', 'Rome', 'Italy', 'Europe', 2, '3 runways'),
  a('LSZH', 'Zurich', 'Zurich', 'Switzerland', 'Europe', 3, '3 runways'),
  a('EKCH', 'Copenhagen Kastrup', 'Copenhagen', 'Denmark', 'Europe', 2, '3 runways'),
  a('ESSA', 'Stockholm Arlanda', 'Stockholm', 'Sweden', 'Europe', 2, '3 runways'),
  a('EFHK', 'Helsinki Vantaa', 'Helsinki', 'Finland', 'Europe', 2, '3 runways'),
  a('LROP', 'Bucharest Henri Coandă', 'Bucharest', 'Romania', 'Europe', 1, '2 parallel runways'),
  a('LGAV', 'Athens', 'Athens', 'Greece', 'Europe', 1, '2 parallel runways'),
  a('LTFM', 'Istanbul', 'Istanbul', 'Türkiye', 'Europe', 3, '5 runways'),
  a('KJFK', 'New York JFK', 'New York', 'United States', 'Americas', 3, '4 runways'),
  a('KLAX', 'Los Angeles', 'Los Angeles', 'United States', 'Americas', 3, '4 parallel runways'),
  a('KORD', "Chicago O'Hare", 'Chicago', 'United States', 'Americas', 3, '8 runways'),
  a('KATL', 'Atlanta Hartsfield-Jackson', 'Atlanta', 'United States', 'Americas', 3, '5 parallel runways'),
  a('CYYZ', 'Toronto Pearson', 'Toronto', 'Canada', 'Americas', 2, '5 runways'),
  a('SBGR', 'São Paulo Guarulhos', 'São Paulo', 'Brazil', 'Americas', 2, '2 parallel runways'),
  a('MMMX', 'Mexico City', 'Mexico City', 'Mexico', 'Americas', 2, '2 parallel runways'),
  a('RJTT', 'Tokyo Haneda', 'Tokyo', 'Japan', 'Asia', 3, '4 runways'),
  a('VHHH', 'Hong Kong', 'Hong Kong', 'China', 'Asia', 2, '3 parallel runways'),
  a('WSSS', 'Singapore Changi', 'Singapore', 'Singapore', 'Asia', 2, '3 runways'),
  a('OMDB', 'Dubai International', 'Dubai', 'United Arab Emirates', 'Asia', 2, '2 parallel runways'),
  a('RKSI', 'Seoul Incheon', 'Seoul', 'South Korea', 'Asia', 2, '4 parallel runways'),
];
