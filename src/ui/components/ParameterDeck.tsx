import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { SliderControl } from './SliderControl';
import { ParameterDescriptor } from '../../core/types/simulation';

export interface ParameterDeckProps {
  descriptors: ParameterDescriptor<number>[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
  onReset?: () => void;
  title?: string;
}

export const ParameterDeck: React.FC<ParameterDeckProps> = React.memo(({
  descriptors,
  values,
  onChange,
  onReset,
  title = 'Parameters',
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <GlassPanel className="w-72 sm:w-80 p-3.5 sm:p-4 flex flex-col gap-3 shadow-2xl">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2 text-neutral-200">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-semibold tracking-wide uppercase">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          {onReset && (
            <button
              onClick={onReset}
              title="Reset parameters to defaults"
              className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded transition-colors cursor-pointer"
            title={collapsed ? 'Expand Parameters' : 'Collapse Parameters'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Sliders Container */}
      {!collapsed && (
        <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
          {descriptors.map((desc) => (
            <SliderControl
              key={desc.id}
              label={desc.label}
              value={values[desc.id] ?? desc.defaultValue}
              unit={desc.unit}
              min={desc.min}
              max={desc.max}
              step={desc.step}
              description={desc.description}
              onChange={(val) => onChange(desc.id, val)}
            />
          ))}
        </div>
      )}
    </GlassPanel>
  );
});
