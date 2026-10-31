import type { DayKey, InquiryEntry, Timestamp } from './types';
import { JournalValidationError } from './validation';

/**
 * Streak and heatmap series for the Inquiry Log (Kaizen batch 2: "streak/heatmap series").
 *
 * Everything here is a pure function of (entries, dates) so the Lab Index footer (batch 3b) can
 * render it without owning any logic, and so the arithmetic can be checked against hand-computed
 * day counts instead of being eyeballed in a browser.
 *
 * All days are UTC. Local-day streaks would depend on the learner's timezone and would make the
 * same log produce different numbers on a laptop that traveled, so the convention is one line here
 * and nowhere else.
 */

const MS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD` for an ISO timestamp. Throws on an unparseable timestamp: that is data corruption. */
export function dayKey(timestamp: Timestamp): DayKey {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    throw new JournalValidationError('createdAt', `not a parseable timestamp: "${timestamp}"`);
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

/** Days since the epoch for a `YYYY-MM-DD` key. Integer arithmetic, no Date object in the loop. */
export function dayNumber(day: DayKey): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new JournalValidationError('day', `expected YYYY-MM-DD, got "${day}"`);
  }
  const parsed = Date.parse(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) {
    throw new JournalValidationError('day', `not a real date: "${day}"`);
  }
  const number = Math.floor(parsed / MS_PER_DAY);
  // Round-trip check: rejects 2026-02-31, which Date.parse happily rolls over into March.
  if (dayFromNumber(number) !== day) {
    throw new JournalValidationError('day', `not a real date: "${day}"`);
  }
  return number;
}

/** Inverse of `dayNumber`. */
export function dayFromNumber(day: number): DayKey {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** How many entries fall on each UTC day. */
export function entriesPerDay(entries: readonly InquiryEntry[]): Map<DayKey, number> {
  const counts = new Map<DayKey, number>();
  for (const entry of entries) {
    const day = dayKey(entry.createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

export interface StreakSummary {
  /**
   * Consecutive days of work ending today — or ending yesterday, because a streak is not broken at
   * 00:00 UTC while the learner still has the session open. Zero when neither day has an entry.
   */
  current: number;
  /** Longest run of consecutive days anywhere in the log. */
  longest: number;
  /** The days counted by `current`, oldest first. Useful for showing which days are holding it up. */
  currentDays: DayKey[];
}

function runEndingAt(days: ReadonlySet<number>, lastDay: number): number {
  let length = 0;
  let cursor = lastDay;
  while (days.has(cursor)) {
    length += 1;
    cursor -= 1;
  }
  return length;
}

/**
 * Current and longest streak.
 *
 * `today` is passed in rather than read from the clock so the result is reproducible: a test that
 * ran at midnight would otherwise fail for reasons unrelated to the code.
 */
export function streakSummary(entries: readonly InquiryEntry[], today: Timestamp | DayKey): StreakSummary {
  const todayDay = today.length === 10 ? dayNumber(today) : dayNumber(dayKey(today));
  const days = new Set<number>();
  for (const day of entriesPerDay(entries).keys()) {
    days.add(dayNumber(day));
  }

  const sorted = [...days].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let previous: number | undefined;
  for (const day of sorted) {
    run = previous !== undefined && day === previous + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    previous = day;
  }

  let current = 0;
  if (days.has(todayDay)) {
    current = runEndingAt(days, todayDay);
  } else if (days.has(todayDay - 1)) {
    current = runEndingAt(days, todayDay - 1);
  }

  const currentDays: DayKey[] = [];
  for (let offset = current; offset >= 1; offset -= 1) {
    const anchor = days.has(todayDay) ? todayDay : todayDay - 1;
    currentDays.push(dayFromNumber(anchor - (offset - 1)));
  }

  return { current, longest, currentDays };
}

export interface HeatmapCell {
  day: DayKey;
  count: number;
}

/**
 * One cell per day in `[startDay, endDay]`, contiguous, zero-filled.
 *
 * Contiguous because a heatmap's meaning is spatial — a missing day must render as an empty square,
 * not disappear and shift every later square left.
 */
export function heatmapSeries(
  entries: readonly InquiryEntry[],
  startDay: DayKey,
  endDay: DayKey
): HeatmapCell[] {
  const from = dayNumber(startDay);
  const to = dayNumber(endDay);
  if (to < from) {
    throw new JournalValidationError('endDay', `${endDay} is before ${startDay}`);
  }

  const counts = entriesPerDay(entries);
  const cells: HeatmapCell[] = [];
  for (let day = from; day <= to; day += 1) {
    const key = dayFromNumber(day);
    cells.push({ day: key, count: counts.get(key) ?? 0 });
  }
  return cells;
}
