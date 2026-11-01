import React from 'react';

/**
 * Marks something that came from the learner's own `local/` folder (Constitution Art. 12.4). It has not been
 * reviewed by anyone, so it says so wherever it appears. `dark` is for the older dark-only screens.
 */
export const LocalBadge: React.FC<{ variant?: 'token' | 'dark' }> = ({ variant = 'token' }) => (
  <span
    title="From your own local/ folder. Nobody has reviewed it, and it is not part of the public site."
    className={
      variant === 'dark'
        ? 'rounded border border-amber-500/40 bg-amber-950/50 px-1.5 py-0.5 font-mono text-xs font-semibold text-amber-300'
        : 'rounded-md border border-line bg-accent-soft px-2 py-0.5 font-mono text-[13px] text-ink'
    }
  >
    Local, unreviewed
  </span>
);
