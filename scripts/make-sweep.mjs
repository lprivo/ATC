// Bakes the radar sweep's fade into images: white with an alpha ramp (a
// conic gradient), tinted with the theme's `sweep` colour at runtime. SVG has
// no conic gradient, and building one from SVG slices leaves hairline seams
// between them, so it's baked here instead. The ramp itself is
// src/ui/sweepRamp.ts (unit tested, including a check that the committed
// images match it), so change it there and re-run:
//   node scripts/make-sweep.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { SWEEP_IMAGES, sweepAlpha } from '../src/ui/sweepRamp.ts';

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

for (const { file, size, spanDeg } of SWEEP_IMAGES) {
  const c = size / 2;
  const rows = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4); // each row starts with filter byte 0 (none)
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      rows[i] = rows[i + 1] = rows[i + 2] = 255;
      rows[i + 3] = Math.round(sweepAlpha(x + 0.5 - c, c - (y + 0.5), spanDeg) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(new URL(`../assets/${file}`, import.meta.url), png);
  console.log(`assets/${file}: ${size}×${size}, ${spanDeg}°, ${(png.length / 1024).toFixed(0)} KB`);
}
