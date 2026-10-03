// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// The live site is chyken.dev on Cloudflare Workers. To build for another
// domain or a sub-path, set SITE_URL and BASE_PATH instead of editing these.
// Every internal link goes through src/lib/url.ts, so `base` just works.
const site = process.env.SITE_URL ?? 'https://chyken.dev';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  integrations: [mdx(), sitemap()],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        // Tuned for halftones (hard-edged dots on transparency). At q70 the
        // dots are indistinguishable from lossless at 2x zoom, at about half
        // the bytes of near-lossless.
        webp: { quality: 70, alphaQuality: 70, effort: 6 },
      },
    },
  },
  markdown: {
    // Syntax themes add colours; code stays blue/white like everything else.
    syntaxHighlight: false,
  },
  build: {
    // Inline small stylesheets to save a round trip on first paint.
    inlineStylesheets: 'auto',
  },
});
