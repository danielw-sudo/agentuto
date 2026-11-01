import { activityGrid, activitySummary, levelFor, weekdayOf } from '../../ui/journal/activityModel';
import type { InquiryEntry } from '../journal';

/**
 * Home-page activity grid checks (roadmap R6). Every expectation below is counted by hand from a calendar:
 * 2026-10-28 is a Wednesday, so its week runs Monday 10-26 to Sunday 11-01 and the four days after it are future.
 */
function entryOn(day: string, n: number): InquiryEntry {
  return {
    id: `${day}-${n}`,
    sandboxId: 'free-fall',
    createdAt: `${day}T09:00:00.000Z`,
    prediction: { text: 'p' },
    parameters: {},
    measurement: { channel: 'height', value: 1 },
    explanation: '',
  } as InquiryEntry;
}
function many(day: string, count: number): InquiryEntry[] {
  return Array.from({ length: count }, (_, i) => entryOn(day, i));
}

export function runActivityVerification(): void {
  // Weekdays: the epoch was a Thursday, and a known Monday and Sunday land where the calendar says.
  const days = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
  if (weekdayOf(0) !== 3) throw new Error('1970-01-01 should be a Thursday (Monday = 0, so 3)');
  if (weekdayOf(days('2026-10-26')) !== 0) throw new Error('2026-10-26 should be a Monday');
  if (weekdayOf(days('2026-11-01')) !== 6) throw new Error('2026-11-01 should be a Sunday');
  if (weekdayOf(days('1969-12-29')) !== 0) throw new Error('a day before the epoch should still map to 0..6 (1969-12-29 is a Monday)');

  // Levels: the thresholds sit exactly at 1, 2, 3-4 and 5+.
  const levels = [0, 1, 2, 3, 4, 5, 9].map(levelFor).join(',');
  if (levels !== '0,1,2,3,3,4,4') throw new Error(`levels for 0,1,2,3,4,5,9 should be 0,1,2,3,3,4,4 but were ${levels}`);

  const entries = [...many('2026-10-20', 5), ...many('2026-10-21', 4), ...many('2026-10-26', 3), ...many('2026-10-27', 1), ...many('2026-10-28', 2)];
  const grid = activityGrid(entries, '2026-10-28T23:59:00.000Z', 2);

  if (grid.weeks.length !== 2 || grid.weeks.some((w) => w.length !== 7)) throw new Error('two weeks should be two columns of seven');
  if (grid.weeks[0][0].day !== '2026-10-19' || grid.weeks[1][6].day !== '2026-11-01') {
    throw new Error(`the grid should run 2026-10-19 to 2026-11-01 but ran ${grid.weeks[0][0].day} to ${grid.weeks[1][6].day}`);
  }
  const flat = grid.weeks.flat();
  const counts = flat.map((c) => c.count).join(',');
  if (counts !== '0,5,4,0,0,0,0,3,1,2,0,0,0,0') throw new Error(`counts should be 0,5,4,0,0,0,0,3,1,2,0,0,0,0 but were ${counts}`);
  const shown = flat.map((c) => c.level).join(',');
  if (shown !== '0,4,3,0,0,0,0,3,1,2,0,0,0,0') throw new Error(`levels should be 0,4,3,0,0,0,0,3,1,2,0,0,0,0 but were ${shown}`);
  const future = flat.filter((c) => c.future).map((c) => c.day).join(',');
  if (future !== '2026-10-29,2026-10-30,2026-10-31,2026-11-01') throw new Error(`future days should be 10-29..11-01 but were ${future}`);
  if (grid.entries !== 15 || grid.activeDays !== 5) throw new Error(`15 entries on 5 days expected, got ${grid.entries} on ${grid.activeDays}`);
  if (grid.currentStreak !== 3 || grid.longestStreak !== 3) throw new Error(`streaks should be 3 and 3, got ${grid.currentStreak} and ${grid.longestStreak}`);

  // An entry older than the window still counts toward the totals and the streak, but has no square.
  const old = activityGrid([entryOn('2026-01-05', 0)], '2026-10-28', 4);
  if (old.entries !== 1 || old.weeks.flat().some((c) => c.count > 0)) throw new Error('an entry before the window should count in the totals but not appear in the grid');

  // An empty log is all zeros, and a bad window is refused.
  const empty = activityGrid([], '2026-10-28', 1);
  if (empty.currentStreak !== 0 || empty.weeks.flat().some((c) => c.count !== 0)) throw new Error('an empty log should be all zeros');
  for (const bad of [0, -1, 1.5]) {
    let refused = false;
    try {
      activityGrid([], '2026-10-28', bad);
    } catch {
      refused = true;
    }
    if (!refused) throw new Error(`${bad} weeks should be refused`);
  }

  const sentence = activitySummary(grid);
  if (sentence !== '15 entries on 5 days. Current streak 3, longest 3.') throw new Error(`summary read "${sentence}"`);
  if (activitySummary(activityGrid([entryOn('2026-10-28', 0)], '2026-10-28', 1)) !== '1 entry on 1 day. Current streak 1, longest 1.') {
    throw new Error('singular wording should read "1 entry on 1 day"');
  }

  console.log('✓ Activity grid verified: weekdays, level thresholds, the 2026-10-19..11-01 window counted by hand, future days, old entries, empty log, refusals');
}
