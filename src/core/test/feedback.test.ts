import { MILESTONE_IDS, milestonesEarned, newMilestones } from '../../ui/journal/milestones';
import { CHIME, MAX_GAIN, MAX_SECONDS, SOUND_STORAGE_KEY, loadSound, parseSound, saveSound } from '../../ui/journal/chime';
import type { InquiryEntry } from '../journal';

/**
 * Micro-feedback checks (roadmap R6). Milestones are rules over the saved log, so each is checked against logs
 * counted by hand: what earns it, and the nearest log that must not. The two promises that matter to a learner are
 * checked directly: nothing is scored (the same behaviour earns the same milestones whatever the numbers say), and
 * sound stays off, quiet and short unless asked for.
 */
interface Opts {
  sandbox?: string;
  channel?: string;
  params?: Record<string, number>;
  predicted?: number;
  measured?: number;
  explanation?: string;
  fitPoints?: number;
}
let counter = 0;
function entry(day: string, o: Opts = {}): InquiryEntry {
  counter += 1;
  return {
    id: `e${counter}`,
    sandboxId: o.sandbox ?? 'free-fall',
    createdAt: `${day}T09:00:00.000Z`,
    prediction: o.predicted === undefined ? { text: 'p' } : { text: 'p', value: o.predicted, unit: 'm' },
    parameters: o.params ?? { m: 1, k: 5 },
    measurement: { channel: o.channel ?? 'x', value: o.measured ?? 1 },
    explanation: o.explanation ?? '',
    ...(o.fitPoints === undefined ? {} : { fit: { model: 'linear' as const, rSquared: 0.9, sampleCount: o.fitPoints } }),
  } as InquiryEntry;
}
const TODAY = '2026-10-31T12:00:00.000Z';
const ids = (entries: InquiryEntry[]) => milestonesEarned(entries, TODAY).map((m) => m.id).join(',');
function expectIds(label: string, entries: InquiryEntry[], want: string): void {
  const got = ids(entries);
  if (got !== want) throw new Error(`${label}: expected [${want}] but got [${got}]`);
}

export function runFeedbackVerification(): void {
  expectIds('an empty log earns nothing', [], '');
  expectIds('one plain entry', [entry('2026-10-31')], 'first-entry');
  expectIds('a numeric prediction', [entry('2026-10-31', { predicted: 2 })], 'first-entry,numeric-prediction');
  expectIds('a number and a conclusion', [entry('2026-10-31', { predicted: 2, explanation: 'it fell faster' })], 'first-entry,numeric-prediction,closed-the-loop');
  expectIds('a conclusion without a number is not the loop', [entry('2026-10-31', { explanation: 'it fell faster' })], 'first-entry');
  expectIds('a blank conclusion is not a conclusion', [entry('2026-10-31', { predicted: 2, explanation: '   ' })], 'first-entry,numeric-prediction');

  // Changed one thing: same instrument and channel, parameters that differ in exactly one value.
  const base = { m: 1, k: 5 };
  expectIds('one value changed', [entry('2026-10-31', { params: base }), entry('2026-10-31', { params: { m: 2, k: 5 } })], 'first-entry,one-change');
  expectIds('two values changed', [entry('2026-10-31', { params: base }), entry('2026-10-31', { params: { m: 2, k: 6 } })], 'first-entry');
  expectIds('nothing changed', [entry('2026-10-31', { params: base }), entry('2026-10-31', { params: base })], 'first-entry');
  expectIds('another channel', [entry('2026-10-31', { params: base }), entry('2026-10-31', { params: { m: 2, k: 5 }, channel: 'v' })], 'first-entry');
  expectIds('another instrument', [entry('2026-10-31', { params: base }), entry('2026-10-31', { params: { m: 2, k: 5 }, sandbox: 'lcr-circuit' })], 'first-entry');
  expectIds('different parameter names', [entry('2026-10-31', { params: base }), entry('2026-10-31', { params: { m: 2, c: 5 } })], 'first-entry');
  const named = milestonesEarned([entry('2026-10-31', { params: base }), entry('2026-10-31', { params: { m: 2, k: 5 } })], TODAY, { 'free-fall': 'Free fall' }).find((m) => m.id === 'one-change');
  if (!named || !named.detail.includes('Free fall') || !named.detail.includes(' m ')) throw new Error(`the one-change sentence should name the instrument and the parameter, got "${named?.detail}"`);

  // The learner's own fit counts from five points.
  expectIds('a fit over four points', [entry('2026-10-31', { fitPoints: 4 })], 'first-entry');
  expectIds('a fit over five points', [entry('2026-10-31', { fitPoints: 5 })], 'first-entry,own-fit');

  // Breadth.
  const three = ['free-fall', 'lcr-circuit', 'doppler-shift'].map((s) => entry('2026-10-31', { sandbox: s }));
  expectIds('two instruments', three.slice(0, 2), 'first-entry');
  expectIds('three instruments', three, 'first-entry,three-instruments');

  // Streaks: the longest run counts, so a milestone is never lost by missing a day.
  const run = (from: number, n: number) => Array.from({ length: n }, (_, i) => entry(`2026-10-${String(from + i).padStart(2, '0')}`));
  expectIds('two days running', run(20, 2), 'first-entry');
  expectIds('three days running', run(20, 3), 'first-entry,streak-3');
  expectIds('an old streak still counts', run(1, 3), 'first-entry,streak-3');
  expectIds('seven days running', run(20, 7), 'first-entry,streak-3,streak-7');
  expectIds('six days running', run(20, 6), 'first-entry,streak-3');
  expectIds('a gap breaks the run', [...run(20, 2), ...run(24, 2)], 'first-entry');

  // Ten entries.
  expectIds('nine entries', Array.from({ length: 9 }, () => entry('2026-10-31')), 'first-entry');
  expectIds('ten entries', Array.from({ length: 10 }, () => entry('2026-10-31')), 'first-entry,ten-entries');

  // Never scored: the same behaviour earns the same milestones whatever the numbers are.
  const right = [entry('2026-10-31', { predicted: 5, measured: 5, explanation: 'x' })];
  const wrong = [entry('2026-10-31', { predicted: 5, measured: 500, explanation: 'x' })];
  if (ids(right) !== ids(wrong)) throw new Error('a prediction that matches the measurement must earn exactly what one that does not match earns');

  // The order is the declared order, and every id that can be earned is declared.
  const everything = [
    ...run(20, 7),
    entry('2026-10-31', { predicted: 1, explanation: 'x', fitPoints: 6, params: base }),
    entry('2026-10-31', { params: { m: 3, k: 5 } }),
    entry('2026-10-31', { sandbox: 'lcr-circuit' }),
    entry('2026-10-31', { sandbox: 'doppler-shift' }),
  ];
  const all = milestonesEarned(everything, TODAY).map((m) => m.id);
  if (all.join(',') !== MILESTONE_IDS.join(',')) throw new Error(`a log that earns everything gave [${all}], expected [${MILESTONE_IDS}]`);

  // What a save just earned.
  const before = milestonesEarned([entry('2026-10-31')], TODAY);
  const after = milestonesEarned([entry('2026-10-31'), entry('2026-10-31', { predicted: 3 })], TODAY);
  const fresh = newMilestones(before, after).map((m) => m.id).join(',');
  if (fresh !== 'numeric-prediction') throw new Error(`the second entry should earn only numeric-prediction, got [${fresh}]`);
  if (newMilestones(after, after).length !== 0) throw new Error('nothing should be new when nothing changed');

  // Sound: off unless asked, only the word "on" turns it on, blocked storage never throws.
  const store = new Map<string, string>();
  const mem = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  if (loadSound(mem) !== false || loadSound(null) !== false || loadSound(undefined) !== false) throw new Error('sound must default to off');
  for (const junk of ['yes', 'ON', 'true', '1', '', null, undefined, 1]) if (parseSound(junk)) throw new Error(`${JSON.stringify(junk)} must not turn sound on`);
  if (!saveSound(mem, true) || loadSound(mem) !== true || store.get(SOUND_STORAGE_KEY) !== 'on') throw new Error('turning sound on should be remembered');
  if (!saveSound(mem, false) || loadSound(mem) !== false) throw new Error('turning sound off should be remembered');
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  if (loadSound(blocked) !== false || saveSound(blocked, true) !== false) throw new Error('blocked storage should read as off and report that nothing was saved');

  // The chime stays quiet and short.
  if (CHIME.length < 1) throw new Error('the chime has no notes');
  for (const n of CHIME) {
    if (!(n.gain > 0 && n.gain <= MAX_GAIN)) throw new Error(`a chime note has gain ${n.gain}, above the ${MAX_GAIN} cap`);
    if (!(n.frequency >= 200 && n.frequency <= 2000)) throw new Error(`a chime note at ${n.frequency} Hz is outside the comfortable range`);
  }
  const end = Math.max(...CHIME.map((n) => n.start + n.duration));
  if (end > MAX_SECONDS) throw new Error(`the chime lasts ${end} s, longer than ${MAX_SECONDS} s`);
  if (MAX_GAIN > 0.15 || MAX_SECONDS > 1) throw new Error('the caps themselves must stay quiet and short');

  console.log(`✓ Micro-feedback verified: ${MILESTONE_IDS.length} milestones each earned by hand-counted logs and not by the nearest log that falls short, nothing scored, newly earned diff, sound off by default and capped at gain ${MAX_GAIN} / ${MAX_SECONDS} s`);
}
