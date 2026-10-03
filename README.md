# D.E. Vidar: portfolio

A personal portfolio for **Dennis Ezekiel Vidar**, built with Astro in a "blue-screen zine" style. It's a calm, terminal-like blue canvas with white monospace text, with coarse halftone images in plain, bordered web 1.0 frames.

- **Astro 7**, static output, **zero client JS** except one small inline script for the typing effect.
- **Plain CSS**: global tokens plus component-scoped styles. No Tailwind, no UI libraries.
- **Halftones are made at build time** by a sharp script. Nothing is processed in the browser.
- Projects live in a typed **content collection** (Markdown or MDX).

```
npm install
npm run dev        # http://localhost:4321  (runs the halftone script first)
```

---

## Contents

1. [Project structure](#project-structure)
2. [Design system](#design-system)
3. [Replace the placeholder content](#replace-the-placeholder-content)
4. [Add a project](#add-a-project)
5. [Prepare images and cut-outs](#prepare-images-and-cut-outs)
6. [The halftone script](#the-halftone-script)
7. [Components](#components)
8. [Motion and accessibility](#motion-and-accessibility)
9. [Run locally](#run-locally)
10. [Deploy](#deploy)
11. [Troubleshooting](#troubleshooting)

---

## Project structure

```
.
├── astro.config.mjs          site/base URL, MDX, image encoder settings
├── halftone.config.mjs       halftone settings: defaults + per-image overrides
├── scripts/
│   ├── halftone.mjs          build-time halftone generator (sharp)
│   └── placeholders.mjs      draws stand-in images (skips any you've replaced)
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   ├── source/           your original images go here (committed)
│   │   └── halftone/         generated dots (git-ignored, rebuilt)
│   ├── components/
│   │   ├── Header.astro      boxed nav with DOS-style path
│   │   ├── Footer.astro
│   │   ├── Logo.astro        the DEV emblem (paths, no font dependency)
│   │   ├── Section.astro     full-bleed blue/white surface
│   │   ├── Label.astro       white-box extra-wide display type
│   │   ├── Cursor.astro      block cursor
│   │   ├── TypedText.astro   typed intro lines (the only script)
│   │   ├── HalftoneImage.astro
│   │   ├── Figure.astro      framed halftone + [IMG] file bar
│   │   └── ProjectCard.astro
│   ├── content/projects/     one .md/.mdx per project
│   ├── content.config.ts     typed project schema
│   ├── data/site.ts          your name, bio, links: all personal text
│   ├── layouts/BaseLayout.astro
│   ├── lib/                  url() helper, project queries, seeded random
│   ├── pages/
│   │   ├── index.astro       boot screen -> intro table -> selected work -> hello
│   │   ├── work/index.astro  directory listing + cards
│   │   ├── work/[id].astro   project page
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   └── 404.astro         blue-screen error
│   └── styles/
│       ├── tokens.css        colour, type, spacing tokens
│       └── global.css        reset, surfaces, links, prose
├── .github/workflows/deploy.yml   GitHub Pages deploy
└── references/               mood images (git-ignored, never imported)
```

---

## Design system

### Colour

| Token     | Value     | Use                                                                   |
| --------- | --------- | --------------------------------------------------------------------- |
| `--blue`  | `#0000ff` | Default paper                                                         |
| `--white` | `#ffffff` | Default ink; flipped sections use it as paper                         |
| `--black` | `#000000` | Depth only: halftone darks and tiny details                           |

Every surface sets three contextual tokens, which components use instead of raw colours:

- `.paper-blue` sets `--paper: blue`, `--ink: white`, `--focus: white`.
- `.paper-white` sets `--paper: white`, `--ink: blue`, `--focus: blue`.

Rules the code follows:

- Text is only ever white on blue or blue on white (both about 8.6:1). Never black on blue (about 2.4:1).
- There are no other hues, no grays, no gradients and no shadows. In-between tones come only from halftone dot size.
- **Two exceptions:** your portrait is a full-colour halftone on black (so it keeps the photo's real colours), and the page-change glitch flashes magenta and cyan fringes for about 350ms. Everything else is strictly blue, white and black.

### Type

- **Mono voice:** JetBrains Mono 400/700, self-hosted via `@fontsource`. Body text scales fluidly from 16 to 18px, line-height 1.6, tracking +0.02em. Code ligatures are off, so `->` stays two characters.
- **Display:** Archivo Variable at `wdth 125` and `wght 900`, uppercase. It's used in `Label`, card titles and starbursts.

| Token         | Range      | Used for                  |
| ------------- | ---------- | ------------------------- |
| `--fs-meta`   | 13px       | metadata, captions        |
| `--fs-small`  | 14px       | nav                       |
| `--fs-body`   | 16 -> 18px | body                      |
| `--fs-lead`   | 17 -> 22px | intro paragraphs          |
| `--fs-d3`     | 18 -> 24px | card titles, prose `h2`   |
| `--fs-d2`     | 26 -> 48px | section labels            |
| `--fs-d1`     | 36 -> 88px | page titles               |

Spacing runs on an 8px rhythm (`--s-1` 4px up to `--s-8` 160px). Borders are 2px (`--rule`) or 4px (`--rule-thick`), and corners are always square.

### Web 1.0 details

The base is the blue screen: flat colour, mono text, lots of space. On top of that sit a few old-web conventions, used plainly:

- **Framed images.** Every halftone sits in a `Figure`: a bordered box with cell padding and a directory-listing bar underneath (`[IMG] portrait.png    1600x2000`). Images are always upright rectangles; cut-outs keep their ragged dotted edges inside the frame.
- **Bordered tables.** The home intro is a two-cell table with an outer border, cell spacing and bordered cells.
- **Bullet link lists, underlined links, `C:\DEV\WORK>` paths, and a "Last updated" date** in the footer (the build date).

There are no textures, badges, stickers or decorative shapes. In-between tones come only from halftone dots.

---

## Replace the placeholder content

Placeholders are wrapped in `[square brackets]`, so searching for `[` finds them all. You can also run `grep -rn "\[" src/data src/content`.

1. **`src/data/site.ts`**: role, bio, location, availability line, email, socials, and the About page's tools, log and capabilities.
2. **Portrait**: your photo lives at `src/assets/source/portrait.jpg` and appears in the home intro and on the About page. To swap it, replace that file (any format: a cut-out PNG works too, and keeps a ragged dotted edge), tune its entry in `halftone.config.mjs`, and update the alt text in `src/pages/index.astro` and `src/pages/about.astro`.
3. **Projects**: the three entries in `src/content/projects/` come from your GitHub repos. Their covers are stand-in illustrations; replace them with real screenshots when you have them (see [Add a project](#add-a-project)). Setting `placeholder: true` on an entry shows a PLACEHOLDER tag on its card.
4. **`astro.config.mjs`**: set `site` to your real URL (it's used for canonical links and social tags).
5. Optionally, remove the stand-in sources you no longer use from `src/assets/source/`. Their halftones are cleaned up automatically.

---

## Add a project

1. Put the cover image in `src/assets/source/`, e.g. `cover-zine.png`. See [Prepare images](#prepare-images-and-cut-outs).
2. Optionally tune it in `halftone.config.mjs`:
   ```js
   images: {
     'cover-zine.png': { ink: 'duo', cell: 24 },
   }
   ```
3. Run `npm run halftone`. This writes `src/assets/halftone/cover-zine.png`.
4. Create `src/content/projects/my-zine.md`. The file name becomes the URL: `/work/my-zine/`.

```md
---
title: My Zine
year: 2026
role: Design, print production
summary: One or two sentences for the card and the page description.
tags: [print, zine]
cover: ../../assets/halftone/cover-zine.png
coverAlt: A halftone photo of the zine's cover spread on a desk.
links:
  - label: Shop
    url: https://example.com
featured: true      # show on the home page (up to 4)
order: 0            # tie-breaker within the same year; lower comes first
draft: false        # true = only visible in `npm run dev`
---

## Brief

Your write-up in Markdown...
```

The schema lives in `src/content.config.ts`. A missing or mistyped field fails the build with a clear message.

| Field       | Type                      | Notes                                                      |
| ----------- | ------------------------- | ---------------------------------------------------------- |
| `title`     | string                    |                                                            |
| `year`      | integer                   | Sorts projects, newest first                               |
| `role`      | string                    |                                                            |
| `summary`   | string, ≤300 chars        | Card text and `<meta name="description">`                  |
| `tags`      | string[]                  | Optional                                                   |
| `cover`     | image path                | A generated halftone                                       |
| `coverAlt`  | string                    | Describe the subject                                       |
| `links`     | `{label, url}[]`          | Optional                                                   |
| `featured`  | boolean                   | Home page selection; falls back to the newest 4            |
| `order`     | number                    |                                                            |
| `draft`     | boolean                   |                                                            |
| `placeholder` | boolean                 | Shows a PLACEHOLDER tag                                    |

Use **`.mdx`** when you want components inside the write-up, for example an inline framed figure:

```mdx
import Figure from '../../components/Figure.astro';
import detail from '../../assets/halftone/detail-zine.png';

<Figure src={detail} alt="..." caption="Fig. 02: Spread detail" />
```

Figures (and plain Markdown images) sit on a blue panel, so use `white` or `duo` ink for them.

---

## Prepare images and cut-outs

**Source images** go in `src/assets/source/` (PNG, JPG, WebP, AVIF or TIFF). They are the originals; the site only ever shows their halftones.

- **Size:** at least 1600px wide. The script resizes to `width` (default 1600).
- **Contrast matters more than resolution.** Halftones flatten detail into dot size, so pick images with a clear subject, strong light and a simple background. Push contrast before exporting if the image looks flat.
- **Colour is ignored.** Everything is converted to luminance.

**Cut-outs** (the subject with no background):

1. Remove the background in your editor of choice (Photoshop's *Remove Background*, Photopea, Affinity, or macOS *Lift subject*), and export a **transparent PNG**.
2. Leave some transparent margin around the subject. The dotted fringe spreads outwards by about two dot-widths.
3. The script breaks the edge up into a ragged, dotted fringe. Turn `rag` up for rougher edges or down for cleaner ones.

**Rectangular photos** need nothing extra: the dots fill the frame edge to edge.

Either way, show the result with `<Figure>`. For cards and other fixed-shape slots, pass `ratio="4 / 3"` and the image is fitted inside the frame.

---

## The halftone script

`scripts/halftone.mjs` converts every file in `src/assets/source/` into a transparent PNG of coarse, visible dots in `src/assets/halftone/`. It runs automatically before `dev`, `build` and `check`, and only rebuilds images whose source or settings changed. Changes are tracked by hash in `.manifest.json`.

```bash
npm run halftone                                   # new/changed images only
npm run halftone -- --force                        # rebuild everything
npm run halftone -- --only=portrait.jpg --cell=28  # try settings on one image
npm run halftone -- --help                         # list every setting
```

CLI settings apply to that run only. To keep a setting, put it in `halftone.config.mjs`.

### Settings

Sizes are in **output pixels**. Images display at roughly half their output width on a 2x screen, so `cell: 22` reads as dots about 11 CSS px apart.

| Setting      | Default   | What it does                                                                                                   |
| ------------ | --------- | -------------------------------------------------------------------------------------------------------------- |
| `width`      | `1600`    | Output width; height follows the aspect ratio                                                                   |
| `cell`       | `22`      | **Dot size/pitch.** Bigger means coarser, more "blown-up newspaper". Try 16–32                                  |
| `angle`      | `45`      | **Screen angle** in degrees. 45 is the classic single-ink angle; 15, 30 and 60 also look good                   |
| `ink`        | `'white'` | **Ink colour**: `white` (prints highlights, for blue paper), `black` or `blue` (print shadows), `duo`, or `color` (dots keep the photo's own colours) |
| `paper`      | `'none'`  | Solid backing behind the dots: `none` (transparent, sits on the page), `black`, `white` or `blue`. Use `black` with `color` |
| `duoAngle`   | `15`      | Screen angle of the black layer in `duo` mode                                                                   |
| `duoSplit`   | `0.36`    | Tone where `duo` hands over from black to white dots. Lower means less black                                    |
| `contrast`   | `1.2`     | Above 1 punches tones apart                                                                                     |
| `brightness` | `0`       | −1 to 1, applied before contrast                                                                                |
| `gamma`      | `1`       | Above 1 darkens midtones; below 1 lightens them                                                                 |
| `clahe`      | `0`       | 0-1 local-contrast strength before halftoning. Around 0.5 brings out faces in flat, flash-lit photos; higher pulls noise out of dark backgrounds |
| `minDot`     | `0.1`     | Dots smaller than this fraction of a cell are dropped, which keeps highlights clean                             |
| `maxDot`     | `0.72`    | Largest radius as a fraction of a cell. Above 0.5 lets dark areas merge into near-solid ink                     |
| `rag`        | `0.45`    | 0–1: how ragged and dotted a cut-out's edge gets                                                                |
| `mask`       | `false`   | Also write `<name>.mask.png`, a smooth silhouette of a cut-out (handy for CSS masking; unused by the site)       |
| `seed`       | `7`       | Seed for the edge noise, so builds are repeatable                                                               |

**`duo`** prints white dots for highlights and black dots for shadows (on a second screen angle), letting the blue page show through as the midtone. It's how black adds depth without taking over.

**`color`** is a full-colour halftone: each dot takes the average colour of the patch it covers, and its size follows that patch's brightness, measured in linear light so the dots mix back to the original tones instead of washing out. Pair it with `paper: 'black'`; on the transparent default, the blue page shows between the dots and tints every colour. The portrait uses it.

### How it works

For each dot on a rotated grid, the script:

1. averages the alpha-weighted luminance under the dot;
2. applies brightness, contrast and gamma;
3. sizes the dot so its area matches the tone;
4. rasterises the dots with 1px anti-aliasing.

Near transparent edges it jitters dot coverage with seeded noise, which produces the ragged fringe. Optional masks are made by blurring and thresholding the alpha channel. Outputs are palette PNGs. Astro then serves them as responsive WebP, with encoder settings in `astro.config.mjs` tuned for hard-edged dots.

### Regenerating the stand-in images

`npm run placeholders` draws the grayscale stand-ins (a mannequin portrait and the three project covers) into `src/assets/source/`. It never overwrites existing files unless you pass `--force`, and it always skips a stand-in when your own file with the same name exists in another format (so your `portrait.jpg` is safe).

---

## Components

| Component       | Props                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `Section`       | `tone="blue" \| "white"`, `as`                                                                  |
| `Label`         | `as` (h1/h2/span…), `size="xl" \| "l" \| "m" \| "s"`. Wrapped lines each get their own box       |
| `Cursor`        | `blink` (default `true`)                                                                        |
| `TypedText`     | `lines: string[]` (`''` = blank line), `cursor` (leave a blinking cursor), `align`               |
| `HalftoneImage` | `src`, `alt`, `sizes`, `widths`, `priority`                                                     |
| `Figure`        | `src`, `alt`, `caption`, `file` (bar name; defaults to the image's), `ratio`, plus the image props |
| `ProjectCard`   | `project`, `index`, `headingLevel`                                                              |
| `Logo`          | `decorative`, `title`                                                                           |

> **Styling a child component from a page:** Astro scopes styles per component, so target a class you pass to a child through a scoped ancestor with `:global()`, for example `.stage :global(.my-burst) { ... }`. The pages already do this.

---

## Motion and accessibility

- **Only three things move:** the intro text types out, the cursor blinks, and pages change with a short glitch.
- **The page glitch** (about 350ms) uses CSS cross-document View Transitions, so it needs no JavaScript. The old page tears into displaced bands and the new one snaps in through more of them, with a chromatic-aberration split (red shifted one way, green the other) that flashes magenta and cyan fringes. The split comes from two small SVG filters in `src/layouts/BaseLayout.astro` (`rgb-split-lg` and `rgb-split-sm`; change their `dx` values to widen or narrow it). The header stays still. It works in Chromium browsers and Safari 18.2+; other browsers simply change page. The keyframes live at the end of `src/styles/global.css`.
- **With `prefers-reduced-motion: reduce`**, the text is simply shown, the cursor stays solid, and pages change instantly.
- **The typed text is always in the HTML.** An inline script hides it for a moment until the typing script takes over. A CSS failsafe reveals it after 3s if the script never runs, and screen readers get the full line throughout. Any key, click, scroll or touch finishes the typing instantly.
- **Semantics:** landmarks, one `h1` per page, a skip link, labelled nav with `aria-current`, and meaningful alt text on every image. The `[IMG]` file bar is hidden from screen readers; a figure's `caption` is its accessible caption.
- **Focus:** a thick 3px outline in the surface's ink colour. It flips automatically inside inverted elements.
- **Links are always underlined.** Hover inverts them.

---

## Run locally

Requires **Node 22.12+** (`.nvmrc` pins 22).

```bash
npm install
npm run dev       # dev server on http://localhost:4321
npm run build     # halftones + static build into dist/
npm run preview   # serve dist/ locally
npm run check     # type-check .astro/.ts files
```

---

## Deploy

The output is a static `dist/` folder. `npm run build` regenerates the halftones first, so the generated images don't need to be committed.

### Netlify

New site from Git. Build command `npm run build`, publish directory `dist`. Netlify reads `.nvmrc` for the Node version.

### Vercel

Import the repo. Vercel detects Astro automatically (build `npm run build`, output `dist`). Set the Node version to 22+ in *Project Settings → General* if it isn't already.

### GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`.

1. Push the repo to GitHub.
2. Go to *Settings → Pages → Source*, and choose **GitHub Actions**.
3. Push to `main`.

The workflow sets `SITE_URL` and `BASE_PATH` for a project site (`https://<user>.github.io/<repo>/`). For a user site (a repo named `<user>.github.io`), change `BASE_PATH` to `/` in the workflow. Every internal link goes through `src/lib/url.ts`, so sub-paths work.

For a custom domain, set `SITE_URL` to it, set `BASE_PATH` to `/`, and add a `public/CNAME` file containing the domain.

---

## Troubleshooting

**"Could not find image" on build.** The halftones haven't been generated yet. Run `npm run halftone` (it runs automatically before `dev` and `build`), and check that the `cover:` path in your frontmatter matches the file in `src/assets/halftone/`.

**Windows: "An Application Control policy has blocked this file … astro.win32-x64-msvc.node".** Smart App Control / WDAC blocks Astro's native compiler binary. Astro falls back to a WebAssembly build of the compiler when it's installed:

```bash
npm install --no-save --force @astrojs/compiler-binding-wasm32-wasi
```

It isn't saved to `package.json` (deploy machines don't need it), so rerun the command after any fresh `npm install`.

**Image changes don't show up.** Astro caches encoded images. If you change the encoder settings in `astro.config.mjs`, delete `node_modules/.astro/assets` and rebuild.
