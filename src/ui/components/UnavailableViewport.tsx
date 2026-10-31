import React from 'react';
import { MonitorX } from 'lucide-react';

export interface UnavailableViewportProps {
  /** Plain-language reason, shown under the heading. */
  reason: string;
  /** Sandbox the user is trying to open. */
  sandboxTitle: string;
  /** Two-dimensional alternatives, offered so the visit is not a dead end. */
  alternatives: { id: string; title: string }[];
  onSelectSandbox: (id: string) => void;
}

/**
 * Shown in the viewport when a sandbox cannot render: either the machine has no usable WebGL and
 * the sandbox is Three.js, or the renderer threw while initialising.
 *
 * The rule this exists for: an unavailable feature must say so and offer the nearest thing that
 * works. A black rectangle — or worse, a blank page — teaches the visitor nothing and looks like a
 * broken site rather than a machine limitation.
 */
export const UnavailableViewport: React.FC<UnavailableViewportProps> = ({
  reason,
  sandboxTitle,
  alternatives,
  onSelectSandbox,
}) => (
  <div className="h-full w-full flex items-center justify-center p-6">
    <div className="max-w-lg w-full rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
      <MonitorX className="mx-auto h-8 w-8 text-amber-400" />
      <h2 className="mt-3 text-base font-semibold text-neutral-100">{sandboxTitle} needs WebGL</h2>
      <p className="mt-2 text-sm text-neutral-400">{reason}</p>
      <p className="mt-1 text-sm text-neutral-500">
        Twelve of the seventeen sandboxes draw to a 2D canvas and run without a GPU.
      </p>

      {alternatives.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {alternatives.map((alt) => (
            <button
              key={alt.id}
              type="button"
              onClick={() => onSelectSandbox(alt.id)}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-indigo-500/60 hover:text-neutral-100"
            >
              {alt.title}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);
