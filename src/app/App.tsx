import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { SIMULATION_CATALOG, SimulationId, SimulationRuntime } from '../simulations';
import { courseById } from '../courses/courses';
import { HomePage } from '../ui/site/HomePage';
import { isWebGLAvailable } from '../core/graphics/webgl';
import { HOME_ROUTE } from './routes';
import { useRoute } from './useRoute';

// Only the home page is needed to show something. The workspace (controls, telemetry, drawers), the
// instruments page, a course page and the About page each load when first asked for.
const SandboxWorkspace = lazy(() => import('./SandboxWorkspace').then((m) => ({ default: m.SandboxWorkspace })));
const LabIndexView = lazy(() => import('../ui/components/LabIndexView').then((m) => ({ default: m.LabIndexView })));
const CoursePage = lazy(() => import('../ui/site/CoursePage').then((m) => ({ default: m.CoursePage })));
const AboutPage = lazy(() => import('../ui/site/AboutPage').then((m) => ({ default: m.AboutPage })));

interface LoadedSandbox {
  id: SimulationId;
  runtime: SimulationRuntime;
}

/**
 * The shell: it reads the address, fetches a sandbox's engine and renderer only when that sandbox is
 * opened, and lays the pages over the workspace. The pages need only manifest and course data, so the
 * first visit loads without any engine, renderer or WebGL library.
 */
export const App: React.FC = () => {
  const [route, navigate] = useRoute();

  // Probed once per load. Twelve of the seventeen sandboxes draw to a 2D canvas and need no GPU,
  // so a machine without WebGL should still be able to open something that runs.
  const webglAvailable = useMemo(() => isWebGLAvailable(), []);

  const [loaded, setLoaded] = useState<LoadedSandbox | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);

  const wantedId = route.view === 'sandbox' ? route.id : null;

  useEffect(() => {
    if (!wantedId || loaded?.id === wantedId) return;
    let cancelled = false;
    setFailure(null);
    SIMULATION_CATALOG[wantedId]
      .load()
      .then((runtime) => {
        if (!cancelled) setLoaded({ id: wantedId, runtime });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailure({ id: wantedId, message: error instanceof Error ? error.message : 'the download failed' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [wantedId, loaded?.id]);

  const loadingId = wantedId && loaded?.id !== wantedId && failure?.id !== wantedId ? wantedId : null;
  // A page is open over the workspace: the experiment keeps running underneath, but nothing in it can
  // take focus or keystrokes until the learner returns.
  const pageOpen = route.view !== 'sandbox';
  const course = route.view === 'course' ? courseById(route.id) : undefined;

  return (
    <div
      data-theme={route.view === 'sandbox' ? 'dark' : undefined}
      className="relative w-screen h-screen overflow-hidden bg-paper font-sans"
    >
      <Suspense fallback={null}>
      {loaded && (
        <div className="absolute inset-0" inert={pageOpen}>
          <SandboxWorkspace
            sandboxId={loaded.id}
            runtime={loaded.runtime}
            webglAvailable={webglAvailable}
            isIndexOpen={pageOpen}
            onOpenSandbox={(id) => navigate({ view: 'sandbox', id })}
            onCloseIndex={() => navigate({ view: 'sandbox', id: loaded.id })}
          />
        </div>
      )}

      {route.view === 'home' && <HomePage resumeSandboxId={loaded?.id ?? null} />}
      {route.view === 'course' && course && <CoursePage course={course} webglAvailable={webglAvailable} />}
      {route.view === 'about' && <AboutPage />}

      {route.view === 'index' && (
      <LabIndexView
        isOpen
        webglAvailable={webglAvailable}
        activeTab={route.tab}
        resumeSandboxId={loaded?.id ?? null}
        onTabChange={(tab) => navigate({ view: 'index', tab })}
        onSelectSandbox={(id) => navigate({ view: 'sandbox', id })}
      />
      )}
      </Suspense>

      {loadingId && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-lg border border-line bg-card px-4 py-2 text-sm text-ink shadow-xl"
        >
          Loading {SIMULATION_CATALOG[loadingId].title}…
        </div>
      )}

      {failure && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-6 z-[60] mx-auto max-w-md rounded-lg border border-line bg-card p-4 text-sm text-ink shadow-xl"
        >
          <p className="font-medium">Could not load {SIMULATION_CATALOG[failure.id]?.title ?? failure.id}.</p>
          <p className="mt-1 text-muted">
            {failure.message}. Check your connection and try again; sandboxes you have already opened keep working.
          </p>
          <button
            type="button"
            onClick={() => navigate(HOME_ROUTE)}
            className="mt-3 rounded-md border border-line px-3 py-2 text-ink hover:bg-sunken"
          >
            Back to the courses
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
