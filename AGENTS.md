This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npm test                    # unit tests (vitest): engine, dial controls, viewport
npm run typecheck           # typecheck
npm run storybook           # Storybook instead of the app (phone via Expo Go, or press w for the browser)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npm test` and `npm run typecheck` before declaring any task done. (There is no linter set up yet.)

## Storybook

- Every screen and component, in each of its states, has stories (`*.stories.tsx` next to it). Config is in `.rnstorybook/` (`storybook.requires.ts` is generated when Storybook starts; commit it as regenerated, don't edit it): `preview.tsx` wraps every story in the app's real providers and fonts, and `parameters.app` sets the story's theme, free/full version, settings, best scores and last result, without touching the device (the providers save to an in-memory store, `memoryKv`).
- **A new screen or a new state of one gets a story.** Game-screen states come from prepared sims in `src/game/fixtures.ts` (`scene()` in `src/game/scene.ts` places planes exactly; add a named scene for a new state). Sample results and best scores are in `src/stories/data.ts`.
- Screens take what a story needs as props (`progress` on the splash, `active` on screens with animations, `start` on the game screen) or from the providers. Route files in `src/app/` do the router work (e.g. `useIsFocused`), so screens and components render without a navigator.
- `npm run storybook` swaps the app's entry point for Storybook (`STORYBOOK_ENABLED=true`, see `metro.config.js`). Without it, builds contain no Storybook JavaScript; Storybook-only native modules (the controls addon's date picker and slider) are kept out of app builds with `expo.autolinking.exclude` in `package.json`, because Storybook runs in Expo Go. Its packages are devDependencies; keep it that way. (Gesture Handler, Reanimated and Worklets are app dependencies at the SDK's versions: Expo Router and Expo's modules use them too.) In the browser, `?STORYBOOK_STORY_ID=<id>` opens a story directly; the id is the title and the export name in kebab case, e.g. `game-game-screen--conflict`.

## Navigation & Routing

- Navigation is **Expo Router**: routes live in `src/app/` (`_layout.tsx` is the root: fonts, splash, providers, the stack). Screens are in `src/screens/` and `src/game/GameScreen.tsx`; route files stay thin.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project

- `src/engine/` — the simulation: pure TypeScript, no React or React Native imports. Keep it that way so it stays testable (`npm test`) and reusable.
- `src/ui/`, `src/game/` — React Native UI. Colours, type (`theme.type`), radar fonts (`theme.radarFont`), radar glyph sizes (`theme.size`) and border widths (`theme.hairline`) come only from `src/theme/themes.ts`; don't hard-code colours. Layout sizes (panel, dials, buttons) live in component StyleSheets, following `docs/design/README.md`.
- Pure logic used by the UI (`src/game/controls.ts`, `src/ui/viewport.ts`, `src/ui/format.ts`) has no React Native imports and is unit tested.
- `legacy/` — the original 2019 HTML/JS sim, kept for reference. Not part of the app.
- Run `npm test` and `npm run typecheck` before declaring a task done.
- Content is data. Airports, traffic files, themes and tutorial copy must stay plain serialisable objects (no functions or logic in airport files), because a backend will later serve them and the app will self-update over the air (EAS Update, with the user's consent; see issue #21). For now the app is offline only: no network calls.
- Design reference: `docs/design/` (Claude Design handoff "Privo ATC Design"). Track work against the epic, issue #20.
