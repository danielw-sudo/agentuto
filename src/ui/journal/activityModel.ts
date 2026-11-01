import { dayFromNumber, dayKey, dayNumber, entriesPerDay, streakSummary } from '../../core/journal';
import type { DayKey, InquiryEntry, Timestamp } from '../../core/journal';

/**
 * What the home page's activity card draws (roadmap R6): a calendar grid of the last weeks, one square per
 * UTC day, weeks as columns running Monday to Sunday, today in the last column.
 *
 * Pure, so the layout (which square is which day, where the last column ends, how many entries make a darker
 * square) is checked against hand-counted dates rather than by looking at it. Days are UTC, as in
 * `core/journal/series.ts`: one convention for streaks, grid and the drawer's timestamps.
 */

export interface ActivityCell {
  day: DayKey;
  count: number;
  /** 0 none, 1 one entry, 2 two, 3 three or four, 4 five or more. */
  level: 0 | 1 | 2 | 3 | 4;
  /** After today: the last column is usually part-filled and those squares are drawn as gaps. */
  future: boolean;
}

export interface ActivityGrid {
  /** Columns, oldest first. Each has seven cells, Monday first. */
  weeks: ActivityCell[][];
  entries: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
}

export function levelFor(count: number): ActivityCell['level'] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

/** Weekday with Monday as 0. Day 0 (1970-01-01) was a Thursday. */
export function weekdayOf(day: number): number {
  return (((day + 3) % 7) + 7) % 7;
}

export function activityGrid(entries: readonly InquiryEntry[], today: Timestamp | DayKey, weeks = 26): ActivityGrid {
  if (!Number.isInteger(weeks) || weeks < 1) throw new RangeError(`weeks must be a positive whole number, got ${weeks}`);
  const todayNumber = today.length === 10 ? dayNumber(today) : dayNumber(dayKey(today));
  const thisMonday = todayNumber - weekdayOf(todayNumber);
  const firstMonday = thisMonday - 7 * (weeks - 1);

  const counts = entriesPerDay(entries);
  const columns: ActivityCell[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    const column: ActivityCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const n = firstMonday + 7 * w + d;
      const day = dayFromNumber(n);
      const count = counts.get(day) ?? 0;
      column.push({ day, count, level: levelFor(count), future: n > todayNumber });
    }
    columns.push(column);
  }

  const streak = streakSummary(entries, today);
  return {
    weeks: columns,
    entries: entries.length,
    activeDays: counts.size,
    currentStreak: streak.current,
    longestStreak: streak.longest,
  };
}

/** The sentence a screen reader gets in place of the squares. */
export function activitySummary(grid: ActivityGrid): string {
  const entries = `${grid.entries} ${grid.entries === 1 ? 'entry' : 'entries'}`;
  const days = `${grid.activeDays} ${grid.activeDays === 1 ? 'day' : 'days'}`;
  return `${entries} on ${days}. Current streak ${grid.currentStreak}, longest ${grid.longestStreak}.`;
}
