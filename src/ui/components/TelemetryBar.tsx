import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Download,
  Circle,
  Ruler,
  Timer,
  LineChart,
  ClipboardList,
} from 'lucide-react';

export interface TelemetryBarProps {
  isRunning: boolean;
  simTime: number;
  speedMultiplier: number;
  isRecording: boolean;
  sampleCount: number;
  isCaliperOpen?: boolean;
  isPhotogateOpen?: boolean;
  isNotebookOpen?: boolean;
  isInquiryLogOpen?: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
  onToggleRecording: () => void;
  onExportCSV: () => void;
  onToggleCaliper?: () => void;
  onTogglePhotogate?: () => void;
  onToggleNotebook?: () => void;
  onToggleInquiryLog?: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  isRunning,
  simTime,
  speedMultiplier,
  isRecording,
  sampleCount,
  isCaliperOpen = false,
  isPhotogateOpen = false,
  isNotebookOpen = false,
  isInquiryLogOpen = false,
  onTogglePlay,
  onStepForward,
  onReset,
  onSetSpeed,
  onToggleRecording,
  onExportCSV,
  onToggleCaliper,
  onTogglePhotogate,
  onToggleNotebook,
  onToggleInquiryLog,
}) => {
  const speeds = [0.25, 0.5, 1.0, 2.0];

  return (
    <div className="px-4 sm:px-5 py-2.5 sm:py-3 flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6">
      {/* Playback Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onTogglePlay}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all cursor-pointer ${
            isRunning
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
          }`}
          title={isRunning ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <button
          onClick={onStepForward}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ink hover:bg-sunken transition-colors cursor-pointer"
          title="Single Step Forward"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={onReset}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-ink hover:bg-sunken transition-colors cursor-pointer"
          title="Reset Simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="w-[1px] h-5 bg-line hidden sm:block" />

      {/* Time & Speed Multipliers */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="font-mono text-xs text-ink min-w-[70px]">
          t = <span className="text-accent font-semibold">{simTime.toFixed(2)}</span>s
        </div>

        <div className="flex bg-sunken rounded-lg p-0.5 border border-line text-xs font-mono">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded cursor-pointer transition-colors ${
                speedMultiplier === s
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="w-[1px] h-5 bg-line hidden sm:block" />

      {/* Telemetry Recorder & CSV Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRecording}
          className={`flex items-center gap-2 min-h-11 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            isRecording
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
              : 'bg-sunken text-muted hover:text-ink border border-line'
          }`}
          title="Toggle telemetry recording"
        >
          <Circle className={`w-2.5 h-2.5 fill-current ${isRecording ? 'text-rose-400' : 'text-muted'}`} />
          {isRecording ? `REC (${sampleCount})` : 'Record'}
        </button>

        <button
          onClick={onExportCSV}
          disabled={sampleCount === 0}
          className={`flex items-center gap-1.5 min-h-11 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            sampleCount > 0
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30'
              : 'opacity-40 text-muted border border-line cursor-not-allowed'
          }`}
          title="Download raw data CSV for spreadsheet analysis"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Lab Measurement Instruments & Notebook */}
      {(onToggleCaliper || onTogglePhotogate || onToggleNotebook || onToggleInquiryLog) && (
        <>
          <div className="w-[1px] h-5 bg-line hidden sm:block" />
          <div className="flex items-center gap-1.5">
            {onToggleCaliper && (
              <button
                onClick={onToggleCaliper}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  isCaliperOpen
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-muted hover:text-ink hover:bg-sunken'
                }`}
                title="Toggle Virtual Caliper"
              >
                <Ruler className="w-4 h-4" />
              </button>
            )}

            {onTogglePhotogate && (
              <button
                onClick={onTogglePhotogate}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  isPhotogateOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-muted hover:text-ink hover:bg-sunken'
                }`}
                title="Toggle Virtual Photogate"
              >
                <Timer className="w-4 h-4" />
              </button>
            )}

            {onToggleNotebook && (
              <button
                onClick={onToggleNotebook}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  isNotebookOpen
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-muted hover:text-ink hover:bg-sunken'
                }`}
                title="Toggle Empirical Lab Notebook & Curve Fitter"
              >
                <LineChart className="w-4 h-4" />
              </button>
            )}

            {onToggleInquiryLog && (
              <button
                onClick={onToggleInquiryLog}
                aria-label="Toggle the Inquiry Log"
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-all cursor-pointer ${
                  isInquiryLogOpen
                    ? 'bg-indigo-500/20 text-accent border border-indigo-500/40'
                    : 'text-muted hover:text-ink hover:bg-sunken'
                }`}
                title="Toggle the Inquiry Log (prediction, conditions, measurement, conclusion)"
              >
                <ClipboardList className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
