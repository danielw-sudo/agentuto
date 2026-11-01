import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence. A sandbox renderer can throw for reasons we cannot predict (a driver
 * refusing a WebGL context, a shader failing to compile on a particular GPU, a future sandbox with
 * a bug in its constructor). Without a boundary that throw unmounts the whole React tree and the
 * user gets a blank page and no information, which is the worst possible failure for a learning
 * tool: they cannot tell a bug from a broken link.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Keep the message in the console for whoever is debugging; the UI stays readable.
    console.error('Agentuto failed to render:', error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-paper p-6">
        <div className="max-w-xl w-full rounded-xl border border-line bg-card p-6">
          <h1 className="text-lg font-semibold text-ink">This sandbox could not start</h1>
          <p className="mt-2 text-sm text-muted">
            The simulation failed to initialise. Reloading usually clears it. If it keeps happening,
            the graphics driver may be refusing to create a rendering context — try another sandbox,
            or enable hardware acceleration in your browser.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-paper p-3 text-xs text-muted">
            {error.message}
          </pre>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:border-muted"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
