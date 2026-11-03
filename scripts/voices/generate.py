#!/usr/bin/env python3
"""Renders the radio voice clips (issue #49) with Kokoro-82M (Apache-2.0).

Reads scripts/voices/manifest.json and writes:
  assets/voices/<cast id>/<piece>.<take>.wav   12 kHz mono, radio-filtered
  src/game/voiceClips.ts                       the index the app plays from (generated)

Every piece is rendered at a few speeds and pitch shifts (the manifest's
`takes`), so a repeated call doesn't sound the same twice. Digits, letters and
a few words are rendered twice: with a comma ("four,") the voice leads on, for
the middle of a number (`m`); with a full stop ("four.") it falls, for the end
of a call (`f`). Everything else is a phrase piece
said on its own (`t`).

Setup (once):  pip install kokoro-onnx soundfile numpy scipy
               model files kokoro-v1.0.onnx and voices-v1.0.bin from
               https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
Run:           python scripts/voices/generate.py --model DIR [--only controller,pilotUS]
"""
import argparse
import json
import math
import os
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from scipy.signal import butter, resample, resample_poly, sosfilt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MANIFEST = os.path.join(ROOT, 'scripts', 'voices', 'manifest.json')
OUT = os.path.join(ROOT, 'assets', 'voices')
INDEX = os.path.join(ROOT, 'src', 'game', 'voiceClips.ts')
RATE = 12000  # radio band ends at ~3 kHz: 12 kHz is plenty
FRAME = 0.01  # seconds, for silence detection
SILENCE_DB = -30  # below the clip's peak: the drive lifts breath and tails, so trim firmly
PAD = 0.012  # kept round each trimmed piece
FADE = 0.006


def db(x):
    return 20 * math.log10(max(x, 1e-9))


def frames_energy(x, sr):
    n = int(sr * FRAME)
    k = len(x) // n
    return np.array([np.sqrt(np.mean(x[i * n:(i + 1) * n] ** 2)) for i in range(k)]), n


def voiced_spans(x, sr, min_gap=0.06):
    """(start, end) sample spans of speech, split at silences of at least `min_gap` seconds."""
    e, n = frames_energy(x, sr)
    if len(e) == 0:
        return []
    thr = e.max() * 10 ** (SILENCE_DB / 20)
    loud = e > thr
    spans, start, last = [], None, None
    for i, on in enumerate(loud):
        if on:
            if start is None:
                start = i
            elif (i - last - 1) * FRAME >= min_gap:
                spans.append((start * n, (last + 1) * n))
                start = i
            last = i
    if start is not None:
        spans.append((start * n, (last + 1) * n))
    # Drop clicks: anything shorter than 60 ms isn't a word.
    return [(a, b) for a, b in spans if (b - a) / sr >= 0.06]


def trim(x, sr):
    spans = voiced_spans(x, sr, min_gap=10)  # one span: the whole utterance
    if not spans:
        return x
    a, b = spans[0][0], spans[-1][1]
    pad = int(sr * PAD)
    return x[max(0, a - pad):min(len(x), b + pad)]


def fade(x, sr):
    n = min(int(sr * FADE), len(x) // 2)
    if n:
        ramp = np.linspace(0, 1, n)
        x[:n] *= ramp
        x[-n:] *= ramp[::-1]
    return x


def pitch_shift(x, semitones):
    """Resampling shift: pitch and tempo move together (a few per cent), which is the point: no two takes alike."""
    if not semitones:
        return x
    factor = 2 ** (semitones / 12)
    return resample(x, max(1, int(len(x) / factor)))


def radio(x, sr, spec):
    """Narrow band-pass, a little drive (soft clipping) and an even level: a voice over a VHF radio."""
    sos = butter(4, [spec['low'], spec['high']], btype='bandpass', fs=sr, output='sos')
    y = sosfilt(sos, x)
    peak = np.max(np.abs(y)) or 1.0
    d = spec['drive']
    y = np.tanh(d * y / peak) / np.tanh(d)
    return y


def finish(x, sr, spec):
    y = radio(x, sr, spec)
    y = resample_poly(y, RATE, sr)
    y = trim(y, RATE)
    rms = np.sqrt(np.mean(y ** 2)) or 1.0
    y = y * (10 ** (-16 / 20) / rms)  # even loudness across pieces
    peak = np.max(np.abs(y))
    if peak > 0.95:
        y = y * (0.95 / peak)
    return fade(y.astype(np.float32), RATE)


def style(k, spec):
    v = spec['voice']
    if isinstance(v, dict):  # a blend: {"bm_george": 0.6, "bm_lewis": 0.4}
        return sum(k.get_voice_style(name) * w for name, w in v.items())
    return v


def render(k, spec, text, speed, **kw):
    # Kokoro takes 0.5–2.0.
    audio, sr = k.create(text, voice=style(k, spec), speed=min(2.0, max(0.5, spec['speed'] * speed)), lang=spec['lang'], **kw)
    return np.asarray(audio, dtype=np.float32), sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True, help='folder with kokoro-v1.0.onnx and voices-v1.0.bin')
    ap.add_argument('--only', help='comma-separated cast ids')
    args = ap.parse_args()
    m = json.load(open(MANIFEST))
    k = Kokoro(os.path.join(args.model, 'kokoro-v1.0.onnx'), os.path.join(args.model, 'voices-v1.0.bin'))
    takes = list(zip(m['takes']['speeds'], m['takes']['pitch']))
    cast = {cid: c for cid, c in m['cast'].items() if not args.only or cid in args.only.split(',')}

    lists = {}
    for d, w in m['lists']['digits'].items():
        lists[f'd{d}'] = w
    for l, w in m['lists']['letters'].items():
        lists[f'l{l}'] = w
    for key, w in m['lists']['words'].items():
        lists[f'w_{key}'] = w
    singles = {f'a_{code}': f'{name},' for code, name in m['airlines'].items() if code != 'about'}
    singles.update({f's_{key}': text for key, text in m['stems'].items() if key != 'about'})

    index = {}
    for cid, spec in cast.items():
        folder = os.path.join(OUT, cid)
        os.makedirs(folder, exist_ok=True)
        for f in os.listdir(folder):
            os.remove(os.path.join(folder, f))
        clips = {}

        def save(piece, take, y):
            name = f'{piece}.{take}.wav'
            sf.write(os.path.join(folder, name), y, RATE, subtype='PCM_16')
            clips.setdefault(piece, []).append({'take': take, 'file': f'{cid}/{name}', 'ms': round(1000 * len(y) / RATE)})

        for piece, word in lists.items():
            for t, (speed, semis) in enumerate(takes):
                for pos, text in (('m', f'{word},'), ('f', f'{word}.')):
                    audio, sr = render(k, spec, text, speed * m['takes']['listSpeed'])
                    save(piece, f'{pos}{t}', finish(pitch_shift(audio, semis), sr, spec['radio']))
        for piece, text in singles.items():
            for t, (speed, semis) in enumerate(takes):
                audio, sr = render(k, spec, text, speed * m['takes']['stemSpeed'])
                save(piece, f't{t}', finish(pitch_shift(audio, semis), sr, spec['radio']))
        index[cid] = {'role': spec['role'], 'clips': clips}
        total = sum(len(v) for v in clips.values())
        print(f'{cid}: {len(clips)} pieces, {total} clips')

    texts = {**lists, **singles}
    write_index(m, index, texts)


def write_index(m, index, texts):
    lines = [
        '// GENERATED by scripts/voices/generate.py from scripts/voices/manifest.json: do not edit.',
        '// Radio voice clips (issue #49), rendered with Kokoro-82M (Apache-2.0). Each piece has takes:',
        '// m (middle of a number) and f (end of a call) for digits, letters and words; t for phrase pieces.',
        "import type { VoiceClips } from './voiceTypes';",
        '',
        'export const VOICE_CLIPS: VoiceClips = {',
    ]
    for cid, v in index.items():
        lines.append(f'  {cid}: {{')
        lines.append(f"    role: '{v['role']}',")
        lines.append('    clips: {')
        for piece, takes in sorted(v['clips'].items()):
            items = ', '.join(f"{{ take: '{t['take']}', ms: {t['ms']}, file: require('../../assets/voices/{t['file']}') }}" for t in takes)
            lines.append(f'      {json.dumps(piece)}: [{items}],')
        lines.append('    },')
        lines.append('  },')
    lines.append('};')
    lines.append('')
    lines.append('/** What each piece says (for captions and the listening page). */')
    lines.append('export const VOICE_TEXT: Record<string, string> = {')
    for piece, text in sorted(texts.items()):
        lines.append(f'  {json.dumps(piece)}: {json.dumps(text.rstrip(",."))},')
    lines.append('};')
    open(INDEX, 'w').write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
