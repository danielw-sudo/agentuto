import React, { useState, useRef } from 'react';
import { Ruler, X, RotateCcw } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

export interface VirtualCaliperProps {
  isOpen: boolean;
  onClose: () => void;
  scalePixelsPerMeter?: number; // default: 35 px/m or dynamic
}

export const VirtualCaliper: React.FC<VirtualCaliperProps> = ({
  isOpen,
  onClose,
  scalePixelsPerMeter = 35,
}) => {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 200, y: 150 });
  const [jawSpanPx, setJawSpanPx] = useState<number>(140); // distance between jaws
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!isOpen) return null;

  const measuredMeters = (jawSpanPx / scalePixelsPerMeter).toFixed(2);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPos({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed z-30 select-none pointer-events-auto"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <GlassPanel className="p-3 shadow-2xl border border-sky-400/30 flex flex-col gap-2 min-w-[280px]">
        {/* Caliper Bar Header */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between cursor-move border-b border-neutral-800 pb-1.5"
          title="Drag to reposition caliper"
        >
          <div className="flex items-center gap-2 text-sky-300">
            <Ruler className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wider uppercase">Virtual Caliper</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setJawSpanPx(140)}
              className="p-1 text-neutral-400 hover:text-neutral-200 rounded cursor-pointer"
              title="Reset Span"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-rose-300 rounded cursor-pointer"
              title="Close Caliper"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Measurement Display */}
        <div className="flex items-center justify-between bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800 font-mono text-xs">
          <span className="text-neutral-400">Measured Distance:</span>
          <span className="text-sky-300 font-bold text-sm">{measuredMeters} m</span>
        </div>

        {/* Caliper Slider Control for Jaw Span */}
        <div className="flex flex-col gap-1 text-[10px] text-neutral-400 font-mono">
          <div className="flex justify-between">
            <span>Jaw Opening:</span>
            <span>{jawSpanPx}px</span>
          </div>
          <input
            type="range"
            min={20}
            max={400}
            step={1}
            value={jawSpanPx}
            onChange={(e) => setJawSpanPx(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-ew-resize accent-sky-400"
          />
        </div>

        {/* Physical Caliper Beam & Jaws Visualizer */}
        <div className="relative h-12 w-full mt-1 bg-neutral-950/60 border border-neutral-800 rounded-lg overflow-hidden flex items-center">
          {/* Main ruler beam ticks */}
          <div className="absolute inset-x-2 top-1 h-3 flex justify-between opacity-40">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className={`w-[1px] bg-neutral-400 ${i % 5 === 0 ? 'h-3' : 'h-1.5'}`} />
            ))}
          </div>

          {/* Fixed Left Jaw */}
          <div className="absolute left-4 top-2 bottom-2 w-1.5 bg-sky-400 rounded-sm shadow-md" />

          {/* Sliding Right Jaw */}
          <div
            className="absolute top-2 bottom-2 w-1.5 bg-emerald-400 rounded-sm shadow-md transition-all"
            style={{
              left: `${Math.min(Math.max(16 + (jawSpanPx / 400) * 220, 24), 250)}px`,
            }}
          />

          <span className="absolute bottom-1 inset-x-0 text-center text-[9px] text-neutral-500 font-mono">
            Align jaws to orbit or oscillation bounds
          </span>
        </div>
      </GlassPanel>
    </div>
  );
};
