import { SIMULATION_CATALOG } from '../../simulations';
import { INDEX_ROUTE, parseRoute, routeToHash } from '../../app/routes';
import type { Route } from '../../app/routes';

/**
 * Address checks (roadmap R2a). Every page has a URL, and a bad URL lands on the catalogue instead of on
 * a blank page. Without these a learner who mistypes or bookmarks an old link finds nothing.
 */
export function runRoutesVerification(): void {
  const known = (id: string) => Object.prototype.hasOwnProperty.call(SIMULATION_CATALOG, id);
  const ids = Object.keys(SIMULATION_CATALOG);

  // Every sandbox, and both catalogue tabs, survive a trip through the address bar unchanged.
  const routes: Route[] = [
    ...ids.map((id): Route => ({ view: 'sandbox', id })),
    { view: 'index', tab: 'catalog' },
    { view: 'index', tab: 'guide' },
  ];
  for (const route of routes) {
    const back = parseRoute(routeToHash(route), known);
    if (JSON.stringify(back) !== JSON.stringify(route)) {
      throw new Error(`route ${JSON.stringify(route)} became ${JSON.stringify(back)} after ${routeToHash(route)}`);
    }
  }

  // Anything else lands on the catalogue.
  const strays = ['', '#', '#/', '#/nonsense', '#/sandbox/', '#/sandbox/not-a-sandbox', '#/sandbox/%E0%A4%A', '#/sandbox/a/b'];
  for (const stray of strays) {
    const route = parseRoute(stray, known);
    if (route.view !== 'index' || route.tab !== 'catalog') {
      throw new Error(`"${stray}" should open the catalogue but gave ${JSON.stringify(route)}`);
    }
  }

  // A trailing slash is the same page, and a prototype property name is not a sandbox.
  const slashed = parseRoute(`#/sandbox/${ids[0]}/`, known);
  if (slashed.view !== 'sandbox' || slashed.id !== ids[0]) {
    throw new Error(`a trailing slash changed the page: ${JSON.stringify(slashed)}`);
  }
  if (parseRoute('#/sandbox/constructor', known).view !== 'index') {
    throw new Error('"constructor" was accepted as a sandbox id');
  }
  if (JSON.stringify(INDEX_ROUTE) !== JSON.stringify({ view: 'index', tab: 'catalog' })) {
    throw new Error('the default route is no longer the catalogue');
  }

  console.log(
    `✓ Addresses verified: ${ids.length} sandboxes and 2 catalogue tabs round-trip through the URL, and ${strays.length} malformed or unknown addresses open the catalogue`
  );
}
