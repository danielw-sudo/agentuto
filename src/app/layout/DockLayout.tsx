import React from 'react';

export interface DockLayoutProps {
  header: React.ReactNode;
  /** Parameters and the course roadmap. */
  leftDock: React.ReactNode;
  /** Live telemetry and the lab protocol. */
  rightDock: React.ReactNode;
  /** The apparatus. Fills the middle and is never covered by a panel. */
  viewport: React.ReactNode;
  /** Playback, recording and instruments. A row under the apparatus, not a floating pill. */
  transport: React.ReactNode;
  isLeftCollapsed: boolean;
  isRightCollapsed: boolean;
  children?: React.ReactNode;
}

/**
 * The sandbox screen: header on top, the apparatus in the middle, panels docked on either side, and
 * the transport row underneath. From 1024 px up the docks take their own columns, so the apparatus is
 * simply the space that is left; below that they open as drawers over it and start closed, so a phone
 * shows the apparatus first (Constitution Art. 7.4: HUD panels must not hide what the learner needs).
 */
export const DockLayout: React.FC<DockLayoutProps> = ({
  header,
  leftDock,
  rightDock,
  viewport,
  transport,
  isLeftCollapsed,
  isRightCollapsed,
  children,
}) => (
  <div className="flex h-full w-full flex-col">
    {header}

    <div className="relative flex min-h-0 flex-1">
      <aside
        aria-label="Parameters and roadmap"
        hidden={isLeftCollapsed}
        className="absolute inset-y-0 left-0 z-20 flex w-[min(20rem,92vw)] shrink-0 flex-col gap-3 overflow-y-auto border-r border-line bg-sunken p-3 shadow-xl lg:relative lg:w-80 lg:shadow-none"
      >
        {leftDock}
      </aside>

      <section aria-label="Apparatus" className="relative flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">{viewport}</div>
        <div className="border-t border-line bg-card">{transport}</div>
      </section>

      <aside
        aria-label="Telemetry and lab protocol"
        hidden={isRightCollapsed}
        className="absolute inset-y-0 right-0 z-20 flex w-[min(21rem,92vw)] shrink-0 flex-col gap-3 overflow-y-auto border-l border-line bg-sunken p-3 shadow-xl lg:relative lg:w-[21rem] lg:shadow-none"
      >
        {rightDock}
      </aside>
    </div>

    {children}
  </div>
);
