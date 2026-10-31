import React from 'react';
import { Sliders, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

export interface OverlayLayoutProps {
  header?: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomBar?: React.ReactNode;
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  children?: React.ReactNode;
}

export const OverlayLayout: React.FC<OverlayLayoutProps> = ({
  header,
  leftPanel,
  rightPanel,
  bottomBar,
  isLeftCollapsed = false,
  isRightCollapsed = false,
  onToggleLeft,
  onToggleRight,
  children,
}) => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none p-3 sm:p-4 md:p-6 flex flex-col justify-between z-10 select-none overflow-hidden">
      {/* Top Header Region */}
      <div className="flex justify-between items-start w-full pointer-events-auto">
        {header}
      </div>

      {/* Middle Body Region (Left / Right floating docks with responsive collision prevention) */}
      <div className="flex justify-between items-start w-full flex-1 my-2 sm:my-3 overflow-hidden pointer-events-none gap-2">
        {/* Left Side Region (Controls & Roadmap) */}
        <div className="flex flex-col gap-2 max-h-full overflow-y-auto pointer-events-none">
          {!isLeftCollapsed ? (
            <div className="relative pointer-events-auto flex flex-col gap-2">
              {onToggleLeft && (
                <button
                  onClick={onToggleLeft}
                  className="self-end mb-0.5 p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
                  title="Collapse Controls Panel (H)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Collapse</span>
                </button>
              )}
              {leftPanel}
            </div>
          ) : (
            onToggleLeft && (
              <button
                onClick={onToggleLeft}
                className="pointer-events-auto p-2.5 rounded-xl bg-neutral-900/85 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white shadow-xl flex items-center gap-2 text-xs font-medium cursor-pointer transition-all backdrop-blur-md"
                title="Expand Sliders & Curriculum Deck"
              >
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline font-sans font-medium text-xs">Controls</span>
              </button>
            )
          )}
        </div>

        {/* Right Side Region (Telemetry & Empirical Lab Protocol) */}
        <div className="flex flex-col gap-2 max-h-full overflow-y-auto pointer-events-none items-end">
          {!isRightCollapsed ? (
            <div className="relative pointer-events-auto flex flex-col gap-2 items-end">
              {onToggleRight && (
                <button
                  onClick={onToggleRight}
                  className="self-start mb-0.5 p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
                  title="Collapse Telemetry Panel"
                >
                  <span className="hidden sm:inline text-xs">Collapse</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {rightPanel}
            </div>
          ) : (
            onToggleRight && (
              <button
                onClick={onToggleRight}
                className="pointer-events-auto p-2.5 rounded-xl bg-neutral-900/85 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white shadow-xl flex items-center gap-2 text-xs font-medium cursor-pointer transition-all backdrop-blur-md"
                title="Expand Telemetry & Lab Protocol"
              >
                <Activity className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline font-sans font-medium text-xs">Telemetry</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Bottom Control Bar Region */}
      <div className="flex justify-center items-end w-full pointer-events-auto">
        {bottomBar}
      </div>

      {children}
    </div>
  );
};
