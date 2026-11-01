/**
 * The address of every page, as pure functions.
 *
 * Hash routes, because the demo is a static site on a sub-path (GitHub Pages has no server to send
 * unknown paths back to `index.html`) and the same build must also work from `file://`-like and
 * root-domain hosts. Pure so the suite can assert that an address round-trips and that a bad one
 * lands somewhere sensible instead of on a blank page.
 *
 *   #/                 catalogue
 *   #/guide            user guide
 *   #/sandbox/<id>     one sandbox
 */
export type Route =
  | { view: 'index'; tab: 'catalog' | 'guide' }
  | { view: 'sandbox'; id: string };

export const INDEX_ROUTE: Route = { view: 'index', tab: 'catalog' };

export function parseRoute(hash: string, isKnownSandbox: (id: string) => boolean): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (path === 'guide') return { view: 'index', tab: 'guide' };

  const match = /^sandbox\/([^/]+)$/.exec(path);
  if (match) {
    let id = match[1];
    try {
      id = decodeURIComponent(id);
    } catch {
      return INDEX_ROUTE;
    }
    if (isKnownSandbox(id)) return { view: 'sandbox', id };
  }

  return INDEX_ROUTE;
}

export function routeToHash(route: Route): string {
  if (route.view === 'sandbox') return `#/sandbox/${encodeURIComponent(route.id)}`;
  return route.tab === 'guide' ? '#/guide' : '#/';
}
