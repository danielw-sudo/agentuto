import React, { useState, useEffect, useRef } from 'react';
import { Timer, X, RotateCcw, Activity } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

export interface PhotogateTransit {
  timestamp: number;
  speed: number;
  period?: number;
}

export interface VirtualPhotogateProps {
  isOpen: boolean;
  onClose: () => void;
  currentSimTime: number;
  currentPos: number; // current x coordinate
  currentSpeed: number;
}

export const VirtualPhotogate: React.FC<VirtualPhotogateProps> = ({
  isOpen,
  onClose,
  currentSimTime,
  currentPos,
  currentSpeed,
}) => {
  const [gateThresholdX, setGateThresholdX] = useState<number>(0.0); // sensor position in meters
  const [transits, setTransits] = useState<PhotogateTransit[]>([]);
  const prevPosRef = useRef<number>(currentPos);
  const lastCrossingTimeRef = useRef<number | null>(null);

  // Detect threshold crossing
  useEffect(() => {
    if (!isOpen) return;

    const prevX = prevPosRef.current;
    const currX = currentPos;
    prevPosRef.current = currX;

    // Check if sign of (x - threshold) changed (crossed sensor line)
    const wasLeft = prevX < gateThresholdX;
    const isRight = currX >= gateThresholdX;
    const wasRight = prevX > gateThresholdX;
    const isLeft = currX <= gateThresholdX;

    if ((wasLeft && isRight) || (wasRight && isLeft)) {
      const now = currentSimTime;
      const lastTime = lastCrossingTimeRef.current;
      const period = lastTime !== null && now > lastTime ? (now - lastTime) * 2 : undefined; // full cycle period is 2 crossings
      lastCrossingTimeRef.current = now;

      setTransits((prev) => [
        { timestamp: now, speed: Math.abs(currentSpeed), period },
        ...prev.slice(0, 4), // keep last 5 transits
      ]);
    }
  }, [currentPos, currentSimTime, currentSpeed, gateThresholdX, isOpen]);

  if (!isOpen) return null;

  const latestTransit = transits[0];

  return (
    <div className="fixed top-24 left-6 z-30 select-none pointer-events-auto">
      <GlassPanel className="p-3.5 shadow-2xl border border-emerald-400/30 flex flex-col gap-2.5 w-72">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
          <div className="flex items-center gap-2 text-emerald-300">
            <Timer className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-wider uppercase">Virtual Photogate</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setTransits([]);
                lastCrossingTimeRef.current = null;
              }}
              className="p-1 text-neutral-400 hover:text-neutral-200 rounded cursor-pointer"
              title="Reset Transits"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-rose-300 rounded cursor-pointer"
              title="Close Photogate"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Gate Position Selector */}
        <div className="flex flex-col gap-1 text-[11px] font-mono">
          <div className="flex justify-between text-neutral-300">
            <span>Gate Position (x):</span>
            <span className="text-emerald-300 font-bold">{gateThresholdX.toFixed(2)} m</span>
          </div>
          <input
            type="range"
            min={-4.0}
            max={4.0}
            step={0.1}
            value={gateThresholdX}
            onChange={(e) => setGateThresholdX(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Latest Period & Speed Readout */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="flex flex-col bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-500">Period (T)</span>
            <span className="text-emerald-300 font-bold text-sm">
              {latestTransit?.period ? `${latestTransit.period.toFixed(3)}s` : '--'}
            </span>
          </div>
          <div className="flex flex-col bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-500">Gate Speed</span>
            <span className="text-sky-300 font-bold text-sm">
              {latestTransit?.speed ? `${latestTransit.speed.toFixed(2)} m/s` : '--'}
            </span>
          </div>
        </div>

        {/* Transits Log */}
        <div className="flex flex-col gap-1 border-t border-neutral-800/80 pt-1.5 text-[10px] font-mono">
          <div className="flex items-center gap-1 text-neutral-400">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>Recent Sensor Crossings:</span>
          </div>
          {transits.length === 0 ? (
            <span className="text-neutral-500 italic py-1 text-center">Waiting for particle transit...</span>
          ) : (
            transits.slice(0, 3).map((t, idx) => (
              <div key={idx} className="flex justify-between text-neutral-300 py-0.5 border-b border-neutral-900">
                <span>t = {t.timestamp.toFixed(2)}s</span>
                <span className="text-emerald-400">{t.speed.toFixed(2)} m/s</span>
              </div>
            ))
          )}
        </div>
      </GlassPanel>
    </div>
  );
};
