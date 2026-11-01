import type { Airport } from '../types';

/**
 * Budapest Liszt Ferenc (LHBP), as plain data so it can later be served by a
 * backend instead of bundled.
 *
 * Frame: nautical miles from the airport reference point (ARP 47.4302 N,
 * 19.2624 E), x = east, y = north; 1° latitude = 60 nm, 1° longitude = 40.58 nm.
 *
 * Runway thresholds are from published coordinates (design handoff,
 * docs/design/README.md "LHBP geometry", which uses y = south; y is flipped here):
 * 13L/31R is 3,707 m and 13R/31L 3,010 m, true heading 132° / 312°, centrelines
 * ~0.86 nm (1.6 km) apart, with the 13R threshold staggered ~1.2 nm north-west.
 *
 * Fixes and entry points are illustrative, not real.
 */
export const LHBP: Airport = {
  icao: 'LHBP',
  name: 'Budapest Liszt Ferenc',
  rangeNm: 30,
  runways: [
    {
      name: '13L/31R',
      ends: [
        { id: '13L', heading: 132, threshold: { x: -0.199, y: 0.912 } },
        { id: '31R', heading: 312, threshold: { x: 1.278, y: -0.432 } },
      ],
    },
    {
      name: '13R/31L',
      ends: [
        { id: '13R', heading: 132, threshold: { x: -1.688, y: 1.11 } },
        { id: '31L', heading: 312, threshold: { x: -0.495, y: 0.018 } },
      ],
    },
  ],
  fixes: [
    { name: 'BADOV', pos: { x: -9, y: 16.5 } },
    { name: 'NALAG', pos: { x: 9, y: 16.5 } },
    { name: 'EPARI', pos: { x: -6.9, y: 9.2 } },
    { name: 'NIPUR', pos: { x: 20.8, y: 10 } },
    { name: 'NORAH', pos: { x: 15.4, y: 6.2 } },
    { name: 'ETARO', pos: { x: -6.3, y: 1.5 } },
    { name: 'TPS', pos: { x: 5.4, y: 1.4 } },
    { name: 'JBR', pos: { x: 17.6, y: 1.5 } },
    { name: 'BALUX', pos: { x: -2.9, y: -4.6 } },
    { name: 'MNR', pos: { x: 4.3, y: -5 } },
    { name: 'VEBOS', pos: { x: -16, y: -5.9 } },
    { name: 'ABONY', pos: { x: 20, y: -7.4 } },
    { name: 'ERLOS', pos: { x: 1, y: -15.4 } },
    { name: 'BABOX', pos: { x: 10.8, y: -19.2 } },
  ],
  // Where arrivals appear: on the sector edge, pointing inbound.
  entries: [
    { name: 'N', pos: { x: -12.4, y: 16.6 }, heading: 150 },
    { name: 'NE', pos: { x: 29.6, y: 13.7 }, heading: 248 },
    { name: 'SE', pos: { x: 20.6, y: -19.4 }, heading: 353 },
    { name: 'SW', pos: { x: -21.4, y: -19.4 }, heading: 18 },
    { name: 'W', pos: { x: -30.4, y: 0.4 }, heading: 80 },
  ],
  airlines: ['WZZ', 'WZZ', 'WZZ', 'RYR', 'RYR', 'DLH', 'AFR', 'BAW', 'EZY', 'KLM', 'LOT', 'AUA', 'SWR', 'THY', 'QTR', 'EWG'],
};
