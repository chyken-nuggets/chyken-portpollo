import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Projects: one Markdown or MDX file per project in src/content/projects.
 * The file name becomes the URL: project-alpha.md -> /work/project-alpha/
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number().int().min(1900).max(2100),
      role: z.string(),
      /** One or two sentences; shown on cards and as the page description. */
      summary: z.string().max(300),
      tags: z.array(z.string()).default([]),

      /** A halftone from src/assets/halftone (run `npm run halftone`). */
      cover: image(),
      coverAlt: z.string(),

      links: z
        .array(
          z.object({
            label: z.string(),
            url: z.url(),
          }),
        )
        .default([]),

      /** Featured projects appear on the home page. */
      featured: z.boolean().default(false),
      /** Tie-breaker within the same year; lower comes first. */
      order: z.number().default(0),
      /** Drafts show in `npm run dev` but not in the build. */
      draft: z.boolean().default(false),
      /** Marks demo content; shows a PLACEHOLDER tag until you remove it. */
      placeholder: z.boolean().default(false),
    }),
});

export const collections = { projects };
