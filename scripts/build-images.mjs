#!/usr/bin/env node
// Builds responsive WebP derivatives for every photo under images/ and writes
// scripts/image-manifest.json (dimensions, average color, tiny blurred placeholder).
//
//   node scripts/build-images.mjs          # only rebuilds stale outputs
//   node scripts/build-images.mjs --force  # rebuilds everything
//
// Requires ImageMagick 7 (`magick`) with WebP support.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC_DIRS = ['hero', 'portraits', 'product-moody', 'product-pop', 'about'];
const WIDTHS = [480, 960, 1440, 1920];
const QUALITY = 82;
const FORCE = process.argv.includes('--force');
const OUT_ROOT = path.join(ROOT, 'images', 'opt');
const MANIFEST = path.join(ROOT, 'scripts', 'image-manifest.json');

const manifest = fs.existsSync(MANIFEST) && !FORCE ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

function magick(args) { return execFileSync('magick', args, { encoding: 'utf8' }).trim(); }
function isStale(src, out) {
  if (FORCE || !fs.existsSync(out)) return true;
  return fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs;
}

let built = 0;
for (const dir of SRC_DIRS) {
  const srcDir = path.join(ROOT, 'images', dir);
  if (!fs.existsSync(srcDir)) continue;
  const outDir = path.join(OUT_ROOT, dir);
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of fs.readdirSync(srcDir).sort()) {
    if (!/\.(jpe?g|png|webp|tiff?)$/i.test(file)) continue;
    const src = path.join(srcDir, file);
    const base = file.replace(/\.[^.]+$/, '');
    const key = `${dir}/${base}`;

    const [w, h] = magick(['identify', '-auto-orient', '-format', '%w %h', src + '[0]']).split(' ').map(Number);
    const widths = [...new Set(WIDTHS.map(t => Math.min(t, w)))];

    const variants = [];
    for (const target of widths) {
      const out = path.join(outDir, `${base}-${target}.webp`);
      if (isStale(src, out)) {
        magick([src + '[0]', '-auto-orient', '-strip', '-colorspace', 'sRGB',
          '-filter', 'Lanczos', '-resize', `${target}x>`, '-unsharp', '0x0.6+0.5+0.02',
          '-quality', String(QUALITY), '-define', 'webp:method=6', out]);
        built++;
      }
      variants.push({ w: target, h: Math.round(h * target / w), src: `images/opt/${dir}/${base}-${target}.webp` });
    }

    // Tiny placeholder (24px wide JPEG, inlined as a data URI) + average color.
    if (!manifest[key] || FORCE || manifest[key].w !== w || manifest[key].h !== h || !manifest[key].lqip) {
      const lqip = execFileSync('magick', [src + '[0]', '-auto-orient', '-strip', '-resize', '24x24>',
        '-quality', '50', '-interlace', 'none', 'jpeg:-']).toString('base64');
      const avg = magick([src + '[0]', '-resize', '1x1!', '-format', '#%[hex:u.p{0,0}]', 'info:']).slice(0, 7);
      manifest[key] = { w, h, avg, lqip: `data:image/jpeg;base64,${lqip}` };
    }
    manifest[key].variants = variants;
    manifest[key].original = `images/${dir}/${file}`;
  }
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`built ${built} derivative(s); manifest has ${Object.keys(manifest).length} images -> ${path.relative(ROOT, MANIFEST)}`);
