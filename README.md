# Privo ATC

An air traffic control game for iPhone (and web), built with Expo / React Native.
This branch is a proof of concept: one airport (Budapest, LHBP), random arrivals, touch controls.

The original 2019 browser version lives in [`legacy/`](legacy/) (open `legacy/ATC.html`).

## How to play

The menu's **How to play** walks through it on a short scripted session: select, descend, draw a path to a runway, zoom.

- **Tap a plane** (or its label) to select it. Use the **HDG / ALT / SPD** steppers to change heading, altitude and speed. Hold an arrow to keep stepping.
- **Hold and drag from a plane** to draw the path it should fly.
- **End a path on a runway threshold** to clear the plane to land. That's all a landing needs: it descends on the glideslope and slows to approach speed by itself. Give it room to get down (about 1.5 nm of path per 1,000 ft), or it arrives too high and goes around. It also goes around if it isn't lined up.
- A new **altitude** cancels a landing clearance (the plane keeps the path but won't land); speed doesn't.
- The real job is separation: keep planes 3 nm or 1,000 ft apart. Use altitude to stack converging planes, speed to space planes in line for a runway, and heading or a longer path to buy time.
- **Pinch** (or double-tap) to zoom; the parallel runways are only 0.86 nm apart.

## Run it

```sh
npm install
npx expo start          # scan the QR code with Expo Go on your phone, or press w for web
npm test                # unit tests (vitest): engine, dial controls, viewport
npm run typecheck
```

### Storybook: every screen and state

```sh
npm run storybook       # opens Storybook instead of the game: scan the QR code with Expo Go, or press w for the browser
```

It covers the splash at each stage, the menu, airports and session setup in the free and full versions, the unlock offer, how to play (T1–T4), best scores, settings, every kind of summary, the game screen in the A1, A2, A4 and A5 design states plus paused, last minute and endless (route drawing, the compact sheet and the stat explainer are still to come, #44), and the components. Each comes in the Radar and Paper themes where it matters. Pick a story from the ☰ list at the bottom. In the browser, `?STORYBOOK_STORY_ID=game-game-screen--conflict` opens one directly.

## Code layout

| Path | What |
| --- | --- |
| `src/engine/` | Simulation, pure TypeScript: flight model, routes, landing, separation, traffic generation. No UI code. |
| `src/engine/airports/` | Airport definitions (runways, fixes, entry points), in nautical miles from the airport. |
| `src/game/` | Game screen, the hook that runs the sim loop, and dial logic (`controls.ts`). |
| `src/ui/` | Radar (SVG + touch gestures), plane panel with dials, top bar; screen/world maths and hit-testing in `viewport.ts`. |
| `src/theme/` | Themes: every colour, the fonts and the main radar glyph sizes (blip, tag and label fonts, leader length) come from here, so the look can be swapped wholesale. Layout sizes (panel, dials) still live in the components until the real design lands. |

Traffic is a list of `TrafficEntry` records. Random sessions generate them today; replaying a real airport's schedule for a given date will produce the same records from downloaded data.
