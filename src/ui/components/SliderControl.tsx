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
        <span className="font-medium text-ink" title={description}>
          {label}
        </span>
        <span className="font-mono text-accent bg-accent-soft px-2 py-0.5 rounded text-xs">
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
        className="w-full h-6 cursor-pointer accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <div className="flex justify-between text-xs text-muted font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
