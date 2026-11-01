import React, { useRef, useEffect } from 'react';
import { ViewportRenderer } from '../../core/types/simulation';

export interface ViewportContainerProps {
  renderer?: ViewportRenderer<any>;
  /**
   * Rendered when there is no renderer — either because the sandbox needs WebGL and the machine
   * has none, or because creating the renderer threw. Without this the viewport would be an empty
   * black rectangle and the page would look broken rather than unavailable.
   */
  fallback?: React.ReactNode;
}

export const ViewportContainer: React.FC<ViewportContainerProps> = ({ renderer, fallback }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !renderer) return;

    renderer.mount(container);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          renderer.resize(width, height);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      renderer.unmount();
    };
  }, [renderer]);

  if (!renderer && fallback) {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-paper">{fallback}</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-paper"
      style={{ touchAction: 'none' }}
    />
  );
};
