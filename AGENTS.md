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
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npm test` and `npm run typecheck` before declaring any task done. (There is no linter set up yet.)

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
