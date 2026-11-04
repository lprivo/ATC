#!/usr/bin/env python3
"""Renders the radio voice clips (issue #49) with Kokoro-82M (Apache-2.0).

Reads scripts/voices/manifest.json and writes:
  assets/voices/<cast id>/<clip>.<take>.m4a    radio-filtered, AAC
  assets/voices/index.json                     what was rendered (for tests)
  src/game/voiceClips.ts                       the index the app plays from (generated)

Two kinds of clip:
- Phrase chunks (`x_...`): every callsign in src/engine/data/flights.json and
  every instruction the phrasings can make, with every value the steppers
  allow, each recorded whole in the context of a real call. A call is a few
  of these, joined where a speaker pauses anyway. `m0` continues (more
  follows), `f0` ends a call.
- Hesitations (`h_uh`, `h_er`…): a few per voice (the cast's `fillers`),
  said slowly, `h0` and `h1` with different speeds and pitch.

Every clip is cut out of a natural sentence (its carrier, the clip in
[brackets]) said at normal speed, using the model's timing of each sound, so
it keeps the shape it has in real speech. The radio filter and the level are
set on the whole sentence before the cut, so a short clip's tail isn't blown
up.

Setup (once):  pip install kokoro-onnx soundfile numpy scipy
               kokoro-v1.0.onnx from the model-files-v1.1 release (it reports
               timings) and voices-v1.0.bin, from
               https://github.com/thewh1teagle/kokoro-onnx/releases
Run:           python scripts/voices/generate.py --model DIR [--only controller,pilotUS] [--threads 2]

It runs at low priority on 2 threads by default (--threads to change), so the
machine stays usable, and keeps every rendered piece in a cache
(~/.cache/privo-atc-voices, --cache to move it): a run only renders what
changed in the manifest (or in this script's rendering settings).
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

import numpy as np
import soundfile as sf
import onnxruntime as rt
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
# Bump to re-render everything after changing how pieces are rendered or cut.
RENDER_VERSION = 3


def cache_key(spec, carrier, w, speed, semis, pos):
    settings = [RENDER_VERSION, RATE, LEVEL_DB, PAD_START, PAD_END, FADE, spec['voice'], spec['lang'], spec['speed'], spec['radio'], carrier, w, speed, semis, pos]
    return hashlib.sha1(json.dumps(settings, sort_keys=True).encode()).hexdigest()


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
    ap.add_argument('--threads', type=int, default=2, help='CPU threads for the model (default 2)')
    ap.add_argument('--cache', default=os.path.expanduser('~/.cache/privo-atc-voices'), help='where rendered pieces are kept between runs')
    args = ap.parse_args()
    try:
        os.nice(19)  # the machine's own work comes first
    except OSError:
        pass
    os.makedirs(args.cache, exist_ok=True)
    m = json.load(open(MANIFEST))
    opts = rt.SessionOptions()
    opts.intra_op_num_threads = args.threads
    opts.inter_op_num_threads = 1
    session = rt.InferenceSession(os.path.join(args.model, 'kokoro-v1.0.onnx'), sess_options=opts, providers=['CPUExecutionProvider'])
    k = Kokoro.from_session(session, os.path.join(args.model, 'voices-v1.0.bin'))
    if not k.has_timings:
        sys.exit('this Kokoro export has no timings: use kokoro-v1.0.onnx from the model-files-v1.1 release')
    takes = list(zip(m['takes']['speeds'], m['takes']['pitch']))
    cast = {cid: c for cid, c in m['cast'].items() if not args.only or cid in args.only.split(',')}
    lists = m['lists']

    index = {}
    texts = {}
    for cid, spec in cast.items():
        folder = os.path.join(OUT, cid)
        os.makedirs(folder, exist_ok=True)
        for f in os.listdir(folder):
            os.remove(os.path.join(folder, f))
        clips = {}
        rendered = 0
        # Hesitations ("uh", "er"): this voice's own, said slowly, `h` takes.
        for word in spec.get('fillers', []):
            for n, carrier in enumerate(m['fillers']['carriers']):
                speed, semis = takes[n % len(takes)]
                speed *= m['fillers']['speed']
                cached = os.path.join(args.cache, cache_key(spec, carrier, word, speed, semis, 't') + '.wav')
                if os.path.exists(cached):
                    y, _ = sf.read(cached, dtype='float32')
                else:
                    y = cut(k, spec, carrier, word, speed, semis, 't')
                    sf.write(cached, y, RATE, subtype='PCM_16')
                    rendered += 1
                piece = f'h_{word}'
                texts[piece] = word
                name = f'{piece}.h{n}.wav'
                sf.write(os.path.join(folder, name), y, RATE, subtype='PCM_16')
                clips.setdefault(piece, []).append({'take': f'h{n}', 'file': f'{cid}/{name}', 'ms': round(1000 * len(y) / RATE)})
        index[cid] = {'role': spec['role'], 'clips': clips}
        print(f'{cid}: {len(clips)} hesitations ({rendered} rendered, the rest from the cache)')

    chunks = phrase_chunks(m)
    for cid, spec in cast.items():
        folder = os.path.join(OUT, cid)
        clips = index[cid]['clips']
        rendered = 0
        role_chunks = chunks[spec['role']]
        for cnt, (chunk_id, c) in enumerate(sorted(role_chunks.items())):
            texts[chunk_id] = c['text']
            for pos, carrier in sorted(c['carriers'].items()):
                cached = os.path.join(args.cache, cache_key(spec, carrier, '', 1.0, 0.0, pos) + '.wav')
                if os.path.exists(cached):
                    y, _ = sf.read(cached, dtype='float32')
                else:
                    y = cut(k, spec, carrier, '', 1.0, 0.0, pos)
                    sf.write(cached, y, RATE, subtype='PCM_16')
                    rendered += 1
                name = f'{chunk_id}.{pos}0.wav'
                sf.write(os.path.join(folder, name), y, RATE, subtype='PCM_16')
                clips.setdefault(chunk_id, []).append({'take': f'{pos}0', 'file': f'{cid}/{name}', 'ms': round(1000 * len(y) / RATE)})
            if cnt % 50 == 0:
                print(f'  {cid}: {cnt}/{len(role_chunks)} phrases', flush=True)
        print(f'{cid}: {len(role_chunks)} phrases ({rendered} rendered, the rest from the cache)', flush=True)
        encode(folder, clips, args.cache)
    write_index(index, texts)


def encode(folder, clips, cache):
    """WAV → AAC (m4a), cached by content; the index then points at the m4a files."""
    exe = ffmpeg()
    for takes in clips.values():
        for t in takes:
            wav = os.path.join(OUT, t['file'])
            data = open(wav, 'rb').read()
            cached = os.path.join(cache, 'm4a-' + hashlib.sha1(data).hexdigest() + '.m4a')
            if not os.path.exists(cached):
                subprocess.run([exe, '-v', 'error', '-y', '-threads', '1', '-i', wav, '-ar', '16000', '-ac', '1', '-c:a', 'aac', '-b:a', '24k', cached], check=True)
            m4a = wav[:-4] + '.m4a'
            shutil.copy(cached, m4a)
            os.remove(wav)
            t['file'] = t['file'][:-4] + '.m4a'


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('needs ffmpeg (brew install ffmpeg, or pip install imageio-ffmpeg)')


# ---- phrase chunks ----------------------------------------------------------------------

def slug(text):
    return 'x_' + re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')


class Words:
    """Spoken numbers and names, exactly as the app builds them (src/game/radioScript.ts)."""

    def __init__(self, m):
        self.d = m['lists']['digits']
        self.l = m['lists']['letters']
        self.airlines = {k: v for k, v in m['airlines'].items() if k != 'about'}
        self.transition = m['values']['transitionFt']

    def digits(self, s):
        return ' '.join(self.d[ch] for ch in s if ch.isdigit())

    def heading(self, h):
        return self.digits(str(h % 360 or 360).zfill(3))

    def altitude(self, ft):
        r = round(ft / 100) * 100
        if r > self.transition:
            return 'flight level ' + self.digits(str(round(r / 100)).zfill(3))
        th, hu = r // 1000, round((r % 1000) / 100)
        parts = []
        if th:
            parts.append(f'{self.digits(str(th))} thousand')
        if hu:
            parts.append(f'{self.d[str(hu)]} hundred')
        return ' '.join(parts + ['feet'])

    def speed(self, kt):
        return f'{self.digits(str(kt))} knots'

    def runway(self, rid):
        mm = re.match(r'^(\d{1,2})([LRC]?)$', rid)
        side = {'L': 'left', 'R': 'right', 'C': 'center', '': ''}[mm.group(2)]
        return ' '.join(x for x in [self.digits(mm.group(1).zfill(2)), side] if x)

    def callsign(self, cs):
        airline = self.airlines.get(cs[:3])
        rest = cs[3:] if airline else cs
        words = [self.d[ch] if ch.isdigit() else self.l[ch] for ch in rest]
        return ' '.join(([airline] if airline else []) + words)


def phrase_chunks(m):
    """Role → chunk id → {text, carriers: {pos: carrier}}: every chunk a call can need, with the sentence it's recorded in."""
    w = Words(m)
    v = m['values']
    ctx = m['phraseContext']
    headings = list(range(v['headingStep'], 361, v['headingStep']))
    alts = list(range(v['altitude']['min'], v['altitude']['max'] + 1, v['altitude']['step']))
    spds = list(range(v['speed']['min'], v['speed']['max'] + 1, v['speed']['step']))
    low = [a for a in alts if a <= v['transitionFt']]
    high = [a for a in alts if a > v['transitionFt']]
    domain = {
        'turn': [{'side': s, 'hdg': w.heading(h)} for s in ('left', 'right') for h in headings],
        'fly': [{'hdg': w.heading(h)} for h in headings],
        'descend': [{'alt': w.altitude(a)} for a in low], 'climb': [{'alt': w.altitude(a)} for a in low],
        'descendFL': [{'alt': w.altitude(a)} for a in high], 'climbFL': [{'alt': w.altitude(a)} for a in high],
        'maintainAlt': [{'alt': w.altitude(a)} for a in alts],
        'reduce': [{'spd': w.speed(x)} for x in spds], 'increase': [{'spd': w.speed(x)} for x in spds], 'maintainSpd': [{'spd': w.speed(x)} for x in spds],
        'land': [{'rwy': w.runway(r)} for r in v['runways']],
    }
    flights = json.load(open(os.path.join(ROOT, 'src', 'engine', 'data', 'flights.json')))
    callsigns = [w.callsign(code + n) for code, ns in flights.items() if code != 'about' and code in w.airlines for n in ns]
    out = {'controller': {}, 'pilot': {}}

    def add(role, text, pos, carrier):
        c = out[role].setdefault(slug(text), {'text': text, 'carriers': {}})
        c['carriers'].setdefault(pos, carrier)

    for cs in callsigns:
        add('controller', cs, 'm', f"[{cs}], {ctx['callsignController']}")
        add('pilot', cs, 'f', f"{ctx['callsignPilot']} [{cs}].")
    for role in ('controller', 'pilot'):
        for kind, templates in m['phrasings'][role].items():
            for tpl in templates:
                for values in domain[kind]:
                    filled = tpl
                    for key, val in values.items():
                        filled = filled.replace('{' + key + '}', val)
                    parts = [x.strip() for x in filled.split('|')]
                    for i, part in enumerate(parts):
                        last = i == len(parts) - 1
                        before = parts[i - 1] if i else (ctx['controllerBefore'] if role == 'controller' else '')
                        follow = parts[i + 1] if not last else None
                        if role == 'controller':
                            add(role, part, 'm', f"{before} [{part}] {follow}." if follow else f"{before} [{part}], {ctx['controllerAfter']}")
                            if last:
                                add(role, part, 'f', f'{before} [{part}].')
                        else:
                            add(role, part, 'm', f"{before} [{part}] {follow}, {ctx['pilotAfter']}" if follow else f"{before} [{part}], {ctx['pilotAfter']}")
    return out


def write_index(index, texts):
    lines = [
        '// GENERATED by scripts/voices/generate.py from scripts/voices/manifest.json: do not edit.',
        '// Radio voice clips (issue #49), rendered with Kokoro-82M (Apache-2.0). Each clip has takes:',
        '// m0 (continues) and f0 (ends a call) for phrases; h0, h1 for hesitations.',
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
    plain = {cid: {'role': v['role'], 'clips': {p: [t['take'] for t in ts] for p, ts in sorted(v['clips'].items())}} for cid, v in index.items()}
    json.dump(plain, open(os.path.join(OUT, 'index.json'), 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
