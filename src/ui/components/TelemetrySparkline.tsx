import React, { useRef, useEffect } from 'react';
import { TOKENS } from '../tokens';

export interface TelemetrySparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  label?: string;
  unit?: string;
}

export const TelemetrySparkline: React.FC<TelemetrySparklineProps> = ({
  data,
  color = TOKENS.trace.primary,
  width = 230,
  height = 54,
  label = 'Waveform',
  unit = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);

    // Grid baseline
    ctx.strokeStyle = TOKENS.ui.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5);
    ctx.stroke();

    let min = Infinity;
    let max = -Infinity;
    for (const val of data) {
      if (val < min) min = val;
      if (val > max) max = val;
    }

    if (min === max) {
      min -= 1;
      max += 1;
    }

    const range = max - min;
    const stepX = width / (data.length - 1);

    // Draw area fill
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = i * stepX;
      const normalizedY = (data[i] - min) / range;
      const y = height - (normalizedY * (height - 8) + 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = `${color}15`;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = i * stepX;
      const normalizedY = (data[i] - min) / range;
      const y = height - (normalizedY * (height - 8) + 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Current point dot
    const lastX = width;
    const lastNormalizedY = (data[data.length - 1] - min) / range;
    const lastY = height - (lastNormalizedY * (height - 8) + 4);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lastX - 2, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [data, color, width, height]);

  const currentVal = data.length > 0 ? data[data.length - 1].toFixed(2) : '--';

  return (
    <div className="flex flex-col gap-1 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/80 font-mono text-xs">
      <div className="flex justify-between items-center text-neutral-400">
        <span>{label}</span>
        <span className="text-neutral-200 font-semibold">
          {currentVal}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="block rounded bg-neutral-950/40"
      />
    </div>
  );
};
