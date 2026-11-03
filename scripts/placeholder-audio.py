#!/usr/bin/env python3
"""Synthesises the placeholder sounds and music loops in assets/audio/ (issue #49).

Plain tones and pads, so the audio engine can be built and heard before the
real assets are chosen. Mono 16-bit WAV at 22.05 kHz; music loops wrap round
seamlessly. Standard library only: python3 scripts/placeholder-audio.py
"""
import math
import os
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')


def tone(freq, dur, vol=0.5, attack=0.005, release=None, harmonics=(1.0,), glide_to=None):
    n = int(RATE * dur)
    release = dur * 0.6 if release is None else release
    out, phase = [], 0.0
    for i in range(n):
        t = i / RATE
        f = freq if glide_to is None else freq + (glide_to - freq) * t / dur
        phase += 2 * math.pi * f / RATE
        env = min(1.0, t / attack) * (1.0 if t < dur - release else max(0.0, (dur - t) / release))
        s = sum(a * math.sin(phase * (k + 1)) for k, a in enumerate(harmonics))
        out.append(vol * env * s / sum(harmonics))
    return out


def silence(dur):
    return [0.0] * int(RATE * dur)


def mix(*parts):
    n = max(len(p) for p in parts)
    return [sum(p[i] for p in parts if i < len(p)) for i in range(n)]


def seq(*parts):
    return [s for p in parts for s in p]


def write(name, samples):
    os.makedirs(OUT, exist_ok=True)
    peak = max(1e-9, max(abs(s) for s in samples))
    scale = min(1.0, 0.9 / peak)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * scale)) * 32767)) for s in samples))


def pad_loop(chords, chord_sec, vol=0.25):
    """Chords (lists of Hz) each `chord_sec` long, overlapping and wrapped so the loop is seamless."""
    total = int(RATE * chord_sec * len(chords))
    buf = [0.0] * total
    fade = chord_sec * 0.5
    for c, notes in enumerate(chords):
        start = int(RATE * chord_sec * c)
        length = int(RATE * (chord_sec + fade))
        for k in range(length):
            t = k / RATE
            env = min(1.0, t / fade) * min(1.0, (chord_sec + fade - t) / fade)
            s = sum(math.sin(2 * math.pi * f * t) + 0.3 * math.sin(4 * math.pi * f * t) for f in notes) / len(notes)
            buf[(start + k) % total] += vol * env * s
    return buf


# Hz for a few notes.
N = {'A2': 110.0, 'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.0, 'A3': 220.0, 'B3': 246.94,
     'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.0, 'A4': 440.0, 'C5': 523.25, 'E5': 659.25, 'G5': 783.99}

# ---- effects -----------------------------------------------------------------
write('select', tone(880, 0.07, 0.4, release=0.05, harmonics=(1, 0.2)))
write('step', tone(2000, 0.018, 0.25, attack=0.001, release=0.015))
write('limit', tone(140, 0.09, 0.6, attack=0.002, harmonics=(1, 0.5, 0.25)))
write('drawStart', tone(500, 0.12, 0.4, glide_to=900, harmonics=(1, 0.2)))
write('snap', mix(tone(3000, 0.01, 0.4, attack=0.0005, release=0.008), tone(1320, 0.06, 0.35, release=0.05)))
write('cleared', seq(tone(N['E5'], 0.12, 0.35, harmonics=(1, 0.3)), tone(N['G5'], 0.25, 0.35, harmonics=(1, 0.3))))
write('conflict', seq(*[seq(tone(1000, 0.09, 0.45, attack=0.002, release=0.01, harmonics=(1, 0.4)), silence(0.06)) for _ in range(3)]))
write('landed', seq(tone(N['G4'], 0.14, 0.3, harmonics=(1, 0.3)), tone(N['E4'], 0.14, 0.3, harmonics=(1, 0.3)), tone(N['C4'], 0.4, 0.3, harmonics=(1, 0.3))))
write('goAround', seq(tone(N['A3'], 0.18, 0.4, harmonics=(1, 0.5)), silence(0.05), tone(N['A3'], 0.18, 0.4, harmonics=(1, 0.5))))
write('lastMinute', tone(N['A4'], 0.8, 0.35, attack=0.002, release=0.75, harmonics=(1, 0.5, 0.2)))
write('sessionOver', seq(tone(N['C4'], 0.15, 0.3), tone(N['E4'], 0.15, 0.3), tone(N['G4'], 0.15, 0.3), tone(N['C5'], 0.6, 0.3)))

# ---- music loops -------------------------------------------------------------
write('menu', pad_loop([[N['A2'], N['E3'], N['C4']], [N['F3'], N['A3'], N['C4']], [N['C3'], N['G3'], N['E4']], [N['G3'], N['B3'], N['D4']]], 4.0))
write('zen', pad_loop([[N['D3'], N['A3'], N['E4']], [N['C3'], N['G3'], N['E4']], [N['A2'], N['E3'], N['C4']]], 8.0, vol=0.2))
