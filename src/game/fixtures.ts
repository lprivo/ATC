// Prepared game states for stories (and tests): real Sims with planes placed
// exactly where a scene needs them (scene.ts), so every game-screen state
// (design A1–A5) can be shown without playing to it. Story-only: the app
// doesn't import this file. Pure (no React / React Native imports).
import { scene, type SceneOptions } from './scene';

/** A1, idle: four planes spread over the sector, one cleared to land. */
export const idle = (opts: SceneOptions = {}) =>
  scene(
    [
      { callsign: 'WZZ8638', type: 'A21N', pos: { x: -12, y: 14 }, heading: 135, altitude: 7000, speed: 250, target: { altitude: 5000 } },
      { callsign: 'LOT537', type: 'E195', pos: { x: 18, y: 6 }, heading: 250, altitude: 9000, speed: 260 },
      { callsign: 'RYR4UK', type: 'B38M', pos: { x: -6.5, y: 5.5 }, heading: 132, altitude: 3000, speed: 160, clearedTo: '13L' },
      { callsign: 'DLH1340', type: 'A320', pos: { x: 6, y: -18 }, heading: 340, altitude: 10000, speed: 280, target: { altitude: 8000 } },
    ],
    { time: 131, toCome: 6, stats: { landed: 2 }, ...opts },
  );

/** A4, conflict: two planes closing at the same level, 2.7 nm apart. */
export const conflict = (opts: SceneOptions = {}) =>
  scene(
    [
      { callsign: 'WZZ8638', type: 'A21N', pos: { x: -4, y: 12 }, heading: 90, altitude: 6000, speed: 250 },
      { callsign: 'LOT537', type: 'E195', pos: { x: -1.3, y: 12 }, heading: 270, altitude: 6400, speed: 250 },
      { callsign: 'DLH1340', type: 'A320', pos: { x: 14, y: -10 }, heading: 310, altitude: 9000, speed: 270 },
    ],
    { time: 512, toCome: 4, stats: { landed: 3 }, ...opts },
  );

/** A5, busy: 13 planes (labels drop to Min above 8), circling without losing separation for the first minutes. */
export const busy = (opts: SceneOptions = {}) => {
  const calls = ['WZZ1', 'RYR22', 'DLH340', 'AFR77', 'BAW99', 'EZY512', 'KLM16', 'LOT537', 'AUA81', 'SWR4', 'THY1F', 'QTR201', 'EWG93'];
  return scene(
    calls.map((callsign, i) => {
      const a = (i / calls.length) * 2 * Math.PI;
      const r = 9 + (i % 3) * 6;
      // Flying round the airport (at a tangent to their ring), each at its own level 1,000 ft apart, so the scene stays busy without losing separation.
      return { callsign, pos: { x: Math.sin(a) * r, y: Math.cos(a) * r }, heading: ((a * 180) / Math.PI + 90) % 360, altitude: 3000 + i * 1000, speed: 220 + (i % 4) * 15 };
    }),
    { time: 1260, toCome: 9, stats: { landed: 7, goArounds: 1 }, ...opts },
  );
};

/** Near the end of a 30-minute session: 40 s left, nothing more to come, separation lost once. */
export const lastMinute = () => idle({ time: 30 * 60 - 40, toCome: 0, stats: { landed: 9, separationViolations: 1 } });
