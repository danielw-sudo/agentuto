import React from 'react';

export interface SliderControlProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  description?: string;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  description,
}) => {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-neutral-300" title={description}>
          {label}
        </span>
        <span className="font-mono text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20 text-xs">
          {Number.isInteger(value) ? value : value.toFixed(2)}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
      />
      <div className="flex justify-between text-xs text-neutral-500 font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
