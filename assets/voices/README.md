# Radio voice clips

**Generated: don't edit by hand.** `scripts/voices/generate.py` renders every piece in `scripts/voices/manifest.json` for each voice in its cast, and writes these clips plus the index the app plays from (`src/game/voiceClips.ts`). Change the manifest (cast, speeds, phrase pieces) and run the script again.

- **Voices generated with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0)**, through `kokoro-onnx`. The model card allows commercial use and puts no limits on the generated audio. Credit it in the app's credits too.
- Each folder is one voice of the cast (`controller`, `pilotUS`, `pilotUK`). Each piece has takes at different speeds and pitches: `m` (leads on, the middle of a number), `f` (falls, the end of a call), and `t` (a phrase piece).
- Filtered at generation to sound like a VHF radio (300–3,000 Hz, a little drive), 12 kHz mono WAV. A prototype: the real set should be compressed (and maybe packed into one file per voice) before release.
