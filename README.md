# Privo ATC

An air traffic control game for iPhone (and web), built with Expo / React Native.
This branch is a proof of concept: one airport (Budapest, LHBP), random arrivals, touch controls.

The original 2019 browser version lives in [`legacy/`](legacy/) (open `legacy/ATC.html`).

## How to play

- **Tap a plane** (or its label) to select it. Use the **HDG / ALT / SPD** dials to change heading, altitude and speed. Hold an arrow to keep stepping.
- **Hold and drag from a plane** to draw the path it should fly.
- **End a path on a runway threshold** to clear the plane to land. It descends on the glideslope by itself, and goes around if it arrives too high or not lined up.
- Keep planes 3 nm or 1,000 ft apart. Top bar: pause, time speed (×1–×8), theme, restart.

## Run it

```sh
npm install
npx expo start          # scan the QR code with Expo Go on your phone, or press w for web
npm test                # engine tests (vitest)
npm run typecheck
```

## Code layout

| Path | What |
| --- | --- |
| `src/engine/` | Simulation, pure TypeScript: flight model, routes, landing, separation, traffic generation. No UI code. |
| `src/engine/airports/` | Airport definitions (runways, fixes, entry points), in nautical miles from the airport. |
| `src/game/` | Game screen and the hook that runs the sim loop. |
| `src/ui/` | Radar (SVG + touch gestures), plane panel with dials, top bar. |
| `src/theme/` | Themes. Every colour and size comes from here, so the look can be swapped wholesale. |

Traffic is a list of `TrafficEntry` records. Random sessions generate them today; replaying a real airport's schedule for a given date will produce the same records from downloaded data.
