#!/usr/bin/env python3
"""Renders the radio voice clips (issue #49) with Kokoro-82M (Apache-2.0).

Reads scripts/voices/manifest.json and writes:
  assets/voices/<cast id>/<piece>.<take>.wav   12 kHz mono, radio-filtered
  src/game/voiceClips.ts                       the index the app plays from (generated)

Every piece is cut out of a natural sentence (its carrier, the piece in
[brackets]) said at normal speed, using the model's timing of each sound, so
words keep the shape they have in real speech. The radio filter and the level
are set on the whole sentence before the cut, so a short word's tail isn't
blown up. Digits, letters and words have takes from the middle of a number
(`m`, they lead on) and from the end of a sentence (`f`, they fall); phrase
pieces have `t` takes. Each take uses its own carrier, speed and pitch.

Setup (once):  pip install kokoro-onnx soundfile numpy scipy
               kokoro-v1.0.onnx from the model-files-v1.1 release (it reports
               timings) and voices-v1.0.bin, from
               https://github.com/thewh1teagle/kokoro-onnx/releases
Run:           python scripts/voices/generate.py --model DIR [--only controller,pilotUS]
"""
import argparse
import json
import os
import re
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from scipy.signal import butter, resample, resample_poly, sosfiltfilt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MANIFEST = os.path.join(ROOT, 'scripts', 'voices', 'manifest.json')
OUT = os.path.join(ROOT, 'assets', 'voices')
INDEX = os.path.join(ROOT, 'src', 'game', 'voiceClips.ts')
RATE = 12000  # the radio band ends below 4 kHz: 12 kHz is plenty
LEVEL_DB = -18  # RMS of each whole sentence
PAD_START = 0.012
PAD_END = {'m': 0.015, 'f': 0.06, 't': 0.02}  # an ending falls away, so keep more of it
FADE = 0.008
PUNCT = set(',.!?;:')


def pitch_shift(x, semitones):
    """Resampling shift: pitch and tempo move together, a few per cent."""
    if not semitones:
        return x
    return resample(x, max(1, int(len(x) / 2 ** (semitones / 12))))


def radio(x, sr, spec):
    """Band-pass and a little drive (soft clipping): a voice over a VHF radio. Zero-phase, so cuts line up with the timings."""
    sos = butter(2, [spec['low'], spec['high']], btype='bandpass', fs=sr, output='sos')
    y = sosfiltfilt(sos, x)
    peak = np.max(np.abs(y)) or 1.0
    d = spec['drive']
    return np.tanh(d * y / peak) / np.tanh(d)


def trim_edges(x, pos, floor_db=-30):
    """Drops near-silence at either end (a word's timing can include the pause after it), keeping a little air."""
    n = int(RATE * 0.005)
    if len(x) < 4 * n:
        return x
    env = np.array([np.sqrt(np.mean(x[i:i + n] ** 2)) for i in range(0, len(x) - n + 1, n)])
    loud = np.nonzero(env > env.max() * 10 ** (floor_db / 20))[0]
    if not len(loud):
        return x
    a = max(0, loud[0] * n - int(RATE * PAD_START))
    b = min(len(x), (loud[-1] + 1) * n + int(RATE * PAD_END[pos]))
    return x[a:b]


def style(k, spec):
    v = spec['voice']
    if isinstance(v, dict):  # a blend: {"bm_george": 0.6, "bm_lewis": 0.4}
        return sum(k.get_voice_style(name) * w for name, w in v.items())
    return v


def words_in_time(timings):
    """Word spans (start, end) in seconds from the phoneme timings: words are split at spaces; punctuation isn't speech."""
    words, cur = [], None
    for t in timings:
        if t.phoneme == ' ':
            if cur:
                words.append(cur)
            cur = None
        elif t.phoneme in PUNCT:
            continue
        else:
            cur = [t.start, t.end] if cur is None else [cur[0], t.end]
    if cur:
        words.append(cur)
    return words


def parse_carrier(carrier, w=''):
    """'two [{w}] one,' → ('two six one,', index of the first target word, number of target words)."""
    c = carrier.replace('{w}', w)
    m = re.search(r'\[([^\]]+)\]', c)
    if not m:
        sys.exit(f'carrier without a [piece]: {carrier}')
    before = c[:m.start()].split()
    target = m.group(1).split()
    return c.replace('[', '').replace(']', ''), len(before), len(target)


def cut(k, spec, carrier, w, speed, semis, pos):
    text, first, count = parse_carrier(carrier, w)
    # Kokoro takes speeds of 0.5–2.0.
    audio, sr, timings = k.create_timed(text, voice=style(k, spec), speed=min(2.0, max(0.5, spec['speed'] * speed)), lang=spec['lang'])
    audio = np.asarray(audio, dtype=np.float32)
    spans = words_in_time(timings)
    words = [x for x in text.split() if x.strip(''.join(PUNCT))]
    if len(spans) != len(words):
        sys.exit(f'{spec["voice"]}: "{text}" has {len(words)} words but the timings split it into {len(spans)}')
    # The whole sentence through the radio, at an even level, then the cut.
    y = radio(audio, sr, spec['radio'])
    y = resample_poly(y, RATE, sr)
    y = y * (10 ** (LEVEL_DB / 20) / (np.sqrt(np.mean(y ** 2)) or 1.0))
    a = spans[first][0] - PAD_START
    b = spans[first + count - 1][1] + PAD_END[pos]
    if first + count < len(spans):
        b = min(b, spans[first + count][0])  # never into the next word
    piece = trim_edges(y[max(0, int(a * RATE)):int(b * RATE)].copy(), pos)
    piece = pitch_shift(piece, semis)
    n = min(int(RATE * FADE), len(piece) // 2)
    if n:
        ramp = np.linspace(0, 1, n)
        piece[:n] *= ramp
        piece[-n:] *= ramp[::-1]
    peak = np.max(np.abs(piece))
    if peak > 0.97:
        piece *= 0.97 / peak
    return piece.astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True, help='folder with kokoro-v1.0.onnx (the timed export) and voices-v1.0.bin')
    ap.add_argument('--only', help='comma-separated cast ids')
    args = ap.parse_args()
    m = json.load(open(MANIFEST))
    k = Kokoro(os.path.join(args.model, 'kokoro-v1.0.onnx'), os.path.join(args.model, 'voices-v1.0.bin'))
    if not k.has_timings:
        sys.exit('this Kokoro export has no timings: use kokoro-v1.0.onnx from the model-files-v1.1 release')
    takes = list(zip(m['takes']['speeds'], m['takes']['pitch']))
    cast = {cid: c for cid, c in m['cast'].items() if not args.only or cid in args.only.split(',')}
    lists = m['lists']

    # piece id → (word, {pos: [carriers]}, who)
    pieces = {}
    for d, w in lists['digits'].items():
        pieces[f'd{d}'] = (w, lists['carriers'], None)
    for l, w in lists['letters'].items():
        pieces[f'l{l}'] = (w, lists['carriers'], None)
    for key, carriers in lists['words'].items():
        pieces[f'w_{key}'] = (key, carriers, None)
    for code, name in m['airlines'].items():
        if code != 'about':
            pieces[f'a_{code}'] = (name, {'t': m['airlineCarriers']}, None)
    for key, st in m['stems'].items():
        if key != 'about':
            pieces[f's_{key}'] = (st['text'], {'t': st['carriers']}, st['who'])

    index = {}
    for cid, spec in cast.items():
        folder = os.path.join(OUT, cid)
        os.makedirs(folder, exist_ok=True)
        for f in os.listdir(folder):
            os.remove(os.path.join(folder, f))
        clips = {}
        for piece, (word, carriers, who) in pieces.items():
            if who and spec['role'] not in who:
                continue
            for pos, options in carriers.items():
                for t, (speed, semis) in enumerate(takes):
                    y = cut(k, spec, options[t % len(options)], word, speed, semis, pos)
                    name = f'{piece}.{pos}{t}.wav'
                    sf.write(os.path.join(folder, name), y, RATE, subtype='PCM_16')
                    clips.setdefault(piece, []).append({'take': f'{pos}{t}', 'file': f'{cid}/{name}', 'ms': round(1000 * len(y) / RATE)})
        index[cid] = {'role': spec['role'], 'clips': clips}
        print(f'{cid}: {len(clips)} pieces, {sum(len(v) for v in clips.values())} clips')

    texts = {p: w for p, (w, _, _) in pieces.items()}
    write_index(index, texts)


def write_index(index, texts):
    lines = [
        '// GENERATED by scripts/voices/generate.py from scripts/voices/manifest.json: do not edit.',
        '// Radio voice clips (issue #49), rendered with Kokoro-82M (Apache-2.0). Each piece has takes:',
        '// m (middle of a number) and f (end of a call) for digits, letters and words; t for phrase pieces.',
        "import type { VoiceClips } from './voiceTypes';",
        '',
        'export const VOICE_CLIPS: VoiceClips = {',
    ]
    for cid, v in index.items():
        lines += [f'  {cid}: {{', f"    role: '{v['role']}',", '    clips: {']
        for piece, takes in sorted(v['clips'].items()):
            items = ', '.join(f"{{ take: '{t['take']}', ms: {t['ms']}, file: require('../../assets/voices/{t['file']}') }}" for t in takes)
            lines.append(f'      {json.dumps(piece)}: [{items}],')
        lines += ['    },', '  },']
    lines += ['};', '', '/** What each piece says (for captions and the listening page). */', 'export const VOICE_TEXT: Record<string, string> = {']
    for piece, text in sorted(texts.items()):
        lines.append(f'  {json.dumps(piece)}: {json.dumps(text)},')
    lines.append('};')
    open(INDEX, 'w').write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
