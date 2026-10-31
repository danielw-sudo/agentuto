import React from 'react';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  subtle?: boolean;
  className?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  subtle = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl transition-all duration-200 pointer-events-auto ${
        subtle ? 'glass-panel-subtle' : 'glass-panel'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
