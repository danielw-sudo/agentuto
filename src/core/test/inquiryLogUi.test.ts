import { SIMULATION_CATALOG } from '../../simulations';
import {
  InquiryJournal,
  MemoryJournalPersistence,
  formatJournalToCSV,
  schemaFromCatalog,
} from '../journal';
import type { InquiryEntry, JournalSandboxSchema, JournalStorage } from '../journal';
import {
  anchorForField,
  channelsOf,
  createInquiryJournal,
  declaredParameters,
  displayUnit,
  draftToEntryInput,
  emptyDraft,
  journalExportFilename,
  parameterUnitsFor,
  refusalMessage,
  schemaForSandbox,
  unitForChannel,
} from '../../ui/journal/inquiryLogModel';
import type { DraftAnchor, InquiryDraft } from '../../ui/journal/inquiryLogModel';

/**
 * Inquiry Log UI checks (Kaizen batch 3a).
 *
 * The drawer draws; these check the rules behind it, without a browser. Three of them are worth
 * having because they fail on a plausible mistake rather than on a typo:
 *
 * - U2 runs real refusals through the journal and asserts each one lands on a control that exists.
 *   Rename a field in `validation.ts` and the learner's error message silently moves to the top of
 *   the form; this check refuses that.
 * - U3 asks every sandbox in the manifest for every declared channel's unit and compares it with the
 *   declaration. If a component ever spells a unit into its own code, this is where the disagreement
 *   would first be measurable.
 * - U4 exports a log spanning two sandboxes and one retired sandbox. An export that throws on last
 *   term's entries loses exactly the data a learner kept.
 *
 * Called from `runCoreVerification`, so `npm test` still gates everything through one command.
 */

class MapStorage implements JournalStorage {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    const value = this.map.get(key);
    return value === undefined ? null : value;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** Storage that exists but throws on every write, as in Safari private mode. */
class BlockedStorage implements JournalStorage {
  getItem(): string | null {
    throw new Error('SecurityError: storage is blocked');
  }

  setItem(): void {
    throw new Error('SecurityError: storage is blocked');
  }

  removeItem(): void {}
}

function sequentialIds(): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `ui-entry-${counter}`;
  };
}

const FIXED_CLOCK = (): Date => new Date('2026-10-31T09:12:04.318Z');

const SANDBOX_ID = 'harmonic-oscillator';
const schema: JournalSandboxSchema = schemaFromCatalog(SANDBOX_ID);
const CHANNELS = channelsOf(schema);
const PRIMARY_CHANNEL = CHANNELS[0];
const PRIMARY_UNIT = unitForChannel(schema, PRIMARY_CHANNEL) ?? '';
const PARAMETER_ID = Object.keys(schema.parameters)[0];
const PARAMETER_RANGE = schema.parameters[PARAMETER_ID];
const PARAMETERS: Record<string, number> = {
  [PARAMETER_ID]: PARAMETER_RANGE.min + (PARAMETER_RANGE.max - PARAMETER_RANGE.min) * 0.5,
};

function makeJournal(): InquiryJournal {
  return new InquiryJournal({
    persistence: new MemoryJournalPersistence(),
    now: FIXED_CLOCK,
    idFactory: sequentialIds(),
  });
}

/** A draft a learner could actually have typed: prediction measured and explained. */
function filledDraft(overrides: Partial<InquiryDraft> = {}): InquiryDraft {
  return {
    ...emptyDraft(schema),
    predictionText: 'A stiffer spring should shorten the period',
    predictionValue: '1.4',
    predictionUnit: 's',
    measurementValue: '1.392',
    explanation: 'The measured period sat inside the predicted range.',
    ...overrides,
  };
}

/** The refusal a save would show, or a failure if the save unexpectedly succeeded. */
function refusalFor(draft: InquiryDraft): ReturnType<typeof refusalMessage> {
  const journal = makeJournal();
  try {
    journal.add(draftToEntryInput(draft, { sandboxId: SANDBOX_ID, parameters: PARAMETERS, schema }), schema);
  } catch (error) {
    return refusalMessage(error);
  }
  throw new Error('the drawer would have saved an entry the journal should have refused');
}

function expectAnchor(draft: InquiryDraft, expected: DraftAnchor, label: string): void {
  const refusal = refusalFor(draft);
  if (refusal.anchor !== expected) {
    throw new Error(
      `${label}: refusal for "${refusal.field}" is shown under "${refusal.anchor}", expected "${expected}"`
    );
  }
  // The message must not repeat the field the refusal already names, nor arrive empty.
  if (refusal.message.trim() === '') {
    throw new Error(`${label}: refusal for "${refusal.field}" carries no message to show`);
  }
  if (refusal.message.startsWith(`${refusal.field}:`)) {
    throw new Error(`${label}: message still carries its field prefix, so the panel says it twice`);
  }
}

export function runInquiryLogUiVerification(): void {
  // U1 — Form text becomes the entry the journal stores, and blanks stay absent. An empty unit is not
  // a unit the learner failed to name; sending `unit: ''` would be refused and the save would fail
  // for a reason nobody could see on screen.
  const journalU1 = makeJournal();
  const qualitative = journalU1.add(
    draftToEntryInput(
      filledDraft({ predictionValue: '', predictionUnit: '', measurementUnit: '' }),
      { sandboxId: SANDBOX_ID, parameters: PARAMETERS, schema }
    ),
    schema
  );
  if ('value' in qualitative.prediction || 'unit' in qualitative.prediction) {
    throw new Error('a qualitative prediction was stored with an empty value/unit instead of none');
  }
  if ('unit' in qualitative.measurement) {
    throw new Error('a measurement with no unit was stored with an empty unit instead of none');
  }
  if (qualitative.fit !== undefined) {
    throw new Error('an unfilled fit section was stored as a fit');
  }

  const quantitative = journalU1.add(
    draftToEntryInput(filledDraft(), { sandboxId: SANDBOX_ID, parameters: PARAMETERS, schema }),
    schema
  );
  if (quantitative.prediction.value !== 1.4 || quantitative.prediction.unit !== 's') {
    throw new Error(
      `quantitative prediction stored as ${String(quantitative.prediction.value)} ${String(quantitative.prediction.unit)}, expected 1.4 s`
    );
  }
  if (quantitative.measurement.value !== 1.392 || quantitative.measurement.unit !== PRIMARY_UNIT) {
    throw new Error(
      `measurement stored as ${quantitative.measurement.value} ${String(quantitative.measurement.unit)}, expected 1.392 ${PRIMARY_UNIT}`
    );
  }
  if (quantitative.parameters[PARAMETER_ID] !== PARAMETERS[PARAMETER_ID]) {
    throw new Error('the saved entry does not carry the conditions the run was made under');
  }

  const fitted = journalU1.add(
    draftToEntryInput(filledDraft({ fitRSquared: '0.984', fitSampleCount: '12' }), {
      sandboxId: SANDBOX_ID,
      parameters: PARAMETERS,
    }),
    schema
  );
  if (fitted.fit?.rSquared !== 0.984 || fitted.fit.sampleCount !== 12 || fitted.fit.model !== 'linear') {
    throw new Error('the learner\'s own fit was not carried into the entry it was attached to');
  }
  console.log(
    `✓ Inquiry Log form → entry: blank optional fields stored as absent (qualitative prediction, unitless measurement, no fit), filled fields kept verbatim, and the run's own parameters snapshotted`
  );

  // U2 — Every refusal the journal can produce lands on a control the drawer actually renders.
  expectAnchor(filledDraft({ predictionText: '   ' }), 'prediction', 'blank prediction');
  expectAnchor(
    filledDraft({ predictionValue: '1.4', predictionUnit: '' }),
    'predictionUnit',
    'quantitative prediction with no unit'
  );
  expectAnchor(filledDraft({ channel: 'charm' }), 'channel', 'channel the sandbox does not emit');
  expectAnchor(filledDraft({ measurementValue: 'abc' }), 'measurementValue', 'unparseable measurement');
  expectAnchor(filledDraft({ measurementUnit: 'furlongs' }), 'measurementUnit', 'unit contradicting the manifest');
  expectAnchor(
    filledDraft({ fitRSquared: '1.4', fitSampleCount: '5' }),
    'fit',
    'R² outside 0..1'
  );
  expectAnchor(
    filledDraft({ fitRSquared: '0.98', fitSampleCount: '1' }),
    'fit',
    'a single-point fit'
  );
  const halfFit = refusalFor(filledDraft({ fitRSquared: '', fitSampleCount: '5' }));
  if (halfFit.field !== 'fit.rSquared') {
    throw new Error(
      `a half-filled fit was refused as "${halfFit.field}"; it must name the missing R², not vanish silently`
    );
  }
  // The one refusal the form cannot cause on its own still has to say something, at the top.
  if (anchorForField('parameters.notAParameter') !== 'parameters') {
    throw new Error('a refusal about a parameter would not be shown beside the conditions');
  }
  if (anchorForField('sandboxId') !== 'form') {
    throw new Error('a refusal about the sandbox itself would not be shown at the top of the panel');
  }
  console.log(
    '✓ Inquiry Log inline refusals: each refused field path maps to a real control (prediction, prediction unit, channel, measurement, measurement unit, fit) and unknown paths fall back to the top of the panel instead of disappearing'
  );

  // U3 — The unit the drawer displays is the unit the manifest declares, for every channel of every
  // sandbox. This is the check that fails the day a component starts spelling a unit itself.
  let sandboxCount = 0;
  let channelCount = 0;
  for (const sandboxId of Object.keys(SIMULATION_CATALOG)) {
    const sandboxSchema = schemaForSandbox(sandboxId);
    if (!sandboxSchema) {
      throw new Error(`the manifest lists "${sandboxId}" but its schema could not be derived`);
    }
    const channels = channelsOf(sandboxSchema);
    if (channels.length === 0) {
      throw new Error(`sandbox "${sandboxId}" offers no channel in the measurement picker`);
    }
    if (channels.join('\u0000') !== [...channels].sort().join('\u0000')) {
      throw new Error(`sandbox "${sandboxId}" channel order is not stable, so the picker reorders`);
    }
    for (const channel of channels) {
      const unit = unitForChannel(sandboxSchema, channel);
      const declared = sandboxSchema.channels?.[channel];
      if (unit === undefined || unit !== declared) {
        throw new Error(
          `sandbox "${sandboxId}" channel "${channel}" would display unit "${String(unit)}" instead of the declared "${String(declared)}"`
        );
      }
      channelCount += 1;
    }
    sandboxCount += 1;
  }
  if (unitForChannel(schema, 'aChannelThisSandboxNeverEmits') !== undefined) {
    throw new Error('a channel the sandbox does not emit still produced a unit');
  }
  if (unitForChannel(undefined, PRIMARY_CHANNEL) !== undefined) {
    throw new Error('a missing schema still produced a unit');
  }
  console.log(
    `✓ Inquiry Log unit display: all ${channelCount} channels across ${sandboxCount} sandboxes show exactly the unit the manifest declares, a channel that is not emitted shows none, and the picker's order is stable`
  );

  // U4 — Export. The CSV's unit header is derived from the manifest per sandbox, and a log that
  // still holds a sandbox the manifest has since dropped exports instead of throwing.
  const otherSandboxId = Object.keys(SIMULATION_CATALOG).find((id) => id !== SANDBOX_ID)!;
  const otherSchema = schemaFromCatalog(otherSandboxId);
  const otherParameterId = Object.keys(otherSchema.parameters)[0];
  const otherChannel = channelsOf(otherSchema)[0];
  const logJournal = makeJournal();
  logJournal.add(
    draftToEntryInput(filledDraft(), { sandboxId: SANDBOX_ID, parameters: PARAMETERS, schema }),
    schema
  );
  logJournal.add(
    {
      sandboxId: otherSandboxId,
      prediction: { text: 'Predicting before measuring' },
      parameters: {
        [otherParameterId]:
          otherSchema.parameters[otherParameterId].min +
          (otherSchema.parameters[otherParameterId].max - otherSchema.parameters[otherParameterId].min) * 0.5,
      },
      measurement: { channel: otherChannel, value: 1 },
      explanation: '',
    },
    otherSchema
  );

  const entries = logJournal.all();
  const units = parameterUnitsFor(entries);
  for (const [sandboxId, sandboxSchema] of [
    [SANDBOX_ID, schema],
    [otherSandboxId, otherSchema],
  ] as const) {
    const recorded = units[sandboxId];
    if (!recorded) throw new Error(`export units are missing for sandbox "${sandboxId}"`);
    for (const [parameterId, range] of Object.entries(sandboxSchema.parameters)) {
      if (recorded[parameterId] !== range.unit) {
        throw new Error(
          `export states "${parameterId}" in "${String(recorded[parameterId])}" for "${sandboxId}", manifest declares "${range.unit}"`
        );
      }
    }
    if (Object.keys(recorded).length !== Object.keys(sandboxSchema.parameters).length) {
      throw new Error(`export invented or dropped parameters for sandbox "${sandboxId}"`);
    }
  }

  const csv = logJournal.exportCSV({ parameterUnits: units, exportedAt: '2026-10-31T09:12:04.318Z' });
  for (const sandboxId of [SANDBOX_ID, otherSandboxId]) {
    if (!csv.includes(`# Parameter units (${sandboxId}):`)) {
      throw new Error(`the exported CSV carries no parameter-unit header for "${sandboxId}"`);
    }
  }
  if (csv.includes('undefined')) {
    throw new Error('the exported CSV contains "undefined", so a unit was missing where a header was written');
  }
  const json = logJournal.exportJSON({ exportedAt: '2026-10-31T09:12:04.318Z' });
  if (JSON.parse(json).count !== entries.length) {
    throw new Error('the exported JSON disagrees with the log about how many entries it holds');
  }

  // A sandbox retired from the manifest: the entry is data, the units are not derivable, export holds.
  const retired: InquiryEntry = {
    id: 'retired-1',
    sandboxId: 'a-sandbox-that-left-the-manifest',
    createdAt: '2026-09-01T00:00:00.000Z',
    prediction: { text: 'From last term' },
    parameters: { omega: 2 },
    measurement: { channel: 'period', value: 3.1 },
    explanation: '',
  };
  const retiredUnits = parameterUnitsFor([...entries, retired]);
  if (Object.keys(retiredUnits).length !== Object.keys(units).length) {
    throw new Error('a retired sandbox contributed parameter units it could not have had');
  }
  // Written through the exporter directly: the retired entry cannot go through `journal.add`, because
  // no schema describes it any more — which is exactly the situation being checked.
  const mixedCsv = formatJournalToCSV([...entries, retired], {
    parameterUnits: retiredUnits,
    exportedAt: '2026-10-31T09:12:04.318Z',
  });
  if (!mixedCsv.includes('a-sandbox-that-left-the-manifest')) {
    throw new Error('an entry from a retired sandbox was dropped from the export');
  }
  if (displayUnit(retired) !== '') {
    throw new Error('a retired sandbox\'s measurement invented a unit it never recorded');
  }
  if (displayUnit(entries[0]) !== PRIMARY_UNIT) {
    throw new Error('a measurement saved without a unit did not fall back to the manifest\'s declared unit');
  }
  console.log(
    `✓ Inquiry Log export: CSV parameter-unit headers derived from the manifest for ${Object.keys(units).length} sandboxes, JSON count matches the log, and entries from a sandbox the manifest no longer describes export without inventing a unit or throwing`
  );

  // U5 — Storage is decided once and reported honestly. Blocked storage must not look like a save,
  // and a durable storage must still hold the log after the app is opened again.
  const blocked = createInquiryJournal({ storage: new BlockedStorage(), now: FIXED_CLOCK, idFactory: sequentialIds() });
  if (blocked.persistent) {
    throw new Error('blocked browser storage was reported as durable');
  }
  blocked.journal.add(
    draftToEntryInput(filledDraft(), { sandboxId: SANDBOX_ID, parameters: PARAMETERS, schema }),
    schema
  );
  if (blocked.journal.size !== 1) {
    throw new Error('a session without durable storage could not keep an entry at all');
  }

  const storage = new MapStorage();
  const first = createInquiryJournal({ storage, now: FIXED_CLOCK, idFactory: sequentialIds() });
  if (!first.persistent) {
    throw new Error('usable browser storage was reported as unavailable');
  }
  first.journal.add(
    draftToEntryInput(filledDraft(), { sandboxId: SANDBOX_ID, parameters: PARAMETERS, schema }),
    schema
  );
  const reopened = createInquiryJournal({ storage, now: FIXED_CLOCK, idFactory: sequentialIds() });
  if (reopened.journal.size !== 1 || reopened.journal.all()[0].prediction.text !== 'A stiffer spring should shorten the period') {
    throw new Error('the log did not survive reopening the app on the same storage');
  }
  console.log(
    '✓ Inquiry Log storage: blocked storage falls back to a session-only log and says so instead of pretending to save, while a usable store keeps its entries across a reopen'
  );

  // U7 — One save from every sandbox in the manifest, using that sandbox's own live parameter set.
  // The log must work everywhere, not only where the manifest happens to declare every field the
  // engine keeps: three sandboxes carry initial conditions with no slider, and a save there must
  // still succeed with the declared conditions recorded.
  const undeclaredEngineFields: string[] = [];
  let savedSandboxes = 0;
  for (const sandboxId of Object.keys(SIMULATION_CATALOG)) {
    const registration = SIMULATION_CATALOG[sandboxId];
    const sandboxSchema = schemaFromCatalog(sandboxId);
    const live = { ...registration.defaultParams };
    const undeclared = Object.keys(live).filter((id) => !(id in sandboxSchema.parameters));
    if (undeclared.length > 0) undeclaredEngineFields.push(`${sandboxId}: ${undeclared.join(' + ')}`);

    const journal = new InquiryJournal({
      persistence: new MemoryJournalPersistence(),
      now: FIXED_CLOCK,
      idFactory: () => `save-${sandboxId}`,
    });
    const draft: InquiryDraft = {
      ...emptyDraft(sandboxSchema),
      predictionText: 'Predicting before measuring',
      measurementValue: '1',
    };
    const entry = journal.add(
      draftToEntryInput(draft, { sandboxId, parameters: live, schema: sandboxSchema }),
      sandboxSchema
    );
    const recorded = Object.keys(entry.parameters);
    if (recorded.length === 0) {
      throw new Error(`a save from "${sandboxId}" recorded no conditions at all`);
    }
    for (const parameterId of recorded) {
      if (!(parameterId in sandboxSchema.parameters)) {
        throw new Error(`a save from "${sandboxId}" recorded "${parameterId}", which the sandbox does not declare`);
      }
    }
    if (recorded.length + undeclared.length !== Object.keys(live).length) {
      throw new Error(`a save from "${sandboxId}" dropped a declared condition the run was made under`);
    }
    if (declaredParameters(live, sandboxSchema)[recorded[0]] !== live[recorded[0]]) {
      throw new Error(`the snapshot values for "${sandboxId}" were rewritten rather than copied`);
    }
    savedSandboxes += 1;
  }
  console.log(
    `✓ Inquiry Log save path verified from all ${savedSandboxes} sandboxes with each sandbox's own live parameters: every declared condition is recorded, and ${undeclaredEngineFields.length} sandboxes carry engine-only initial conditions with no slider (${undeclaredEngineFields.join('; ')}) that are correctly left out instead of making the save fail`
  );

  // U6 — Export filenames are safe to save on any platform: a colon in a filename is not.
  const csvName = journalExportFilename('csv', new Date('2026-10-31T09:12:04.318Z'));
  const jsonName = journalExportFilename('json', new Date('2026-10-31T09:12:04.318Z'));
  for (const name of [csvName, jsonName]) {
    if (/[:\\/?*"<>|]/.test(name)) {
      throw new Error(`export filename "${name}" contains a character a filesystem refuses`);
    }
    if (!name.startsWith('agentuto_inquiry-log_') || name.includes(' ')) {
      throw new Error(`export filename "${name}" is not a stable, scriptable name`);
    }
  }
  if (!csvName.endsWith('.csv') || !jsonName.endsWith('.json')) {
    throw new Error('an export filename does not carry its own extension');
  }
  if (csvName === jsonName) {
    throw new Error('CSV and JSON exports would overwrite each other');
  }
  console.log(
    `✓ Inquiry Log export filenames: "${csvName}" and "${jsonName}" are distinguishable, extension-bearing and free of characters a filesystem refuses`
  );
}
