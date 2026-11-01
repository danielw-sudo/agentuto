/**
 * The address of every page, as pure functions.
 *
 * Hash routes, because the demo is a static site on a sub-path (GitHub Pages has no server to send
 * unknown paths back to `index.html`) and the same build must also work from `file://`-like and
 * root-domain hosts. Pure so the suite can assert that an address round-trips and that a bad one
 * lands somewhere sensible instead of on a blank page.
 *
 *   #/                 home: the list of courses
 *   #/course/<code>    one course, e.g. #/course/8.02
 *   #/about            what Agentuto is, licence, credits
 *   #/instruments      every instrument, with filters
 *   #/guide            user guide
 *   #/sandbox/<id>     one sandbox
 */
export type Route =
  | { view: 'home' }
  | { view: 'course'; id: string }
  | { view: 'about' }
  | { view: 'index'; tab: 'catalog' | 'guide' }
  | { view: 'sandbox'; id: string };

export const HOME_ROUTE: Route = { view: 'home' };

export interface RouteTargets {
  isSandbox: (id: string) => boolean;
  isCourse: (id: string) => boolean;
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function parseRoute(hash: string, targets: RouteTargets): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (path === 'about') return { view: 'about' };
  if (path === 'guide') return { view: 'index', tab: 'guide' };
  if (path === 'instruments') return { view: 'index', tab: 'catalog' };

  const sandbox = /^sandbox\/([^/]+)$/.exec(path);
  if (sandbox) {
    const id = decode(sandbox[1]);
    if (id !== null && targets.isSandbox(id)) return { view: 'sandbox', id };
  }

  const course = /^course\/([^/]+)$/.exec(path);
  if (course) {
    const id = decode(course[1]);
    if (id !== null && targets.isCourse(id)) return { view: 'course', id };
  }

  return HOME_ROUTE;
}

export function routeToHash(route: Route): string {
  switch (route.view) {
    case 'sandbox':
      return `#/sandbox/${encodeURIComponent(route.id)}`;
    case 'course':
      return `#/course/${encodeURIComponent(route.id)}`;
    case 'about':
      return '#/about';
    case 'index':
      return route.tab === 'guide' ? '#/guide' : '#/instruments';
    default:
      return '#/';
  }
}
