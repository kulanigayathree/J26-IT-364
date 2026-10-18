// Generates the PWA icons in public/icons/ without extra dependencies.
// Run: npm run icons. Colours are navy, coral and paper from src/design/tokens.ts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const NAVY = [0x13, 0x29, 0x4b];
const CORAL = [0xd9, 0x65, 0x3b];
const PAPER = [0xfb, 0xf8, 0xf2];

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const SS = 4; // 4x4 supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = pixel((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
          acc[0] += c[0];
          acc[1] += c[1];
          acc[2] += c[2];
        }
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = Math.round(acc[0] / (SS * SS));
      raw[o + 1] = Math.round(acc[1] / (SS * SS));
      raw[o + 2] = Math.round(acc[2] / (SS * SS));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Coral sun over two paper waves on navy. `scale` < 1 keeps the mark inside the maskable safe zone. */
function mark(scale) {
  return (u, v) => {
    const x = 0.5 + (u - 0.5) / scale;
    const y = 0.5 + (v - 0.5) / scale;
    if ((x - 0.5) ** 2 + (y - 0.4) ** 2 < 0.17 ** 2) return CORAL;
    for (const [base, thick] of [
      [0.66, 0.045],
      [0.78, 0.035],
    ]) {
      const wave = base + 0.035 * Math.sin((x - 0.1) * Math.PI * 4);
      if (x > 0.14 && x < 0.86 && Math.abs(y - wave) < thick / 2) return PAPER;
    }
    return NAVY;
  };
}

const icons = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.78],
  ['apple-touch-icon.png', 180, 0.9],
];
for (const [name, size, scale] of icons) {
  writeFileSync(join(outDir, name), png(size, mark(scale)));
  console.log(`wrote public/icons/${name}`);
}
