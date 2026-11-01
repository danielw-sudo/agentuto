import { useCallback, useEffect, useState } from 'react';
import { SIMULATION_CATALOG } from '../simulations';
import { Route, parseRoute, routeToHash } from './routes';

const isKnownSandbox = (id: string) => Object.prototype.hasOwnProperty.call(SIMULATION_CATALOG, id);

const readRoute = (): Route => parseRoute(window.location.hash, isKnownSandbox);

/**
 * The current page, read from the address bar. The address is the single source of truth: navigating
 * means changing the hash, and the browser's own back and forward buttons then work for free.
 */
export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash === hash) return;
    window.location.hash = hash;
  }, []);

  return [route, navigate];
}
