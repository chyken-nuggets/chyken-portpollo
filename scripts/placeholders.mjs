#!/usr/bin/env node
/**
 * Writes grayscale placeholder "photos" into src/assets/source so the halftone
 * pipeline has something to chew on before you add real images.
 *
 * Existing files are never overwritten unless you pass --force, so running this
 * after dropping in your own portrait (in any format) is safe.
 *
 *   node scripts/placeholders.mjs
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/assets/source');
const force = process.argv.includes('--force');

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

// Shared blur for soft shading.
const soft = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

const images = {
  // Head-and-shoulders bust, transparent. Replace with your own cut-out portrait.
  'portrait.png': svg(
    1200,
    1500,
    `<defs>
      <radialGradient id="skin" cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stop-color="#fafafa"/><stop offset="0.45" stop-color="#b4b4b4"/><stop offset="1" stop-color="#262626"/>
      </radialGradient>
      <radialGradient id="cloth" cx="0.3" cy="0.15" r="1">
        <stop offset="0" stop-color="#d8d8d8"/><stop offset="0.5" stop-color="#6a6a6a"/><stop offset="1" stop-color="#101010"/>
      </radialGradient>
      <linearGradient id="neck" x1="0" x2="1"><stop offset="0" stop-color="#9a9a9a"/><stop offset="1" stop-color="#2e2e2e"/></linearGradient>
      <radialGradient id="hair" cx="0.35" cy="0.25" r="0.9">
        <stop offset="0" stop-color="#7a7a7a"/><stop offset="0.6" stop-color="#2a2a2a"/><stop offset="1" stop-color="#050505"/>
      </radialGradient>
      ${soft('s1', 16)}${soft('s2', 40)}
      <clipPath id="head"><ellipse cx="600" cy="610" rx="252" ry="318"/></clipPath>
    </defs>
    <path d="M90 1500 C110 1260 280 1140 470 1100 L730 1100 C920 1140 1090 1260 1110 1500 Z" fill="url(#cloth)"/>
    <path d="M495 860 L705 860 L728 1128 C660 1182 540 1182 472 1128 Z" fill="url(#neck)"/>
    <ellipse cx="600" cy="610" rx="252" ry="318" fill="url(#skin)"/>
    <g clip-path="url(#head)"><g filter="url(#s2)" opacity="0.45"><ellipse cx="780" cy="700" rx="90" ry="240" fill="#111"/></g></g>
    <g filter="url(#s1)" opacity="0.75" clip-path="url(#head)">
      <ellipse cx="510" cy="610" rx="62" ry="28" fill="#1a1a1a"/>
      <ellipse cx="692" cy="610" rx="62" ry="28" fill="#1a1a1a"/>
      <path d="M598 640 L646 740 L586 752 Z" fill="#2a2a2a"/>
      <ellipse cx="604" cy="820" rx="78" ry="20" fill="#2a2a2a"/>
    </g>
    <path d="M338 600 C318 330 470 232 612 236 C800 242 900 372 866 600 C846 486 780 420 690 404 C590 388 450 430 392 500 C362 536 346 566 338 600 Z" fill="url(#hair)"/>
    <path d="M470 1100 L600 1230 L730 1100 L770 1122 L600 1300 L430 1122 Z" fill="#efefef"/>`,
  ),

  // ASSEMBL-AR stand-in: a phone outlining a part of a small wheeled robot kit. Transparent.
  'cover-assembl-ar.png': svg(
    1600,
    1200,
    `<defs>
      <linearGradient id="chassis" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b4b4b4"/><stop offset="0.6" stop-color="#5a5a5a"/><stop offset="1" stop-color="#1e1e1e"/></linearGradient>
      <linearGradient id="pcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a9a9a"/><stop offset="1" stop-color="#4a4a4a"/></linearGradient>
      <radialGradient id="wheel" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#7a7a7a"/><stop offset="0.7" stop-color="#2a2a2a"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient>
      <linearGradient id="phone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a5a5a"/><stop offset="1" stop-color="#0c0c0c"/></linearGradient>
      <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e5e5e"/><stop offset="1" stop-color="#3a3a3a"/></linearGradient>
    </defs>
    <rect x="220" y="560" width="540" height="300" rx="24" fill="url(#chassis)"/>
    <rect x="300" y="470" width="360" height="110" rx="10" fill="url(#pcb)"/>
    <rect x="330" y="440" width="70" height="40" fill="#e6e6e6"/>
    <rect x="440" y="430" width="120" height="50" fill="#2a2a2a"/>
    <rect x="590" y="445" width="40" height="35" fill="#cfcfcf"/>
    <circle cx="320" cy="880" r="115" fill="url(#wheel)"/>
    <circle cx="660" cy="880" r="115" fill="url(#wheel)"/>
    <circle cx="320" cy="880" r="38" fill="#9a9a9a"/>
    <circle cx="660" cy="880" r="38" fill="#9a9a9a"/>
    <g transform="rotate(-8 1140 600)">
      <rect x="930" y="190" width="420" height="820" rx="56" fill="url(#phone)"/>
      <rect x="962" y="250" width="356" height="700" rx="18" fill="url(#screen)"/>
      <rect x="1010" y="570" width="260" height="150" rx="10" fill="#9a9a9a"/>
      <rect x="990" y="548" width="300" height="194" fill="none" stroke="#fff" stroke-width="18" stroke-dasharray="48 26"/>
      <path d="M1140 320 V480 M1084 424 L1140 488 L1196 424" fill="none" stroke="#fff" stroke-width="24" stroke-linejoin="miter"/>
      <circle cx="1270" cy="300" r="26" fill="#fff"/>
    </g>`,
  ),

  // Logic Circuits stand-in: an AND gate feeding an OR gate that lights a lamp.
  'cover-logic-circuits.png': svg(
    1600,
    1200,
    `<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c0c0c"/><stop offset="1" stop-color="#1c1c1c"/></linearGradient>
      <radialGradient id="gate" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#bdbdbd"/><stop offset="1" stop-color="#7a7a7a"/></radialGradient>
      <radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff"/><stop offset="0.6" stop-color="#e8e8e8"/><stop offset="1" stop-color="#9a9a9a"/></radialGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
    </defs>
    <rect width="1600" height="1200" fill="url(#bg)"/>
    <g fill="none" stroke="#cfcfcf" stroke-width="26" stroke-linejoin="miter">
      <path d="M150 380 H520"/>
      <path d="M150 560 H520"/>
      <path d="M840 470 H930 V570 H1040"/>
      <path d="M150 880 H930 V730 H1040"/>
      <path d="M1320 650 H1420"/>
    </g>
    <rect x="90" y="345" width="70" height="70" fill="#fff"/>
    <rect x="90" y="525" width="70" height="70" fill="#fff"/>
    <rect x="90" y="845" width="70" height="70" fill="#6a6a6a"/>
    <path d="M520 300 H670 A170 170 0 0 1 670 640 H520 Z" fill="url(#gate)"/>
    <path d="M990 470 Q1120 470 1200 530 Q1280 590 1330 650 Q1280 710 1200 770 Q1120 830 990 830 Q1070 650 990 470 Z" fill="url(#gate)"/>
    <circle cx="1490" cy="650" r="150" fill="#fff" opacity="0.35" filter="url(#glow)"/>
    <circle cx="1490" cy="650" r="75" fill="url(#lamp)"/>`,
  ),

  // Iron Man Armor Mod stand-in: a palladium-core arc reactor. Transparent.
  'cover-ironman.png': svg(
    1400,
    1400,
    `<defs>
      <radialGradient id="housing" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#e0e0e0"/><stop offset="0.55" stop-color="#5a5a5a"/><stop offset="1" stop-color="#141414"/></radialGradient>
      <linearGradient id="coil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a5a5a"/><stop offset="0.5" stop-color="#d4d4d4"/><stop offset="1" stop-color="#4a4a4a"/></linearGradient>
      <radialGradient id="core" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#f0f0f0"/><stop offset="1" stop-color="#8a8a8a"/></radialGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
    </defs>
    <circle cx="700" cy="700" r="560" fill="url(#housing)"/>
    <circle cx="700" cy="700" r="470" fill="#202020"/>
    ${Array.from({ length: 10 }, (_, i) => `<rect x="645" y="250" width="110" height="160" rx="10" fill="url(#coil)" transform="rotate(${i * 36} 700 700)"/>`).join("")}
    <circle cx="700" cy="700" r="270" fill="#3a3a3a"/>
    <circle cx="700" cy="700" r="320" fill="#fff" opacity="0.3" filter="url(#glow)"/>
    <circle cx="700" cy="700" r="235" fill="url(#core)"/>
    <circle cx="700" cy="700" r="110" fill="#fff"/>`,
  ),
};

await fs.mkdir(dir, { recursive: true });
const existing = await fs.readdir(dir);
for (const [file, markup] of Object.entries(images)) {
  const target = path.join(dir, file);
  // Your own image under the same name (e.g. portrait.jpg) always wins; a
  // second portrait.* would also clash in the halftone output.
  const base = path.parse(file).name;
  const yours = existing.find((f) => f !== file && path.parse(f).name === base);
  if (yours) {
    console.log(`placeholders: kept your ${yours} (skipped ${file})`);
    continue;
  }
  if (existsSync(target) && !force) {
    console.log(`placeholders: kept existing ${file}`);
    continue;
  }
  await sharp(Buffer.from(markup)).png().toFile(target);
  console.log(`placeholders: wrote ${file}`);
}
