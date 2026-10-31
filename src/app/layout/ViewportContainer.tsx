import React, { useRef, useEffect } from 'react';
import { ViewportRenderer } from '../../core/types/simulation';

export interface ViewportContainerProps {
  renderer?: ViewportRenderer<any>;
}

export const ViewportContainer: React.FC<ViewportContainerProps> = ({ renderer }) => {
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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-950"
      style={{ touchAction: 'none' }}
    />
  );
};
