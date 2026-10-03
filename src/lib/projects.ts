import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

/** All publishable projects, newest first. Drafts are only visible in dev. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort(
    (a, b) =>
      b.data.year - a.data.year || a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
  );
}

export async function getFeatured(limit = 4): Promise<Project[]> {
  const projects = await getProjects();
  const featured = projects.filter((p) => p.data.featured);
  return (featured.length ? featured : projects).slice(0, limit);
}

/** "2024-2026" (with a non-breaking hyphen, so it never wraps) or "2026". */
export function yearSpan(projects: Project[]): string {
  if (!projects.length) return '';
  const years = projects.map((p) => p.data.year);
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(max) : `${min}\u2011${max}`;
}

/** Zero-padded index: 1 -> "01". */
export const pad = (n: number) => String(n).padStart(2, '0');
