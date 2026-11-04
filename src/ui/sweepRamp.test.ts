import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { SWEEP_IMAGES, SWEEP_SPAN_DEG, sweepAlpha } from './sweepRamp';

/** Alpha at a bearing (degrees clockwise from north) and radius (px). */
const at = (bearing: number, r: number, span = SWEEP_SPAN_DEG) =>
  sweepAlpha(Math.sin((bearing * Math.PI) / 180) * r, Math.cos((bearing * Math.PI) / 180) * r, span);

describe('sweep ramp', () => {
  it('is full just behind the leading edge and fades to nothing at the tail', () => {
    expect(at(-0.5, 400)).toBeGreaterThan(0.98);
    expect(at(-SWEEP_SPAN_DEG / 2, 400)).toBeCloseTo(0.5, 2);
    expect(at(-SWEEP_SPAN_DEG - 0.01, 400)).toBe(0);
  });

  it('is empty ahead of the leading edge and on the far side', () => {
    expect(at(2, 400)).toBe(0);
    expect(at(90, 400)).toBe(0);
    expect(at(180, 400)).toBe(0);
  });

  it('fades in one continuous gradient: monotonic, with no step a visible band', () => {
    let prev = at(-0.5, 400);
    for (let b = -0.6; b > -SWEEP_SPAN_DEG; b -= 0.1) {
      const a = at(b, 400);
      expect(a).toBeLessThanOrEqual(prev + 1e-12);
      expect(prev - a).toBeLessThan(0.005);
      prev = a;
    }
  });

  it('anti-aliases the leading edge over about one pixel', () => {
    const pxDeg = 180 / Math.PI / 400;
    expect(at(pxDeg * 0.25, 400)).toBeGreaterThan(0.2);
    expect(at(pxDeg * 0.25, 400)).toBeLessThan(0.3);
    expect(at(pxDeg * 0.6, 400)).toBe(0);
  });
});

/** Alpha channel of a PNG written by make-sweep.mjs (8-bit RGBA, filter 0 on every row). */
function pngAlpha(path: string) {
  const buf = readFileSync(path);
  const size = buf.readUInt32BE(16);
  const idat: Buffer[] = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    if (buf.toString('ascii', o + 4, o + 8) === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const rows = inflateSync(Buffer.concat(idat));
  return { size, alpha: (x: number, y: number) => rows[y * (1 + size * 4) + 1 + x * 4 + 3], filter: (y: number) => rows[y * (1 + size * 4)] };
}

describe('baked sweep images', () => {
  it.each(SWEEP_IMAGES)('assets/$file matches the ramp (re-run scripts/make-sweep.mjs if not)', ({ file, size, spanDeg }) => {
    const png = pngAlpha(`${__dirname}/../../assets/${file}`);
    expect(png.size).toBe(size);
    const c = size / 2;
    for (let y = 0; y < size; y += 7) {
      expect(png.filter(y)).toBe(0);
      for (let x = 0; x < size; x += 5) {
        expect(png.alpha(x, y)).toBe(Math.round(sweepAlpha(x + 0.5 - c, c - (y + 0.5), spanDeg) * 255));
      }
    }
  });
});
