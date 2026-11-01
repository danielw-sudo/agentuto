import React, { useMemo } from 'react';
import { createInquiryJournal } from '../journal/inquiryLogModel';
import { activityGrid, activitySummary } from '../journal/activityModel';
import type { ActivityCell } from '../journal/activityModel';

const LEVEL_CLASS: Record<ActivityCell['level'], string> = {
  0: 'bg-sunken ring-1 ring-inset ring-line',
  1: 'bg-accent/25',
  2: 'bg-accent/50',
  3: 'bg-accent/75',
  4: 'bg-accent',
};

/**
 * The learner's own streak and calendar, read from the Inquiry Log in this browser. It draws nothing until there
 * is a first entry, so a new visitor sees no empty widget, and nothing here leaves the machine.
 */
export const ActivityCard: React.FC = () => {
  const grid = useMemo(() => {
    const { journal } = createInquiryJournal();
    const entries = journal.all();
    return entries.length === 0 ? null : activityGrid(entries, new Date().toISOString());
  }, []);
  if (!grid) return null;

  return (
    <section aria-label="Your inquiry log" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 className="font-display text-2xl font-medium tracking-tight">Your inquiry log</h2>
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{grid.currentStreak}</span> day streak &middot; longest{' '}
            <span className="font-semibold text-ink">{grid.longestStreak}</span> &middot; {grid.entries}{' '}
            {grid.entries === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <div role="img" aria-label={activitySummary(grid)} className="flex w-max gap-1">
            {grid.weeks.map((week) => (
              <div key={week[0].day} className="flex flex-col gap-1">
                {week.map((cell) =>
                  cell.future ? (
                    <span key={cell.day} className="size-3.5" />
                  ) : (
                    <span
                      key={cell.day}
                      title={`${cell.day}: ${cell.count} ${cell.count === 1 ? 'entry' : 'entries'}`}
                      className={`size-3.5 rounded-[3px] ${LEVEL_CLASS[cell.level]}`}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">Kept in this browser only. Days are counted in UTC.</p>
      </div>
    </section>
  );
};
