/**
 * The Inquiry Log's app-layer glue (Kaizen batch 3a).
 *
 * Everything the drawer decides *before* or *after* it touches `src/core/journal` lives here as a
 * pure function, so the rules are checked by `npm test` in Node rather than by clicking around a
 * browser (Art. 1.5: a check that can fail beats a claim that it works):
 *
 * - `draftToEntryInput` turns raw form text into the entry the journal validates. A blank optional
 *   field becomes *absent*, not an empty string: `prediction.unit: ''` is refused by the journal, and
 *   an empty box is not a unit the learner failed to name.
 * - `refusalMessage` maps a `JournalValidationError.field` onto the control that has to show it, so
 *   no component guesses where `parameters.omega: ...` belongs on screen.
 * - `parameterUnitsFor` derives the CSV's unit header from the sandbox manifest instead of spelling a
 *   unit into the exporter, and skips a sandbox that has since left the manifest rather than throwing
 *   on a learner's older entries (Art. 5.1: units have exactly one source).
 * - `createInquiryJournal` decides storage once and says whether it is durable, because "saved" and
 *   "saved until you close the tab" must not look the same to the person who just recorded a lab.
 */

import {
  InquiryJournal,
  JournalStorageError,
  JournalValidationError,
  LocalStorageJournalPersistence,
  MemoryJournalPersistence,
  resolveBrowserStorage,
  schemaFromCatalog,
} from '../../core/journal';
import type {
  InquiryEntry,
  InquiryEntryInput,
  InquiryFit,
  InquiryMeasurement,
  InquiryPrediction,
  JournalSandboxSchema,
  JournalStorage,
} from '../../core/journal';

/** Which control an inline error belongs under. `form` means "not a field": show it at the top. */
export type DraftAnchor =
  | 'prediction'
  | 'predictionValue'
  | 'predictionUnit'
  | 'channel'
  | 'measurementValue'
  | 'measurementUnit'
  | 'explanation'
  | 'fit'
  | 'parameters'
  | 'form';

/**
 * The form's own state: every box as the text the learner typed.
 *
 * Kept as strings rather than numbers so a half-typed value (`-`, `1.`) is not rewritten under the
 * cursor. Conversion happens once, in `draftToEntryInput`, and an unparseable number becomes `NaN`
 * so the journal's own check names the field — one validator, not two that can disagree.
 */
export interface InquiryDraft {
  predictionText: string;
  predictionValue: string;
  predictionUnit: string;
  channel: string;
  measurementValue: string;
  measurementUnit: string;
  explanation: string;
  fitModel: 'linear' | 'exponential';
  fitRSquared: string;
  fitSampleCount: string;
}

/** A draft for one sandbox, pre-filled with that sandbox's first channel and its declared unit. */
export function emptyDraft(schema?: JournalSandboxSchema): InquiryDraft {
  const channels = channelsOf(schema);
  const channel = channels[0] ?? '';
  return {
    predictionText: '',
    predictionValue: '',
    predictionUnit: '',
    channel,
    measurementValue: '',
    measurementUnit: unitForChannel(schema, channel) ?? '',
    explanation: '',
    fitModel: 'linear',
    fitRSquared: '',
    fitSampleCount: '',
  };
}

/** Channels a sandbox emits, sorted so the picker's order is stable between renders. */
export function channelsOf(schema?: JournalSandboxSchema): string[] {
  if (!schema?.channels) return [];
  return Object.keys(schema.channels).sort();
}

/**
 * The unit the manifest declares for a channel, or `undefined` when it declares none.
 *
 * The UI never spells a unit into its own code: it asks this, and the string it draws is the string
 * the manifest declared (PR #7).
 */
export function unitForChannel(
  schema: JournalSandboxSchema | undefined,
  channel: string
): string | undefined {
  const declared = schema?.channels?.[channel];
  return declared === undefined ? undefined : declared;
}

/** Manifest schema for a sandbox, or `undefined` when the manifest no longer describes it. */
export function schemaForSandbox(sandboxId: string): JournalSandboxSchema | undefined {
  try {
    return schemaFromCatalog(sandboxId);
  } catch {
    return undefined;
  }
}

/**
 * Text from a numeric input as a number. Blank and non-numeric both become `NaN`, which the journal
 * refuses under the right field name — the form does not get its own opinion about what a number is.
 */
export function numericField(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return Number.NaN;
  return Number(trimmed);
}

/**
 * The subset of a live parameter set the journal may record.
 *
 * Three sandboxes carry engine initial conditions that have no slider at all (`lorentz-force`
 * `initialSpeedY`, `faraday-induction` `coilRadius`/`initialZ`, `quantum-tunneling`
 * `barrierPosition`/`initialX`). They are not conditions the learner set, and the journal refuses any
 * parameter its schema does not declare — so the snapshot is restricted to the declared parameters
 * rather than a save failing over a value nobody on screen could have changed.
 */
export function declaredParameters(
  parameters: Record<string, number>,
  schema?: JournalSandboxSchema
): Record<string, number> {
  if (!schema) return { ...parameters };
  const declared: Record<string, number> = {};
  for (const parameterId of Object.keys(schema.parameters)) {
    if (parameterId in parameters) declared[parameterId] = parameters[parameterId];
  }
  return declared;
}

/** What the drawer knows about the run an entry is being recorded for. */
export interface DraftContext {
  sandboxId: string;
  /** The live parameters at the moment of saving — the conditions the run was made under. */
  parameters: Record<string, number>;
  /** The active sandbox's schema; when present the snapshot is restricted to its declared parameters. */
  schema?: JournalSandboxSchema;
}

/**
 * Form text → the entry the journal validates.
 *
 * Deliberately does not pre-validate: the caller hands this to `InquiryJournal.add`, and whatever the
 * journal refuses comes back through `refusalMessage` under the field the learner must fix.
 */
export function draftToEntryInput(draft: InquiryDraft, context: DraftContext): InquiryEntryInput {
  const prediction: InquiryPrediction = { text: draft.predictionText.trim() };
  if (draft.predictionValue.trim() !== '') {
    prediction.value = numericField(draft.predictionValue);
    prediction.unit = draft.predictionUnit.trim();
  }

  const measurement: InquiryMeasurement = {
    channel: draft.channel,
    value: numericField(draft.measurementValue),
  };
  const measurementUnit = draft.measurementUnit.trim();
  if (measurementUnit !== '') measurement.unit = measurementUnit;

  const input: InquiryEntryInput = {
    sandboxId: context.sandboxId,
    prediction,
    parameters: declaredParameters(context.parameters, context.schema),
    measurement,
    explanation: draft.explanation.trim(),
  };

  // A fit is recorded only when the learner filled something in; a half-filled fit is still submitted
  // so the journal refuses it by field name instead of the number quietly disappearing.
  if (draft.fitRSquared.trim() !== '' || draft.fitSampleCount.trim() !== '') {
    const fit: InquiryFit = {
      model: draft.fitModel,
      rSquared: numericField(draft.fitRSquared),
      sampleCount: numericField(draft.fitSampleCount),
    };
    input.fit = fit;
  }

  return input;
}

const FIELD_ANCHORS: Record<string, DraftAnchor> = {
  prediction: 'prediction',
  'prediction.text': 'prediction',
  'prediction.value': 'predictionValue',
  'prediction.unit': 'predictionUnit',
  measurement: 'channel',
  'measurement.channel': 'channel',
  'measurement.value': 'measurementValue',
  'measurement.unit': 'measurementUnit',
  explanation: 'explanation',
};

/**
 * Which control shows the refusal for a field path.
 *
 * Unknown paths land on `form` (a message at the top of the panel) rather than being dropped: a
 * refusal the learner cannot see is the same as a silent failure.
 */
export function anchorForField(field: string): DraftAnchor {
  if (field.startsWith('parameters')) return 'parameters';
  if (field.startsWith('fit')) return 'fit';
  const anchor = FIELD_ANCHORS[field];
  if (anchor !== undefined) return anchor;
  return 'form';
}

/** A refusal, ready to render: the field the journal named, the control to show it under, the words. */
export interface Refusal {
  field: string;
  anchor: DraftAnchor;
  message: string;
}

/**
 * Normalise anything a save or an export can throw into something the drawer can display.
 *
 * `JournalValidationError.message` is `"<field>: <reason>"`; the field is already carried separately,
 * so the prefix is stripped to avoid saying the same thing twice on screen.
 */
export function refusalMessage(error: unknown): Refusal {
  if (error instanceof JournalValidationError) {
    const prefix = `${error.field}: `;
    const message = error.message.startsWith(prefix) ? error.message.slice(prefix.length) : error.message;
    return { field: error.field, anchor: anchorForField(error.field), message };
  }
  if (error instanceof JournalStorageError) {
    return { field: 'storage', anchor: 'form', message: error.message };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { field: 'unknown', anchor: 'form', message };
}

/**
 * Sandbox id → parameter id → unit, for the CSV's metadata header.
 *
 * Parameter units are read from the manifest at export time rather than copied into every entry: a
 * second copy is the duplicate Art. 5.2 calls a defect. A sandbox the manifest no longer describes is
 * skipped — an export of last term's log must not fail because a sandbox was retired.
 */
export function parameterUnitsFor(
  entries: readonly InquiryEntry[],
  lookup: (sandboxId: string) => JournalSandboxSchema | undefined = schemaForSandbox
): Record<string, Record<string, string>> {
  const units: Record<string, Record<string, string>> = {};
  for (const entry of entries) {
    if (units[entry.sandboxId] !== undefined) continue;
    const schema = lookup(entry.sandboxId);
    if (!schema) continue;
    const parameterUnits: Record<string, string> = {};
    for (const [parameterId, range] of Object.entries(schema.parameters)) {
      parameterUnits[parameterId] = range.unit;
    }
    if (Object.keys(parameterUnits).length > 0) units[entry.sandboxId] = parameterUnits;
  }
  return units;
}

/**
 * The unit shown beside a stored measurement: what the learner recorded, else what the manifest
 * declares for that channel. Empty when neither says anything, which is an honest blank.
 */
export function displayUnit(
  entry: InquiryEntry,
  lookup: (sandboxId: string) => JournalSandboxSchema | undefined = schemaForSandbox
): string {
  const recorded = entry.measurement.unit?.trim();
  if (recorded) return recorded;
  return unitForChannel(lookup(entry.sandboxId), entry.measurement.channel) ?? '';
}

/** Export filename: `:` and `.` are safe on Windows and in a URL only after this, so both go. */
export function journalExportFilename(kind: 'csv' | 'json', now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `agentuto_inquiry-log_${stamp}.${kind}`;
}

export interface InquiryJournalRuntime {
  journal: InquiryJournal;
  /**
   * False when the browser refused storage (Safari private mode, blocked policy). The drawer must say
   * so: an entry that vanishes when the tab closes is not saved, and must not look saved.
   */
  persistent: boolean;
}

/** Build the one journal the app uses, deciding storage once and reporting whether it is durable. */
export function createInquiryJournal(
  options: { storage?: JournalStorage | null; now?: () => Date; idFactory?: () => string } = {}
): InquiryJournalRuntime {
  const storage = resolveBrowserStorage(options.storage ?? undefined);
  if (storage) {
    return {
      journal: new InquiryJournal({
        persistence: new LocalStorageJournalPersistence(storage),
        now: options.now,
        idFactory: options.idFactory,
      }),
      persistent: true,
    };
  }
  return {
    journal: new InquiryJournal({
      persistence: new MemoryJournalPersistence(),
      now: options.now,
      idFactory: options.idFactory,
    }),
    persistent: false,
  };
}