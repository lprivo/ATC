# Handoff: Privo ATC — iPhone approach-control game

> Imported from the Claude Design project "Privo ATC Design" (`design_handoff_privo_atc/README.md`) on 2026-11-01. `radar.js` in this folder is the design's canvas renderer (theme tokens, LHBP geometry, label placement), kept **as reference only**: the app doesn't load it, and it is ported to TypeScript piecemeal by the design issues (#5 radar, #7 labels, #10 route drawing). The interactive design canvas stays in the Claude Design project; it isn't committed, because it loads external scripts and fonts.
> Project constraint: the app is offline only for now (see issue #21).

## Overview
Privo ATC is a paid, premium-feeling air-traffic-control game for iPhone (portrait first; landscape and foldable layouts are also specced). The player is the approach controller at Budapest Liszt Ferenc (LHBP) and guides arrivals to two parallel runways (13L/31R, 13R/31L). The rule: keep every pair of planes at least 3 nm apart sideways or at least 1,000 ft apart vertically. This package redesigns the existing proof of concept. It fixes the runways being too close together to pick by finger, the wasted vertical space, overlapping labels, the oversized control panel and the cramped top bar. It also adds the menus, monetisation (one free airport) and a tutorial.

## Fidelity
**High fidelity.** Colours, type, sizes, states and interactions are final unless they are marked as placeholders. Placeholders are: score values (+80 landing, −150 separation loss, −25 go-around, −50 exit), sim tuning, the airport list beyond LHBP, prices ("€ —") and real airline names.

Visual language: the **Industry** blueprint style, adapted to a dark scope.
- Square corners (radius 0) and hairline 1 pt borders.
- "+" registration marks on primary objects.
- Barlow Condensed for headings and numbers, Barlow for body text.
- Lucide-style icons at a 1.5 stroke.
- The primary button is the only solid accent fill.

## Recommended direction
- **Control model:** option **1a**, the bottom sheet. Option 1b (compact strip, one stepper at a time) is an alternative for a later A/B test.
- **Runway choice:** magnetic snap with highlight, followed by a confirm chip offering *Swap L/R*.
- **Landscape:** supported, with portrait as the default.
- **Foldables:** half-open (tabletop) split layout, option 1c.

---

## Screens / views

All measurements are in pt. The design frame is 390×844 (iPhone 13–16); the safe area is 47 top and 34 bottom. On a 375×667 SE: stepper buttons shrink to 48, labels default to Min above 6 planes, and the top bar is unchanged.

### Game screen (1a, recommended)
- **Radar:** full-bleed canvas behind everything (390×844). The airport sits above centre: default view origin (195, 400), scale k = 8 pt per nm. Zoom is clamped to 5–48 pt/nm.
- **Top bar:** y = 50, inset 12, height 44, gap 8.
  - Left block (`panel` background, 1 pt `panelBorder`, padding 0 12, gap 12): `LHBP` in Condensed 600 19, letter-spacing .03em; sim clock in Condensed 500 17 tabular, `textDim` (*changed after playtesting:* a timed session counts **down**, `24:55` captioned `LEFT`, then `LAST MIN` in `text` for the final minute, with `6 TO COME` arrivals in caps 10 underneath; an endless session shows the time played, `02:11`); right-aligned ✓ landed count in `good`, then △ separation-loss count. When the count is above 0, that cell inverts to a `danger` background with `onDanger` text.
  - Pause button 44×44 (two-bar icon, 1.5 stroke).
  - Everything else from the old bar moves to the pause menu: go-arounds, exits, airborne, theme, restart.
- **Event toasts:** top-left at y = 102 (y = 166 while a conflict banner is shown). At most 2 at once, auto-dismissed after 4 s. Each is a `panel` block with a 1 pt border, padding 7 10, Barlow 500 14, nowrap. It opens with a chip: a 1 pt border in the state colour, Condensed 600 12, padding 2 4, containing `31R` / `GA` / `!` / `EXIT`.
- **Conflict banner:** y = 102, inset 12, `danger` background, `onDanger` text, padding 10 12. Warning icon 22; title `SEPARATION LOST` in Condensed 600 16, letter-spacing .04em; detail `WZZ8638 · LOT537 — 2.7 nm, 400 ft` in Barlow 500 13; a `SELECT` outline button that selects the first plane. The banner persists until the conflict clears.
- **Re-centre button:** 44×44, right 12, sitting 12 above the sheet. It resets the view to the default.
- **Bottom sheet** (`panel` background, top border 1 pt, padding 8 12 34, grabber 36×4). Heights below exclude the 34 home-indicator inset:
  - **Peek** (nothing selected, about 116): caps label `SIM SPEED · HOW FAST TIME RUNS` (Barlow 600 10, letter-spacing .12em, `textDim`); segmented control ×1 ×2 ×4 ×8, each 46×44, Condensed 600 16, active segment `accent` background with `background`-coloured text; to the right `5 airborne · 6 to come` (*changed after playtesting*; endless: `5 airborne`) / `Tap a plane · hold to draw`, one line each.
  - **Expanded** (selected, about 252): header with callsign in Condensed 600 26 (`planeSelected`), `A319 · Wizz Air` in Barlow 500 13, a status chip (`↓ DESCENDING` / `↑ CLIMBING` / `CLEARED 31R` / `GO-AROUND` / `! CONFLICT`), and a 44×44 close button; three steppers in a 3-column grid, gap 8.
  - **Compact** (swipe down while selected, about 102): callsign plus three read-only value cells (48 high). Tapping it expands the sheet again.
- **States:** A1 idle, A2 selected, A3 drawing (zoomed, snapped, loupe), A4 conflict, A5 busy (13 planes, Min labels), Paper-theme versions of A2 and A4, A6 landscape (panel docked on the side away from the Dynamic Island, width 300; steppers become rows).

### Game screen 1b (alternative)
- Idle strip: one 44 row with a ticker line, a `SPEED ×1` button that cycles ×1→×8 (long-press opens a picker) and re-centre.
- Selected: header, then 3 tabs (50 high, the active tab has an inset 3 pt `accent` bar), then one large stepper (buttons 84 wide, value Condensed 600 32, swipe on the value to scrub).
- Panel height: 88 idle, 212 selected.

### Foldable, half-open (1c)
Book-style inner screen of about 7.8" at 4:3, rotated so the hinge is horizontal. Mock 620×828, hinge at y = 414.
- **Upper half:** radar, with the top bar inside it and re-centre at the bottom-right of the half.
- **Lower half:** `panel` background, padding 22 12 24, a 2-column grid (1.15fr / 1fr, gap 12).
  - Flight-strip list: header row 30 high `13 AIRBORNE · TYPE · ALT · SPD`; rows 42 high, columns 84 / 44 / 1fr / 38 / 40: callsign (Condensed 600 17), type, altitude (`070↓050`), speed, status chip. Selected row `button` background + 1 pt white outline. Conflict rows show the callsign in `danger` and sort to the top. Tap to select; long-press to centre.
  - Controls: header, stepper rows (60 high: value Condensed 600 28 plus two 56-wide buttons), sim-speed segmented control at the bottom.
- Switch to this layout when the hinge angle is below about 150°. Keep controls at least 12 pt from the crease. Folded, the cover screen uses 1a.

### Splash / loading (S1)
- Radar background with only rings and the sweep (opacity .85). The sweep turns once every 4 s.
- App icon 104. Wordmark `PRIVO ATC` in Condensed 600 46, letter-spacing .14em. Tagline `APPROACH CONTROL` in Barlow 500 13, letter-spacing .24em.
- Progress bar 180×2 (`rangeRing` track, `snapHalo` fill), then `v1.0`.
- **Do not show an airport here.** Loading an airport happens behind Start on the session screen.

### Main menu (S2)
- *Changed after playtesting (#40):* the background is a live demo rather than empty rings. A random playable airport is shown with at most two planes. Each flies a circuit on its own side of the approach and lands by itself at ×4, and the next appears only once the last has turned onto final. It's drawn with the game's map, planes, tails and short labels (no route lines), at 40% opacity under the design's sweep (`.7`, centred 300/844, 9 pt/nm). It isn't interactive, runs only while the menu is focused, and shows a still frame with Reduce Motion.
- Wordmark at top-left, plus a `Best · 1,240 at LHBP, Steady, 30 min` line.
- Actions in the bottom half: **PLAY** (primary, 72 high, blueprint corner marks) `Random session · LHBP · Steady`; `Choose airport`, 56 high; `Replay a real day` (dashed border, inert, `COMING SOON` tag); a 3-column row How to play / Best scores / Settings.

### Choose airport (S3a)
- Search field (44): `Search city, airport or ICAO`.
- Horizontally scrolling region chips (36 high): `All 30`, `Europe 18`, `Americas 7`, `Asia 5`, `★ Favourites`.
- Free airport pinned as a blueprint card: runway-layout preview 64, ICAO, `FREE` tag (`good` background), name, difficulty bars, best score.
- `FULL VERSION · 29` header with `SORT: DIFFICULTY ↑`.
- Rows 54 high: ICAO (Condensed 600 19, width 50), name (Barlow 500 15, ellipsis), country (12, dim), 3-step difficulty bars, lock icon. Locked rows open a preview with the unlock offer.
- Sticky bottom bar: primary `UNLOCK FULL VERSION` (`All airports · custom sessions · one purchase`) and a price placeholder.

### Session setup (S3b)
- Runway preview 110, name, `2 parallel runways, 1.6 km apart`, difficulty.
- TRAFFIC (Light ~6/hr · Steady ~14/hr · Busy ~24/hr) and LENGTH (15 / 30 / 60 min · Endless) segmented controls.
- **Free version:** fixed at Steady and 30 min; other options dimmed to .5, section labels carry a lock; tapping a locked option opens the offer; dashed upsell box with `SEE OFFER`.
- Primary button: `START · STEADY · 30 MIN`.

### Settings (S4)
- **THEME:** Radar / Paper preview cards, toggle `Follow system light/dark`.
- **FEEL:** Sound effects, Music (added with #49, not in the canvas) and Haptics toggles (square, 52×30); `In a game` Zen | Radio (added with #49); `Radio voice` (`Spoken instructions + pilot readbacks`, live since #49); `Controls on` Left | Right (mirrors the sheet and re-centre).
- **DISPLAY:** Altitude ft | m; Distance nm | km; Plane labels Auto | Full | Min; Label size S | M | L (`labelScale` 0.92 / 1 / 1.15).

### Pause menu (S5) and stat explainer (S5b)
- **Pause:** scrim; `PAUSED · LHBP · 02:11 / 30:00` (elapsed / length, kept as designed: while paused the top bar's countdown is hidden, and this line gives both), score in Condensed 600 64 with `points so far`; bottom panel with a 5-cell stat grid (Landed / Sep. lost / Go-around / Exits / Airborne; dotted underline, tappable); theme segmented control; Restart / Quit to menu (both confirm); primary RESUME.
- **S5b explainer:** sheet (top 150) with kind chip and caps title, Condensed 30 headline, one-paragraph explanation, `WHY IT HAPPENS` numbered causes from the sim's rules, `THIS SESSION · n` incidents (callsign, time, reason), one tip.
  - Go-around: too high (more than about 300 ft per nm to the threshold), not lined up (more than 40° off the runway heading), or not cleared.
  - Sep. lost: under 3 nm **and** under 1,000 ft. Exits: a plane left the sector edge. Landed: scoring. Airborne: planes in the sector now.

### End-of-session summary (S6)
- `SESSION COMPLETE · LHBP · STEADY · 30 MIN`; score in Condensed 600 96, `NEW BEST` tag and `Previous best`; breakdown rows 52 high with per-item values (separation losses in `danger`); buttons Menu, PLAY AGAIN.

### Tutorial (T1–T4)
Coach marks over a scripted mini-session; each waits for the real gesture (no Next button).
- **T1 · Tap to select:** *"Its label shows the callsign, then altitude in hundreds of feet (070 = 7,000 ft) and speed in knots."*
- **T2 · Steppers:** *"Bring it down to 4,000 ft."*
- **T3 · Hold and drag to 13L:** includes a legend for the draft and cleared line styles.
- **T4 · Pinch to zoom:** *"Budapest's two runways are only 1.6 km apart (0.86 nm), a few pixels on the full sector…"*

Card at bottom 56, inset 20, `panel` background, 1 pt `accent` border; step `n / 4` in Barlow 600 12 (+.14em), Condensed 28 title, Barlow 15 body. Scrim `rgba(6,12,18,.78)`; T3's route spotlight uses a lighter `.70`. The card never covers the bottom sheet (it sits 20 above it when that is higher than 56).

---

## Components

### Plane symbol and data block
- **Symbol:** 11 pt square, 1.5 stroke. Normal: hollow `plane`. Selected: filled `planeSelected` plus corner brackets (26 box, 5 arms). Conflict: `planeConflict` plus a dashed ring of radius max(16 pt, 1.5 nm), dash 5/4. Cleared: a 3.5 pt centre dot in `routeCleared`.
- **Tail** (*changed after playtesting, #37*: replaces the forward heading vector and the trail dots, which read as the plane flying backwards): behind the plane, along its flown path, 1 minute of flight at its **current** speed (spd/60 nm), minimum 14 pt, starting 6 pt clear of the symbol; in the symbol's colour, fading 0.9 → 0.1 and narrowing 2 → 0.75 pt in 8 steps. Its length reads as speed at a glance.
- **Label:** Condensed 600 13 (line 1) and 500 12 (line 2) × `labelScale`, line height 15, padding 3, solid `labelBg`.
  - Line 1: callsign, then (Full) type in `fixLabel`, then chips (`!`, runway, `GA`). Line 2: altitude in hundreds, trend arrow, target, then speed, e.g. `070↓040 250`.
  - Selected: 1 pt `planeSelected` frame. Conflict: whole label inverts to `danger` / `onDanger`.
  - **Min mode** (automatic above 8 planes, unless selected or in conflict): callsign, trend and chips only.
- **Auto-placement:** 16 candidate slots (8 compass positions at 12 pt, plus 8 at 30 pt with a leader line). Score = preference + 40 (far ring) + 120 (in front of the plane, or over its tail) + label overlap × 5 + symbol overlap × 4 + off-safe-area × 6. Place selected and conflict labels first; conflict pair-distance tags are obstacles. Re-run at 2 Hz and ease labels 150 ms to their new slot.
- **Hit target:** a 44 pt circle (24 pt radius) around the symbol, plus the label rectangle.

### Stepper (sheet)
- Bordered cell, padding 8: caps label `HDG` / `ALT FT` / `SPD KT` (Barlow 600 11, +.12em); commanded value Condensed 600 34 tabular; `now 7,000 ↓` Barlow 500 12.
- Two buttons side by side at the bottom, each at least 56×52, `button` background, `buttonPressed` when held. Heading ◀ ▶; altitude and speed ▼ ▲.
- Steps: heading 5°, altitude 1,000 ft (2,000–15,000), speed 10 kt (140–300).
- **Hold to repeat:** first repeat after 400 ms, then every 120 ms; after 1.5 s, every 60 ms.
- At a limit: the button drops to 45% opacity and fires a rigid haptic.
- Changing heading cancels any drawn route. Changing altitude on a cleared plane cancels the clearance (with a toast).

### Route drawing and runway snap
- **Start:** hold on a plane 250 ms (medium haptic), then drag. Points every 14 pt. While drawing, the sim runs at ½ speed.
- **Loupe:** radius 62, magnification max(26, 2.2 × k) pt/nm, on the side away from the finger, about 150 pt above it.
- **Candidates:** inside 3 nm (or 60 pt) of a threshold, nearby thresholds show dashed `accent` rings (radius 9).
- **Snap:** within 28 pt (or 0.8 nm), pick the threshold with the best score: distance − 30 × (alignment of the last 4 path points with the approach direction). On snap: runway halo (`snapHalo` 28%, runway width + 12), lit extended centreline (2 pt), threshold ring radius 10, inverted runway label, a `LAND 31L` chip near the finger, medium/rigid haptic.
- **Release:** path trimmed inside 3.2 nm and ends at a 3 nm final fix. Confirm card above the sheet with `Swap to 31R` and `✓ 31L`; auto-confirms after 3 s with a 3 pt progress bar. On confirm: success haptic and toast `cleared to land 31L`.
- **Cancel:** dropping the path onto the sheet area cancels it.
- **Line styles:** route `route` 2 pt dash 7/5 chevron head; cleared `routeCleared` 2.5 pt solid chevron head; draft `routeDraft` 2.5 pt dot 2/5 with a 7-radius end handle.

### Radar furniture
- Range rings at 5 / 10 / 20 / 30 nm, `rangeRing` 1 pt, numbers in the fix font at −50°.
- Extended centrelines: 12 nm, dash 4/6, ticks at 5 and 10 nm.
- Runway stroke width: clamp(3, 0.22 nm × k, 7). Runway labels 13 pt beyond each threshold, offset outward by 9 pt.
- Fixes: 9 pt outline triangles (`fix`); names Condensed 500 10, +.06em (`fixLabel`).

## Interactions and gestures
- Tap a plane or label: select it. The sheet expands and the view pans so the plane stays above the sheet and below y = 120.
- Tap empty radar (< 6 pt movement, < 300 ms): deselect.
- One-finger drag on empty radar: pan. Pinch (or scroll wheel on the web): zoom around the focal point.
- Double-tap on empty radar: toggle runway zoom (k = 26) / sector view (k = 8).
- Hold a plane and drag: draw a route.
- New conflict: the sim drops to ×1 automatically and fires the warning haptic.
- Sheet transitions: 220 ms ease-out, transform only.

### Haptics
| Event | iOS feedback |
| --- | --- |
| Select plane | impact light |
| Each stepper step | selection |
| Hold enters draw mode | impact medium |
| Path snaps to runway | impact rigid |
| Landing confirmed | notification success |
| New conflict | notification warning (once per pair) |
| Stepper at limit | impact rigid |

Never fire a haptic for ambient events, or for landings the player didn't touch.

## State
- `sim`: planes `{id, cs, type, x, y (nm), hdg, cmdHdg, alt, cmdAlt, spd, cmdSpd, route[], rwy, cleared, onFinal, goAroundUntil, conf}`, plus sim time and next spawn time.
- `stats`: landed, sep, ga, exits. The score is derived from these.
- `ui`: selectedId, sheet (peek | compact | expanded), view {ox, oy, k}, simSpeed (1 | 2 | 4 | 8), paused, theme, pendingClearance {id, t}, toasts[], drawState {pts, snap, cands, loupe}.
- `entitlement`: free | full. Gates the airports and the session parameters.
- `settings`: theme, followSystem, sound, music, inGameAudio, radioVoice, haptics, handedness, altUnit, distUnit, labelMode, labelScale.

## Design tokens

Implemented in `src/theme/themes.ts`. Tokens marked **NEW** were added to the original list. Values are identical to `THEMES` in `radar.js`.

| Token | Radar (dark) | Paper (light) |
| --- | --- | --- |
| background | #0f1b26 | #f2f2f3 |
| rangeRing | #22364a | #d4d4d7 |
| centreline **NEW** | #34506b | #a9b0b7 |
| runway | #e8eef4 | #1d1f20 |
| runwayLabel | #b5d9fd | #2c455d |
| fix | #5f7f9e | #7a7a7d |
| fixLabel | #8aa6c1 | #5d5d60 |
| plane | #d6ebff | #1d2d3d |
| planeSelected | #ffffff | #000000 |
| planeConflict | #ffb547 | #c2410c |
| route | #94bce3 | #597ea3 |
| routeCleared | #6fe3c6 | #0b7a63 |
| routeDraft | #ffffff | #1d1f20 |
| panel | #162534 | #e9e9ea |
| panelBorder | #2c455d | #cfcfd2 |
| text | #eef6ff | #1d1f20 |
| textDim | #97adc2 | #5d5d60 |
| accent | #749dc4 | #5980a6 |
| danger | #ffb547 | #c2410c |
| good | #6fe3c6 | #0b7a63 |
| button | #1f3245 | #f5f5f8 |
| buttonPressed | #2c455d | #d6ebff |
| buttonText | #eef6ff | #1d1f20 |
| labelBg **NEW** | rgba(15,27,38,.84) | rgba(242,242,243,.88) |
| snapHalo **NEW** | #b5d9fd | #416180 |
| onDanger **NEW** | #1a1206 | #ffffff |
| scrim **NEW** | rgba(6,12,18,.72) | rgba(29,31,32,.45) |
| sweep **NEW** | rgba(148,188,227,.30) | rgba(89,128,166,.22) |

The tutorial uses its own, darker scrim `rgba(6,12,18,.78)`, and `rgba(6,12,18,.70)` round T3's route (see Tutorial).

### Type
Barlow Condensed for display and numbers, Barlow for body; all numbers use tabular figures.

| Token | Family / weight / size / line height |
| --- | --- |
| type.display | Condensed 600 96/86 |
| type.title | Condensed 600 28/30 |
| type.stepperValue | Condensed 600 34 |
| type.callsign | Condensed 600 26 |
| type.button | Condensed 600 18–24 |
| type.barValue | Condensed 500–600 16–19 |
| type.body | Barlow 400 15/22 |
| type.small | Barlow 500 12–13 |
| type.caps | Barlow 600 11, +.12em |
| type.coachCounter | Barlow 600 12, +.14em (tutorial step counter) |
| type.radarLabel | Condensed 600 13 / line 15 × labelScale (Paper: line 2 at 600) |
| type.radarLabel2 | Condensed 500 12 × labelScale |
| type.fix | Condensed 500 10, +.06em |
| type.runway | Condensed 600 11 |

### Size and stroke
| Token | Value |
| --- | --- |
| size.planeSymbol | 11 |
| size.selectBracket | 26 (arm 5) |
| size.hitTarget | 44 (hit-tested with a 24 pt radius) |
| size.tail | 1 min at current speed, minimum 14; from 6 pt; 8 pieces, opacity 0.9 → 0.1, width 2 → 0.75 (#37) |
| size.conflictRing | 1.5 nm, minimum 16 |
| size.labelOffset | 12 / 30 |
| size.snapRadius | 28 |
| size.loupe | r 62, ×2.2 |
| stroke.ring / fix | 1 |
| stroke.plane | 1.5 |
| stroke.runway | clamp(3, 0.22 nm, 7) |
| stroke.route | 2, dash 7/5 |
| stroke.routeCleared | 2.5 |
| stroke.routeDraft | 2.5, dot 2/5 |
| panel.topBar | 44 |
| panel.peek / compact / expanded | ~116 / 102 / 252 |
| button.min | 44; steppers 56×52 |
| radius | 0 (blueprint style) |
| space.edge / gap | 12 / 8 |
| labelScale | 0.92 / 1 / 1.15 |

**Colour-blind safety:** the three states use steel blue (route), mint (cleared) and amber (conflict), and every state also has a shape cue (dashed ring, inverted label, `!` chip, solid line plus arrowhead, runway chip, corner brackets). Verify contrast with a tool before shipping.

There are no shadows and no blur anywhere on the radar.

## Performance
- Static layer (rings, centrelines, runways, fixes) redrawn only on zoom or pan; dynamic layer at 30 fps.
- No blur, shadows or gradients on the radar (except the splash/menu sweep).
- Label placement at 2 Hz, not every frame.
- Panels fully opaque, animated with transform only.

## LHBP geometry (from published threshold coordinates)
- ARP 47.4302 N, 19.2624 E. Design frame: x = east, y = **south**, in nm (the engine uses y = north). 1° latitude = 60 nm; 1° longitude = 40.58 nm.

| Threshold | x, y (nm, y south) |
| --- | --- |
| 13L | −0.199, −0.912 |
| 31R | 1.278, 0.432 |
| 13R | −1.688, −1.110 |
| 31L | −0.495, −0.018 |

- True heading 132° / 312°. 13L/31R is 3,707 m; 13R/31L is 3,010 m. Centrelines about 0.86 nm (1.6 km) apart; 13R threshold staggered about 1.2 nm north-west.
- Fix positions are illustrative, not real.

## Assets
- No raster assets. Lucide-style line icons at a 1.5 stroke. App icon drawn procedurally (`drawIcon`). Fonts: Barlow and Barlow Condensed (OFL), bundled with the app.

## Out of scope / later
Departures; more airports; Replay a real day (inert); Radio voice (inert); store and paywall flow (only entry points designed); final foldable dimensions.
