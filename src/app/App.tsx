import React, { useEffect, useMemo, useState } from 'react';
import { SIMULATION_CATALOG, SimulationId, SimulationRuntime } from '../simulations';
import { LabIndexView } from '../ui/components/LabIndexView';
import { isWebGLAvailable } from '../core/graphics/webgl';
import { chooseInitialSandbox } from '../core/graphics/sandboxChoice';
import { SandboxWorkspace } from './SandboxWorkspace';
import { useRoute } from './useRoute';

interface LoadedSandbox {
  id: SimulationId;
  runtime: SimulationRuntime;
}

/**
 * The shell: it reads the address, fetches a sandbox's engine and renderer only when that sandbox is
 * opened, and lays the catalogue over the workspace. The catalogue itself needs only manifest data, so
 * the first page loads without any engine, renderer or WebGL library.
 */
export const App: React.FC = () => {
  const [route, navigate] = useRoute();

  // Probed once per load. Twelve of the seventeen sandboxes draw to a 2D canvas and need no GPU,
  // so a machine without WebGL should still land on something that runs.
  const webglAvailable = useMemo(() => isWebGLAvailable(), []);
  const defaultSandboxId = useMemo(
    () => chooseInitialSandbox(SIMULATION_CATALOG, webglAvailable, 'lorentz-force') as SimulationId,
    [webglAvailable],
  );

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
  const currentId = loaded?.id ?? defaultSandboxId;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans">
      {loaded && (
        <SandboxWorkspace
          sandboxId={loaded.id}
          runtime={loaded.runtime}
          webglAvailable={webglAvailable}
          isIndexOpen={route.view === 'index'}
          onOpenSandbox={(id) => navigate({ view: 'sandbox', id })}
          onOpenIndex={(tab) => navigate({ view: 'index', tab })}
          onCloseIndex={() => navigate({ view: 'sandbox', id: loaded.id })}
        />
      )}

      <LabIndexView
        isOpen={route.view === 'index'}
        webglAvailable={webglAvailable}
        activeTab={route.view === 'index' ? route.tab : 'catalog'}
        currentSandboxId={currentId}
        onTabChange={(tab) => navigate({ view: 'index', tab })}
        onSelectSandbox={(id) => navigate({ view: 'sandbox', id })}
        onClose={() => navigate({ view: 'sandbox', id: currentId })}
      />

      {loadingId && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-lg border border-neutral-700 bg-neutral-900/95 px-4 py-2 text-sm text-neutral-200 shadow-xl"
        >
          Loading {SIMULATION_CATALOG[loadingId].title}…
        </div>
      )}

      {failure && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-6 z-[60] mx-auto max-w-md rounded-lg border border-red-500/40 bg-neutral-900 p-4 text-sm text-neutral-200 shadow-xl"
        >
          <p className="font-medium">Could not load {SIMULATION_CATALOG[failure.id]?.title ?? failure.id}.</p>
          <p className="mt-1 text-neutral-400">
            {failure.message}. Check your connection and try again; sandboxes you have already opened keep working.
          </p>
          <button
            type="button"
            onClick={() => navigate({ view: 'index', tab: 'catalog' })}
            className="mt-3 rounded-md border border-neutral-600 px-3 py-1.5 text-neutral-100 hover:bg-neutral-800"
          >
            Back to the catalogue
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
