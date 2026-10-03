/**
 * Internal links go through `url()` so the site works under a sub-path
 * (e.g. GitHub Pages project sites, where `base` is "/repo-name/").
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

export function url(path = '/'): string {
  if (/^([a-z]+:)?\/\//i.test(path) || path.startsWith('#') || path.startsWith('mailto:')) return path;
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Strip the base so routes can be compared regardless of deployment path. */
export function routeOf(pathname: string): string {
  const withoutBase = BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  return withoutBase.replace(/\/+$/, '') || '/';
}

/** True when `pathname` is `href` or inside it (so /work/x marks "Work" current). */
export function isCurrent(pathname: string, href: string): boolean {
  const here = routeOf(pathname);
  const target = href.replace(/\/+$/, '') || '/';
  return target === '/' ? here === '/' : here === target || here.startsWith(`${target}/`);
}
