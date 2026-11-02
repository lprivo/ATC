// Generates assets/sweep.png: the radar sweep's fade as a white image with an
// alpha ramp (a conic gradient), tinted with the theme's `sweep` colour at
// runtime. SVG has no conic gradient, and building one from slices leaves
// hairline seams, so it's baked here instead.
//
// The image is a square centred on the radar. The leading edge points north
// (up) at full alpha and the fade trails anticlockwise over SPAN_DEG to zero.
// Run: node scripts/make-sweep.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 1024;
const SPAN_DEG = 46; // design: 0.8 rad

const c = SIZE / 2;
const rows = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  const row = y * (1 + SIZE * 4);
  rows[row] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const dx = x + 0.5 - c;
    const dy = c - (y + 0.5);
    const r = Math.hypot(dx, dy);
    const bearing = (Math.atan2(dx, dy) * 180) / Math.PI; // clockwise from north
    const pxDeg = r > 0 ? 57.2958 / r : 360; // one pixel's width in degrees here
    // Ramp from 0 at -SPAN to 1 at 0, cut at the leading edge with one pixel of anti-aliasing.
    const ramp = Math.min(1, Math.max(0, 1 + bearing / SPAN_DEG));
    const edge = Math.min(1, Math.max(0, -bearing / pxDeg + 0.5));
    const a = bearing <= pxDeg && bearing >= -SPAN_DEG ? ramp * edge : 0;
    const i = row + 1 + x * 4;
    rows[i] = rows[i + 1] = rows[i + 2] = 255;
    rows[i + 3] = Math.round(a * 255);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let k = n;
  for (let j = 0; j < 8; j++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
  return k >>> 0;
});
const crc = (buf) => {
  let k = 0xffffffff;
  for (const b of buf) k = crcTable[(k ^ b) & 0xff] ^ (k >>> 8);
  return (k ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(rows, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(new URL('../assets/sweep.png', import.meta.url), png);
console.log(`assets/sweep.png: ${SIZE}×${SIZE}, ${(png.length / 1024).toFixed(0)} KB`);
