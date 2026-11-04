# Audio

**Everything here is a placeholder**, synthesised by `scripts/placeholder-audio.py` (plain tones and pads, made by us, no third-party material). They let the audio engine (`src/game/audio.ts`) be built and heard before the real sounds are chosen (issue #49).

| File | Plays for |
| --- | --- |
| `select`, `step`, `limit`, `drawStart`, `snap`, `cleared`, `conflict` | The game moments that also have haptics (`src/game/sound.ts`, `SOUND_FOR`) |
| `landed`, `goAround`, `lastMinute`, `sessionOver` | Things the game does by itself |
| `menu` | Music in the menus (loops) |
| `zen` | Music in a session with Zen chosen (loops) |
| `radioOn`, `radioOff` | The squelch click before and after each spoken radio call (`src/game/radioVoice.ts`) |

The radio room has no background yet: the synthesised one sounded like rain, so it was dropped until a real recording is chosen. The spoken calls are recorded phrases in `assets/voices/` (see its README).

When a real file replaces a placeholder, keep the name (or update `src/game/audioAssets.ts`) and record where it came from and its licence below. Only use files whose licence covers use in a paid app: CC0, bought with an in-app/game licence, or commissioned with the rights assigned to us. No real ATC recordings.

## Sources and licences

| File | Source | Licence |
| --- | --- | --- |
| all | `scripts/placeholder-audio.py` | Ours |
