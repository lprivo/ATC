# Radio voice clips

**Generated: don't edit by hand.** `scripts/voices/generate.py` renders the clips in `scripts/voices/manifest.json` for each voice in its cast and writes them here, with `index.json` (what was rendered, for tests) and the index the app plays from (`src/game/voiceClips.ts`). Change the manifest (cast, phrasings, value ranges) or `src/engine/data/flights.json` (callsigns) and run the script again. Only what changed is re-rendered.

- **Voices generated with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0)**, through `kokoro-onnx`. The model card allows commercial use and puts no limits on the generated audio. Credit it in the app's credits too.
- Each folder is one voice of the cast (`controller`, `pilotUS`, `pilotUK`). Two kinds of clip:
  - **Phrase chunks (`x_…`)**, which a call is made of. There's one for every callsign in the flight lists, and one for every instruction the phrasings can produce with every value the steppers allow ("descend to altitude four thousand feet"). Headings are a stem plus a number ("turn left heading" + "zero four zero"). Each chunk is recorded whole, inside a realistic call, so its intonation is natural. `m0` continues (more follows), `f0` ends a call. The game only uses callsigns from the flight lists, so every call it makes has its recordings.
  - **Hesitations (`h_…`)**: each pilot's own "uh"/"um" or "er"/"erm" (the cast's `fillers`), two takes each. About 1 in 4 readbacks get one, at a pause.
- Filtered at generation to sound like a VHF radio (300–3,600 Hz, a little drive), then AAC at 16 kHz / 24 kbit/s.
