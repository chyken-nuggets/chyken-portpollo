// Halftone settings for scripts/halftone.mjs.
//
// Every file in `input` is turned into a transparent PNG of coarse dots in
// `output`, with the same base name. Settings merge in this order:
//   defaults  <  images['file-name.ext']  <  CLI flags (--cell=20 etc.)
//
// All sizes are in OUTPUT pixels. The site shows images at roughly half their
// output width on a 2x screen, so `cell: 16` reads as ~8 CSS px dots.

export default {
  input: 'src/assets/source',
  output: 'src/assets/halftone',

  defaults: {
    width: 1600, // output width in px; height follows the aspect ratio
    cell: 22, // dot pitch in px (bigger = coarser, more "blown-up newspaper")
    angle: 45, // screen angle in degrees (classic single-ink angle is 45)
    ink: 'white', // 'white' | 'black' | 'blue' | 'duo' (white highlights + black shadows) | 'color' (dots keep the photo's colours)
    paper: 'none', // solid backing behind the dots: 'none' (transparent) | 'black' | 'white' | 'blue'
    duoAngle: 15, // screen angle for the black layer in 'duo' mode
    duoSplit: 0.36, // tone where 'duo' hands over from black to white dots; lower = less black
    contrast: 1.2, // >1 punches tones apart, <1 flattens them
    brightness: 0, // -1..1 shift before contrast
    gamma: 1, // >1 darkens midtones, <1 lightens them
    minDot: 0.1, // dots smaller than this fraction of a cell are dropped (clean paper)
    maxDot: 0.72, // largest dot radius as a fraction of a cell (>0.5 lets dots merge)
    rag: 0.45, // 0..1 noise at transparent edges; higher = more ragged, dotted cut-out edge
    mask: false, // also write <name>.mask.png (a smooth silhouette) for sources with transparency
    clahe: 0, // 0..1 local-contrast strength before halftoning; 0.4-0.8 brings out faces in flat, flash-lit photos
    seed: 7, // random seed for the edge noise, so builds are repeatable
  },

  // Per-image overrides, keyed by source file name.
  images: {
    // Full-colour halftone on black paper: the dots keep the photo's own colours
    // (on the site's blue they'd take a blue cast). maxDot 0.62 keeps the dot
    // structure visible even in the bright hat and face.
    'portrait.jpg': { ink: 'color', paper: 'black', cell: 16, maxDot: 0.62, contrast: 1, gamma: 1, brightness: 0 },
    'cover-assembl-ar.png': { ink: 'duo', contrast: 1.25 },
    'cover-logic-circuits.png': { ink: 'white', cell: 24, contrast: 1.3 },
    'cover-ironman.png': { ink: 'duo', width: 1400, contrast: 1.2 },
  },
};
