import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, LineChart, Table, Download, Copy, Check } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { TelemetryPoint } from '../../core/types/simulation';
import { linearRegression, exponentialRegression, LinearFitResult, ExponentialFitResult } from '../../core/math/regression';

export interface LabNotebookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  buffer: readonly TelemetryPoint[];
  simTitle: string;
  onExportCSV: () => void;
}

type FitType = 'linear' | 'exponential';

export const LabNotebookDrawer: React.FC<LabNotebookDrawerProps> = React.memo(({
  isOpen,
  onClose,
  buffer,
  simTitle,
  onExportCSV,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fitType, setFitType] = useState<FitType>('linear');
  const [copied, setCopied] = useState<boolean>(false);

  // Available numerical variables (depends on buffer.length and isOpen for fresh reactivity)
  const availableKeys = useMemo(() => {
    if (buffer.length === 0) return [];
    return Object.keys(buffer[0]).filter((k) => typeof buffer[0][k] === 'number');
  }, [buffer, buffer.length, isOpen]);

  const [xKey, setXKey] = useState<string>('t');
  const [yKey, setYKey] = useState<string>('');

  // Default axes when keys become available
  useEffect(() => {
    if (availableKeys.length > 0) {
      if (!availableKeys.includes(xKey)) {
        setXKey(availableKeys[0]);
      }
      if (!yKey || !availableKeys.includes(yKey)) {
        // Pick the second key if available (often pos, speed, or x), otherwise the first
        setYKey(availableKeys.length > 1 ? availableKeys[1] : availableKeys[0]);
      }
    }
  }, [availableKeys, xKey, yKey]);

  // Extract (X, Y) series
  const { xVals, yVals } = useMemo(() => {
    if (buffer.length === 0 || !xKey || !yKey) return { xVals: [], yVals: [] };
    const x: number[] = [];
    const y: number[] = [];
    for (const pt of buffer) {
      if (typeof pt[xKey] === 'number' && typeof pt[yKey] === 'number' && !isNaN(pt[xKey]) && !isNaN(pt[yKey])) {
        x.push(pt[xKey]);
        y.push(pt[yKey]);
      }
    }
    return { xVals: x, yVals: y };
  }, [buffer, buffer.length, xKey, yKey, isOpen]);

  // Perform regression
  const regressionResult = useMemo(() => {
    if (xVals.length < 2) return null;
    if (fitType === 'exponential') {
      return exponentialRegression(xVals, yVals);
    }
    return linearRegression(xVals, yVals);
  }, [xVals, yVals, fitType]);

  // Render Canvas Plot
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 340;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, width, height);

    if (xVals.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Record telemetry to populate scatter plot and fit curves', width / 2, height / 2);
      return;
    }

    // Determine domain and range with padding
    let minX = Math.min(...xVals);
    let maxX = Math.max(...xVals);
    let minY = Math.min(...yVals);
    let maxY = Math.max(...yVals);

    if (minX === maxX) {
      minX -= 1;
      maxX += 1;
    }
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }

    const padX = (maxX - minX) * 0.08;
    const padY = (maxY - minY) * 0.08;
    minX -= padX;
    maxX += padX;
    minY -= padY;
    maxY += padY;

    const plotX0 = 60;
    const plotY0 = 30;
    const plotW = width - plotX0 - 30;
    const plotH = height - plotY0 - 45;

    const toScreenX = (x: number) => plotX0 + ((x - minX) / (maxX - minX)) * plotW;
    const toScreenY = (y: number) => plotY0 + plotH - ((y - minY) / (maxY - minY)) * plotH;

    // Draw Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';

    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const frac = i / xTicks;
      const xVal = minX + frac * (maxX - minX);
      const sx = plotX0 + frac * plotW;

      ctx.beginPath();
      ctx.moveTo(sx, plotY0);
      ctx.lineTo(sx, plotY0 + plotH);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(xVal.toFixed(2), sx, plotY0 + plotH + 16);
    }

    const yTicks = 5;
    for (let j = 0; j <= yTicks; j++) {
      const frac = j / yTicks;
      const yVal = minY + frac * (maxY - minY);
      const sy = plotY0 + plotH - frac * plotH;

      ctx.beginPath();
      ctx.moveTo(plotX0, sy);
      ctx.lineTo(plotX0 + plotW, sy);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillText(yVal.toFixed(2), plotX0 - 8, sy + 3);
    }

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${xKey} →`, plotX0 + plotW / 2, height - 8);

    ctx.save();
    ctx.translate(16, plotY0 + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${yKey} ↑`, 0, 0);
    ctx.restore();

    // Plot Regression Line / Curve
    if (regressionResult && regressionResult.rSquared >= 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b'; // Amber / Gold
      ctx.lineWidth = 2.5;

      const steps = 100;
      let first = true;

      for (let s = 0; s <= steps; s++) {
        const cx = minX + (s / steps) * (maxX - minX);
        let cy = 0;

        if (fitType === 'linear') {
          const res = regressionResult as LinearFitResult;
          cy = res.slope * cx + res.intercept;
        } else {
          const res = regressionResult as ExponentialFitResult;
          cy = res.a * Math.exp(res.b * cx);
        }

        const sx = toScreenX(cx);
        const sy = toScreenY(cy);

        if (sy >= plotY0 - 10 && sy <= plotY0 + plotH + 10) {
          if (first) {
            ctx.moveTo(sx, sy);
            first = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }
      ctx.stroke();
    }

    // Plot Scatter Data Points
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)'; // Cyan
    for (let k = 0; k < xVals.length; k++) {
      const sx = toScreenX(xVals[k]);
      const sy = toScreenY(yVals[k]);
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [isOpen, xVals, yVals, regressionResult, fitType, xKey, yKey]);

  const copyEquation = () => {
    if (!regressionResult) return;
    navigator.clipboard.writeText(`${regressionResult.equation} (R² = ${regressionResult.rSquared.toFixed(4)})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-4xl p-6 flex flex-col gap-5 shadow-2xl border border-neutral-700/60 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                Empirical Lab Notebook & Curve Fitter
                <span className="text-xs text-sky-400 font-mono bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/20">
                  {buffer.length} Samples
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Data Regression & Scientific Verification for <strong className="text-neutral-300">{simTitle}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportCSV}
              disabled={buffer.length === 0}
              className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {buffer.length < 2 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <Table className="w-10 h-10 text-neutral-600" />
            <h3 className="text-sm font-medium text-neutral-300">No Experimental Data Buffered</h3>
            <p className="text-xs text-neutral-400 max-w-md">
              Start the simulation and click <strong className="text-rose-400">Record</strong> in the bottom telemetry bar to collect high-frequency data points, then return here to fit physical laws and calculate R² goodness-of-fit.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Control Bar: Axes & Model Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-400">X-Axis Variable</label>
                <select
                  value={xKey}
                  onChange={(e) => setXKey(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {availableKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-400">Y-Axis Variable</label>
                <select
                  value={yKey}
                  onChange={(e) => setYKey(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {availableKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-400">Mathematical Model</label>
                <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-neutral-700/80">
                  <button
                    onClick={() => setFitType('linear')}
                    className={`flex-1 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                      fitType === 'linear' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Linear (y = mx + b)
                  </button>
                  <button
                    onClick={() => setFitType('exponential')}
                    className={`flex-1 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                      fitType === 'exponential' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Exponential (y = Ae^Bx)
                  </button>
                </div>
              </div>
            </div>

            {/* Regression Results Summary Card */}
            {regressionResult && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                        Regression Fit Equation
                      </span>
                      <span className="font-mono text-sm text-amber-300 font-semibold">
                        {regressionResult.equation}
                      </span>
                    </div>

                    <div className="h-6 w-[1px] bg-neutral-800" />

                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                        Goodness of Fit (R²)
                      </span>
                      <span
                        className={`font-mono text-sm font-semibold ${
                          regressionResult.rSquared >= 0.95
                            ? 'text-emerald-400'
                            : regressionResult.rSquared >= 0.8
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {regressionResult.rSquared.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={copyEquation}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 text-neutral-300 hover:text-white hover:bg-neutral-700/60 text-xs font-medium cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Formula'}</span>
                  </button>
                </div>

                {fitType === 'exponential' && yVals.filter((y) => y > 1e-9).length < yVals.length && (
                  <div className="text-[10px] text-amber-400/90 bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-500/20 font-mono">
                    ⓘ Exponential model ln(y) = ln(A) + Bx requires y &gt; 0; fitted on {yVals.filter((y) => y > 1e-9).length} of {yVals.length} positive samples.
                  </div>
                )}
              </div>
            )}

            {/* Canvas Plot */}
            <div className="w-full h-80 rounded-xl overflow-hidden border border-neutral-800 relative bg-[#0a0d14]">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
});
