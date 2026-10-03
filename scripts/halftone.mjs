#!/usr/bin/env node
/**
 * Build-time halftone generator.
 *
 * Turns every image in `input` (see halftone.config.mjs) into a transparent PNG
 * of coarse, visible dots in white, black, blue, or 'duo' (white highlights +
 * black shadows, letting the blue page show through as the midtone).
 *
 * Sources with transparency (cut-out PNGs) get ragged, dotted edges. With
 * `mask: true` the script also writes a smooth silhouette `<name>.mask.png`,
 * handy for CSS masking.
 *
 * Usage:
 *   node scripts/halftone.mjs                  # process new/changed images
 *   node scripts/halftone.mjs --force          # rebuild everything
 *   node scripts/halftone.mjs --only=portrait.png --cell=24 --ink=black
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ALGORITHM_VERSION = 8; // bump to invalidate every cached output
const SOURCE_EXT = /\.(png|jpe?g|webp|avif|tiff?)$/i;
const INKS = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  blue: [0, 0, 255],
};
const INK_NAMES = [...Object.keys(INKS), 'duo', 'color'];
const PAPERS = { none: null, ...INKS };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = (await import(pathToFileURL(path.join(root, 'halftone.config.mjs')).href)).default;
const inputDir = path.join(root, config.input);
const outputDir = path.join(root, config.output);
const manifestPath = path.join(outputDir, '.manifest.json');

/* ------------------------------------------------------------------ CLI -- */

const flags = { force: false, help: false, only: null };
const cliSettings = {};
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([a-zA-Z]+)(?:=(.*))?$/);
  if (!match) continue;
  const [, key, raw = 'true'] = match;
  if (key === 'force' || key === 'help') flags[key] = true;
  else if (key === 'only') flags.only = raw.split(',').map((s) => s.trim());
  else if (key in config.defaults) cliSettings[key] = parseValue(raw);
  else console.warn(`halftone: ignoring unknown flag --${key}`);
}

if (flags.help) {
  console.log(`
halftone: build-time halftone generator

  --force            rebuild every image, ignoring the cache
  --only=a.png,b.jpg process only these source files
  --<setting>=value  override any setting for this run, e.g. --cell=24 --ink=black

Settings (defaults from halftone.config.mjs):
${Object.entries(config.defaults)
  .map(([k, v]) => `  ${k.padEnd(12)} ${JSON.stringify(v)}`)
  .join('\n')}
`);
  process.exit(0);
}

function parseValue(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const n = Number(raw);
  return Number.isFinite(n) && raw.trim() !== '' ? n : raw;
}

/* --------------------------------------------------------------- helpers -- */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const srgbToLinear = (x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Deterministic 0..1 noise per grid cell, so rebuilds are identical. */
function hash2(i, j, seed) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function validate(file, s) {
  const problems = [];
  if (!INK_NAMES.includes(s.ink)) problems.push(`ink must be one of ${INK_NAMES.join(', ')}`);
  if (!(s.paper in PAPERS)) problems.push(`paper must be one of ${Object.keys(PAPERS).join(', ')}`);
  if (!(s.cell >= 4)) problems.push('cell must be >= 4');
  if (!(s.width >= 64)) problems.push('width must be >= 64');
  if (!(s.maxDot > 0 && s.maxDot < 1)) problems.push('maxDot must be between 0 and 1');
  if (!(s.minDot >= 0 && s.minDot < s.maxDot)) problems.push('minDot must be >= 0 and < maxDot');
  if (!(s.rag >= 0 && s.rag <= 1)) problems.push('rag must be between 0 and 1');
  if (!(s.clahe >= 0 && s.clahe <= 1)) problems.push('clahe must be between 0 (off) and 1');
  if (problems.length) throw new Error(`${file}: ${problems.join('; ')}`);
}

/** Offsets (in cell units) covering a disc, used to average tone under a dot. */
function discOffsets(radius, steps) {
  const out = [];
  for (let y = 0; y < steps; y++) {
    for (let x = 0; x < steps; x++) {
      const dx = ((x + 0.5) / steps) * 2 - 1;
      const dy = ((y + 0.5) / steps) * 2 - 1;
      if (dx * dx + dy * dy <= 1) out.push([dx * radius, dy * radius]);
    }
  }
  return out;
}

/* ------------------------------------------------------------ halftoning -- */

/**
 * Compute one screen: a rotated grid of dots whose radii follow `valueOf(tone)`.
 * Returns a function that gives dot coverage (0..1) at any output pixel.
 *
 * With `colors` ({ R, G, B } planes, 0..1), each dot also takes the average
 * colour under it, scaled to full brightness (dot size carries the brightness).
 * `coverageAt.color()` returns the colour of the dot that won the last lookup.
 */
function buildScreen({ W, H, lum, alpha, hasAlpha, s, angle, valueOf, seed, colors = null }) {
  const cell = s.cell;
  const theta = (angle * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Grid-space bounds of the image corners.
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const u = (x * cos + y * sin) / cell;
    const v = (-x * sin + y * cos) / cell;
    uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
  }
  const i0 = Math.floor(uMin) - 2, i1 = Math.ceil(uMax) + 2;
  const j0 = Math.floor(vMin) - 2, j1 = Math.ceil(vMax) + 2;
  const cols = i1 - i0 + 1;
  const rows = j1 - j0 + 1;
  const radius = new Float32Array(cols * rows);
  const cellRGB = colors ? new Float32Array(cols * rows * 3) : null;

  const toneDisc = discOffsets(cell * 0.5, 5);
  const edgeReach = 0.5 + 1.5 * s.rag; // how far (in cells) the edge noise can spread
  const edgeDisc = discOffsets(cell * edgeReach, 7);
  const minR = s.minDot * cell;
  const maxR = s.maxDot * cell;

  const at = (x, y) => {
    const xi = x < 0 ? 0 : x >= W ? W - 1 : x | 0;
    const yi = y < 0 ? 0 : y >= H ? H - 1 : y | 0;
    return yi * W + xi;
  };
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      // Dot centre in image space.
      const gu = (i + 0.5) * cell;
      const gv = (j + 0.5) * cell;
      const cx = gu * cos - gv * sin;
      const cy = gu * sin + gv * cos;
      if (cx < -cell * 2 || cy < -cell * 2 || cx > W + cell * 2 || cy > H + cell * 2) continue;

      // Average tone (alpha-weighted) and coverage under the dot.
      let lSum = 0, aSum = 0, rSum = 0, gSum = 0, bSum = 0;
      for (const [dx, dy] of toneDisc) {
        const x = cx + dx, y = cy + dy;
        const k = at(x, y);
        const a = hasAlpha && !inside(x, y) ? 0 : alpha[k];
        lSum += lum[k] * a;
        aSum += a;
        if (colors) {
          rSum += colors.R[k] * a;
          gSum += colors.G[k] * a;
          bSum += colors.B[k] * a;
        }
      }
      let l = aSum > 0 ? lSum / aSum : 0;

      let cover = 1;
      if (hasAlpha) {
        let wide = 0;
        let lWide = 0;
        for (const [dx, dy] of edgeDisc) {
          const x = cx + dx, y = cy + dy;
          const a = inside(x, y) ? alpha[at(x, y)] : 0;
          wide += a;
          lWide += lum[at(x, y)] * a;
        }
        if (wide <= 0.001) continue;
        // Fringe dots just outside the shape borrow the nearest tone.
        if (aSum === 0) l = lWide / wide;
        wide /= edgeDisc.length;
        if (wide < 0.999 && s.rag > 0) {
          // Near an edge: jitter coverage so dots break up into a ragged fringe.
          wide += (hash2(i, j, seed) - 0.5) * s.rag * 1.6;
          cover = smoothstep(0.2, 0.8, wide);
        } else {
          cover = smoothstep(0.35, 0.65, wide);
        }
      }

      let t = (l - 0.5) * s.contrast + 0.5 + s.brightness;
      t = Math.pow(clamp01(t), s.gamma);
      const value = clamp01(valueOf(t)) * cover;
      const r = maxR * Math.sqrt(value);
      if (r >= minR) {
        const idx = (j - j0) * cols + (i - i0);
        radius[idx] = r;
        if (colors && aSum > 0) {
          const m = Math.max(rSum, gSum, bSum) || 1;
          cellRGB[idx * 3] = (rSum / m) * 255;
          cellRGB[idx * 3 + 1] = (gSum / m) * 255;
          cellRGB[idx * 3 + 2] = (bSum / m) * 255;
        }
      }
    }
  }

  let bestIdx = -1;
  function coverageAt(px, py) {
    const u = (px * cos + py * sin) / cell - 0.5;
    const v = (-px * sin + py * cos) / cell - 0.5;
    const iu = Math.floor(u);
    const jv = Math.floor(v);
    let best = 0;
    bestIdx = -1;
    for (let dj = 0; dj <= 1; dj++) {
      const row = (jv + dj - j0) * cols;
      for (let di = 0; di <= 1; di++) {
        const idx = row + (iu + di - i0);
        const r = radius[idx];
        if (!r) continue;
        const du = (u - (iu + di)) * cell;
        const dv = (v - (jv + dj)) * cell;
        const c = r - Math.sqrt(du * du + dv * dv) + 0.5; // 1px anti-aliased edge
        if (c > best) {
          best = c >= 1 ? 1 : c;
          bestIdx = idx;
        }
      }
    }
    return best;
  }
  coverageAt.color = () => [cellRGB[bestIdx * 3], cellRGB[bestIdx * 3 + 1], cellRGB[bestIdx * 3 + 2]];
  return coverageAt;
}

async function halftone(file, s) {
  const resized = await sharp(path.join(inputDir, file), { failOn: 'none' })
    .rotate() // respect EXIF orientation
    .resize({ width: s.width })
    .png()
    .toBuffer();
  const { data, info } = await sharp(resized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  if (s.clahe > 0) {
    // Local contrast (adaptive histogram equalisation) lifts small tonal
    // differences, like features in a flat, flash-lit face, that would
    // otherwise all print as the same dot size. maxSlope 0 means unlimited in
    // libvips (any limit leaves it nearly inert), so strength is a blend.
    const tile = Math.round(s.width / 8);
    const local = await sharp(resized)
      .clahe({ width: tile, height: tile, maxSlope: 0 })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const k = s.clahe;
    for (let p = 0; p < data.length; p += 4) {
      data[p] = data[p] * (1 - k) + local[p] * k;
      data[p + 1] = data[p + 1] * (1 - k) + local[p + 1] * k;
      data[p + 2] = data[p + 2] * (1 - k) + local[p + 2] * k;
    }
  }

  const W = info.width;
  const H = info.height;
  const N = W * H;
  const lum = new Float32Array(N);
  const alpha = new Float32Array(N);
  let clear = 0;
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    lum[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
    alpha[i] = data[p + 3] / 255;
    if (data[p + 3] < 128) clear++;
  }
  const hasAlpha = clear > N * 0.005;
  const base = { W, H, lum, alpha, hasAlpha, s };

  const layers = [];
  if (s.ink === 'color') {
    // Full-colour halftone: dot size follows brightness (the HSV value) and
    // dot colour is the local colour at full brightness, so over a dark paper
    // the dots mix back to the original colours. Dots mix in linear light, so
    // the dot area uses linear brightness; sizing by the gamma-encoded value
    // would wash the whole image out.
    const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N), V = new Float32Array(N);
    for (let i = 0, p = 0; i < N; i++, p += 4) {
      R[i] = data[p] / 255;
      G[i] = data[p + 1] / 255;
      B[i] = data[p + 2] / 255;
      V[i] = Math.max(R[i], G[i], B[i]);
    }
    layers.push({
      rgb: null,
      cov: buildScreen({ ...base, lum: V, colors: { R, G, B }, angle: s.angle, seed: s.seed, valueOf: srgbToLinear }),
    });
  } else if (s.ink === 'duo') {
    const split = clamp01(s.duoSplit);
    layers.push({
      rgb: INKS.black,
      cov: buildScreen({ ...base, angle: s.duoAngle, seed: s.seed + 1, valueOf: (t) => (split - t) / split }),
    });
    layers.push({
      rgb: INKS.white,
      cov: buildScreen({ ...base, angle: s.angle, seed: s.seed, valueOf: (t) => (t - split) / (1 - split) }),
    });
  } else {
    const light = s.ink === 'white'; // white ink prints the highlights; dark inks print the shadows
    layers.push({
      rgb: INKS[s.ink],
      cov: buildScreen({ ...base, angle: s.angle, seed: s.seed, valueOf: (t) => (light ? t : 1 - t) }),
    });
  }

  // Rasterise: composite layers bottom-to-top with straight alpha.
  const paper = PAPERS[s.paper];
  const out = Buffer.alloc(N * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (const layer of layers) {
        const c = layer.cov(x + 0.5, y + 0.5);
        if (c <= 0) continue;
        const ink = layer.rgb ?? layer.cov.color();
        const na = c + a * (1 - c);
        r = (ink[0] * c + r * a * (1 - c)) / na;
        g = (ink[1] * c + g * a * (1 - c)) / na;
        b = (ink[2] * c + b * a * (1 - c)) / na;
        a = na;
      }
      if (paper) {
        // Solid backing: blend the dots over it and make the pixel opaque.
        r = r * a + paper[0] * (1 - a);
        g = g * a + paper[1] * (1 - a);
        b = b * a + paper[2] * (1 - a);
        a = 1;
      }
      const p = (y * W + x) * 4;
      out[p] = r; out[p + 1] = g; out[p + 2] = b; out[p + 3] = Math.round(a * 255);
    }
  }

  const name = path.parse(file).name;
  const outputs = [];
  const dotsPath = path.join(outputDir, `${name}.png`);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .png(
      s.ink === 'color'
        ? { compressionLevel: 9, effort: 10 } // full colour: a palette would band it
        : // quality < 100 matters: at 100, sharp silently falls back to full
          // RGBA whenever the palette cannot be exact.
          { palette: true, colours: 128, quality: 85, dither: 0, compressionLevel: 9, effort: 10 },
    )
    .toFile(dotsPath);
  outputs.push(dotsPath);

  if (hasAlpha && s.mask) {
    outputs.push(await silhouette(name, alpha, W, H, s));
  }
  return { outputs, W, H, hasAlpha };
}

/**
 * Smooth silhouette of a cut-out, grown so it encloses the ragged dot fringe.
 * White on transparent; CSS masks it to any colour.
 */
async function silhouette(name, alpha, W, H, s) {
  const plane = Buffer.alloc(W * H);
  for (let i = 0; i < plane.length; i++) plane[i] = alpha[i] * 255;
  const raw1 = { raw: { width: W, height: H, channels: 1 } };

  // Separate pipelines because sharp applies operations in a fixed order within
  // one pipeline; extractChannel keeps the buffer single-channel between steps.
  const step = (buf, op) => op(sharp(buf, raw1)).extractChannel(0).raw().toBuffer();
  const grow = s.cell * (0.9 + 1.5 * s.rag);
  // Blur + low threshold = dilation by roughly 1.2 * sigma.
  let m = await step(plane, (p) => p.blur(Math.max(0.5, grow / 1.2)).threshold(30));
  m = await step(m, (p) => p.blur(Math.max(0.5, s.cell / 3)).threshold(128));
  m = await step(m, (p) => p.blur(0.7));

  const rgba = Buffer.alloc(W * H * 4, 255);
  for (let i = 0; i < W * H; i++) rgba[i * 4 + 3] = m[i];
  const maskPath = path.join(outputDir, `${name}.mask.png`);
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: Math.round(W / 2) }) // smooth shape: half resolution is plenty
    .png({ palette: true, colours: 16, quality: 60, dither: 0, compressionLevel: 9, effort: 10 })
    .toFile(maskPath);
  return maskPath;
}

/* ------------------------------------------------------------------ main -- */

async function main() {
  if (!existsSync(inputDir)) {
    console.log(`halftone: no source folder at ${config.input}, nothing to do.`);
    return;
  }
  await fs.mkdir(outputDir, { recursive: true });

  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    // first run
  }

  const sources = (await fs.readdir(inputDir)).filter((f) => SOURCE_EXT.test(f)).sort();

  // Two sources with the same base name would overwrite each other.
  const seen = new Map();
  for (const f of sources) {
    const n = path.parse(f).name;
    if (seen.has(n)) throw new Error(`halftone: "${seen.get(n)}" and "${f}" share a name; rename one.`);
    seen.set(n, f);
  }

  // Remove outputs whose source was deleted.
  for (const [file, entry] of Object.entries(manifest)) {
    if (sources.includes(file)) continue;
    for (const out of entry.outputs ?? []) await fs.rm(path.join(outputDir, out), { force: true });
    delete manifest[file];
    console.log(`halftone: removed outputs for deleted source ${file}`);
  }

  const todo = flags.only ? sources.filter((f) => flags.only.includes(f)) : sources;
  if (flags.only && todo.length === 0) console.warn(`halftone: --only matched no files in ${config.input}`);

  let built = 0;
  for (const file of todo) {
    const settings = { ...config.defaults, ...(config.images?.[file] ?? {}), ...cliSettings };
    validate(file, settings);

    const bytes = await fs.readFile(path.join(inputDir, file));
    const hash = crypto
      .createHash('sha1')
      .update(String(ALGORITHM_VERSION))
      .update(JSON.stringify(settings))
      .update(bytes)
      .digest('hex');

    const cached = manifest[file];
    const intact = cached?.outputs?.every((o) => existsSync(path.join(outputDir, o)));
    if (!flags.force && cached?.hash === hash && intact) continue;

    const started = performance.now();
    const { outputs, W, H, hasAlpha } = await halftone(file, settings);
    const sizes = await Promise.all(outputs.map((o) => fs.stat(o).then((st) => st.size)));
    const names = outputs.map((o) => path.basename(o));
    // Drop files an earlier run wrote but this one no longer does (e.g. a mask
    // after `mask` was switched off).
    for (const old of cached?.outputs ?? []) {
      if (!names.includes(old)) await fs.rm(path.join(outputDir, old), { force: true });
    }
    manifest[file] = { hash, outputs: names };
    built++;

    console.log(
      `halftone: ${file} -> ${outputs.map((o) => path.basename(o)).join(' + ')}  ` +
        `${W}x${H}  ink=${settings.ink} cell=${settings.cell} angle=${settings.angle}` +
        `${hasAlpha ? ' cut-out' : ''}  ${(sizes.reduce((a, b) => a + b, 0) / 1024).toFixed(0)} KB  ` +
        `${Math.round(performance.now() - started)} ms`,
    );
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`halftone: ${built} built, ${todo.length - built} up to date.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
