import { streakSummary } from '../../core/journal';
import type { InquiryEntry, Timestamp } from '../../core/journal';

/**
 * Milestones: a small, quiet acknowledgement when the learner does something that good inquiry is made of
 * (roadmap R6, micro-feedback).
 *
 * Three rules this file holds by construction:
 *
 * 1. **Behaviour, never correctness.** Every rule looks only at what the learner did (predicted a number, wrote a
 *    conclusion, changed one thing and measured again, attached their own fit, came back on consecutive days). None
 *    compares a prediction with a measurement or says whether anything is right: that is the learner's job
 *    (Constitution Art. 2.2) and a score would invite chasing it.
 * 2. **Nothing to lose.** A milestone is a function of the saved log, so it can never be taken away, never
 *    expires, and has no "streak at risk" nagging. Longest streak counts, not the current one.
 * 3. **Pure.** Entries and today's date in, a list out: checked against hand-counted logs, no browser.
 */

export interface Milestone {
  id: string;
  /** Short, plain. */
  title: string;
  /** One sentence naming what the learner did, in their own terms. */
  detail: string;
}

/** Everything that can be earned, in the order it is shown. */
export const MILESTONE_IDS = [
  'first-entry',
  'numeric-prediction',
  'closed-the-loop',
  'one-change',
  'own-fit',
  'three-instruments',
  'streak-3',
  'streak-7',
  'ten-entries',
] as const;

const FIT_POINTS = 5;

/** Two parameter sets that have the same names and differ in exactly one value. */
function differByOne(a: Record<string, number>, b: Record<string, number>): string | null {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length === 0 || ka.length !== kb.length || !ka.every((k) => k in b)) return null;
  const changed = ka.filter((k) => Math.abs(a[k] - b[k]) > 1e-12);
  return changed.length === 1 ? changed[0] : null;
}

/** The first pair of entries on one instrument and channel that differ in a single parameter, if any. */
function oneChange(entries: readonly InquiryEntry[]): { sandboxId: string; parameter: string } | null {
  const groups = new Map<string, InquiryEntry[]>();
  for (const e of entries) {
    const key = `${e.sandboxId}\u0000${e.measurement.channel}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const parameter = differByOne(list[i].parameters, list[j].parameters);
        if (parameter) return { sandboxId: list[i].sandboxId, parameter };
      }
    }
  }
  return null;
}

/** What the saved log has earned. `titles` maps an instrument id to its name, for sentences a person reads. */
export function milestonesEarned(
  entries: readonly InquiryEntry[],
  today: Timestamp,
  titles: Record<string, string> = {}
): Milestone[] {
  const out: Milestone[] = [];
  const add = (id: (typeof MILESTONE_IDS)[number], title: string, detail: string) => out.push({ id, title, detail });
  const name = (id: string) => titles[id] ?? id;

  if (entries.length >= 1) add('first-entry', 'First entry', 'You wrote a prediction, took a reading and saved both.');
  if (entries.some((e) => e.prediction.value !== undefined)) {
    add('numeric-prediction', 'Predicted a number', 'You put a number on your prediction before you measured.');
  }
  if (entries.some((e) => e.prediction.value !== undefined && e.explanation.trim() !== '')) {
    add('closed-the-loop', 'Predicted, measured, explained', 'You gave a number, took a reading, and wrote what you made of it.');
  }
  const change = oneChange(entries);
  if (change) {
    add('one-change', 'Changed one thing', `On ${name(change.sandboxId)} you changed only ${change.parameter} and measured again.`);
  }
  if (entries.some((e) => e.fit && e.fit.sampleCount >= FIT_POINTS)) {
    add('own-fit', 'Fitted your own curve', `You attached your own fit over ${FIT_POINTS} or more of your points.`);
  }
  if (new Set(entries.map((e) => e.sandboxId)).size >= 3) {
    add('three-instruments', 'Three instruments', 'You have recorded work on three different instruments.');
  }
  const longest = entries.length === 0 ? 0 : streakSummary(entries, today).longest;
  if (longest >= 3) add('streak-3', 'Three days running', 'You recorded work on three days in a row.');
  if (longest >= 7) add('streak-7', 'A week running', 'You recorded work on seven days in a row.');
  if (entries.length >= 10) add('ten-entries', 'Ten entries', 'Ten saved investigations.');
  return out;
}

/** Milestones in `after` that `before` did not have: what a save just earned. */
export function newMilestones(before: readonly Milestone[], after: readonly Milestone[]): Milestone[] {
  const had = new Set(before.map((m) => m.id));
  return after.filter((m) => !had.has(m.id));
}
