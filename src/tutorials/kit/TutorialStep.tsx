import React from 'react';

export interface TutorialStepProps {
  step: number;
  title: string;
  task: string;
  children: React.ReactNode;
}

export const TutorialStep: React.FC<TutorialStepProps> = ({
  step,
  title,
  task,
  children,
}) => {
  return (
    <section
      aria-labelledby={`step-${step}-title`}
      className="rounded-2xl border border-line bg-card p-6 sm:p-8 space-y-6"
    >
      <header className="space-y-2 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sunken font-mono text-xs font-semibold text-muted">
            {String(step).padStart(2, '0')}
          </span>
          <h2 id={`step-${step}-title`} className="font-display text-2xl font-medium tracking-tight text-ink">
            {title}
          </h2>
        </div>
        <p className="text-sm font-medium text-ink">
          <span className="text-accent font-semibold">Task: </span>
          <span className="text-muted">{task}</span>
        </p>
      </header>

      <div className="space-y-6">
        {children}
      </div>
    </section>
  );
};
