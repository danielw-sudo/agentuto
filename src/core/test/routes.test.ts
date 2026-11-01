import { SIMULATION_CATALOG } from '../../simulations';
import { COURSES, courseById } from '../../courses/courses';
import { HOME_ROUTE, parseRoute, routeToHash } from '../../app/routes';
import type { Route, RouteTargets } from '../../app/routes';

/**
 * Address checks (roadmap R2a, R4b). Every page has a URL, and a bad URL lands on the home page instead
 * of on a blank one. Without these a learner who mistypes or bookmarks an old link finds nothing.
 */
export function runRoutesVerification(): void {
  const targets: RouteTargets = {
    isSandbox: (id) => Object.prototype.hasOwnProperty.call(SIMULATION_CATALOG, id),
    isCourse: (id) => courseById(id) !== undefined,
  };
  const ids = Object.keys(SIMULATION_CATALOG);

  // Every sandbox, every course and every fixed page survive a trip through the address bar unchanged.
  const routes: Route[] = [
    ...ids.map((id): Route => ({ view: 'sandbox', id })),
    ...COURSES.map((course): Route => ({ view: 'course', id: course.id })),
    { view: 'home' },
    { view: 'about' },
    { view: 'index', tab: 'catalog' },
    { view: 'index', tab: 'guide' },
  ];
  for (const route of routes) {
    const back = parseRoute(routeToHash(route), targets);
    if (JSON.stringify(back) !== JSON.stringify(route)) {
      throw new Error(`route ${JSON.stringify(route)} became ${JSON.stringify(back)} after ${routeToHash(route)}`);
    }
  }

  // Anything else lands on the home page.
  const strays = [
    '', '#', '#/', '#/nonsense',
    '#/sandbox/', '#/sandbox/not-a-sandbox', '#/sandbox/%E0%A4%A', '#/sandbox/a/b',
    '#/course/', '#/course/9.99', '#/course/%E0%A4%A', '#/course/8.02/extra',
  ];
  for (const stray of strays) {
    const route = parseRoute(stray, targets);
    if (JSON.stringify(route) !== JSON.stringify(HOME_ROUTE)) {
      throw new Error(`"${stray}" should open the home page but gave ${JSON.stringify(route)}`);
    }
  }

  // A trailing slash is the same page, and a prototype property name is neither a sandbox nor a course.
  const slashed = parseRoute(`#/sandbox/${ids[0]}/`, targets);
  if (slashed.view !== 'sandbox' || slashed.id !== ids[0]) {
    throw new Error(`a trailing slash changed the page: ${JSON.stringify(slashed)}`);
  }
  for (const hash of ['#/sandbox/constructor', '#/course/constructor', '#/course/__proto__']) {
    if (parseRoute(hash, targets).view !== 'home') throw new Error(`"${hash}" was accepted as a page`);
  }
  // Courses and sandboxes are different namespaces: a course code is not a sandbox id.
  if (parseRoute('#/sandbox/8.02', targets).view !== 'home' || parseRoute(`#/course/${ids[0]}`, targets).view !== 'home') {
    throw new Error('a course code was taken for a sandbox id, or the reverse');
  }

  console.log(
    `✓ Addresses verified: ${ids.length} sandboxes, ${COURSES.length} courses and 4 fixed pages round-trip through the URL, and ${strays.length} malformed or unknown addresses open the home page`
  );
}
