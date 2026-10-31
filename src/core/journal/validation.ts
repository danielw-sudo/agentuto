import type {
  InquiryEntry,
  InquiryEntryInput,
  JournalParameterRange,
  JournalSandboxSchema,
} from './types';

/**
 * Everything that refuses an entry, in one place.
 *
 * The journal is the only durable copy of a learner's work, so it rejects an entry that could not
 * be reproduced or could not be compared later — an unstated prediction, a parameter outside the
 * sandbox's own range, a measurement with no unit. Rejecting is the honest failure: an entry that
 * checks nothing is worse than no entry, because it looks like evidence.
 */
export class JournalValidationError extends Error {
  /** Which field was refused, so the UI can point at the right control instead of saying "invalid". */
  readonly field: string;

  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'JournalValidationError';
    this.field = field;
  }
}

/** Free-text ceiling. A notebook entry is a paragraph, not a document; the cap bounds storage growth. */
export const MAX_TEXT_LENGTH = 2000;

/**
 * Tolerance for the parameter range check.
 *
 * Slider values arrive as floating point and a sandbox may round a default on the way in, so an
 * exact comparison would reject a legitimate run at the edge of its own range.
 */
const RANGE_EPSILON = 1e-9;

function requireText(field: string, value: unknown, options: { allowEmpty?: boolean } = {}): string {
  if (typeof value !== 'string') {
    throw new JournalValidationError(field, `expected text, got ${describe(value)}`);
  }
  if (!options.allowEmpty && value.trim().length === 0) {
    throw new JournalValidationError(field, 'must not be empty');
  }
  if (value.length > MAX_TEXT_LENGTH) {
    throw new JournalValidationError(field, `must be at most ${MAX_TEXT_LENGTH} characters, got ${value.length}`);
  }
  return value;
}

function requireFinite(field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new JournalValidationError(field, `expected a finite number, got ${describe(value)}`);
  }
  return value;
}

function describe(value: unknown): string {
  if (typeof value === 'number') return Number.isNaN(value) ? 'NaN' : String(value);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return typeof value;
}

function checkParameter(
  parameterId: string,
  value: unknown,
  range: JournalParameterRange
): void {
  const field = `parameters.${parameterId}`;
  const numeric = requireFinite(field, value);
  const { min, max } = range;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    // A broken schema is a caller bug, not a learner mistake; say so instead of blaming the entry.
    throw new JournalValidationError(
      `schema.parameters.${parameterId}`,
      `invalid range [${min}, ${max}]; min must be ≤ max and both finite`
    );
  }
  const span = Math.abs(max - min);
  const slack = RANGE_EPSILON * (span > 0 ? span : Math.max(1, Math.abs(max)));
  if (numeric < min - slack || numeric > max + slack) {
    throw new JournalValidationError(field, `${numeric} is outside the sandbox range [${min}, ${max}]`);
  }
}

/**
 * Refuse an entry the journal cannot stand behind, or return normally.
 *
 * Checked in the order a learner fills the form, so the first error is the first thing they would
 * see: sandbox → prediction → parameters → measurement → fit → explanation.
 */
export function validateEntryInput(input: InquiryEntryInput, schema: JournalSandboxSchema): void {
  if (!input || typeof input !== 'object') {
    throw new JournalValidationError('entry', `expected an object, got ${describe(input)}`);
  }

  // Sandbox identity: an entry is only interpretable against the sandbox it came from.
  const sandboxId = requireText('sandboxId', input.sandboxId);
  if (sandboxId !== schema.sandboxId) {
    throw new JournalValidationError(
      'sandboxId',
      `entry is from "${sandboxId}" but the schema describes "${schema.sandboxId}"`
    );
  }

  // Prediction: wording is mandatory; a number is optional but carries a unit when present.
  if (!input.prediction || typeof input.prediction !== 'object') {
    throw new JournalValidationError('prediction', 'a prediction must be stated before measuring');
  }
  requireText('prediction.text', input.prediction.text);
  if (input.prediction.value !== undefined) {
    requireFinite('prediction.value', input.prediction.value);
    requireText('prediction.unit', input.prediction.unit);
  } else if (input.prediction.unit !== undefined) {
    requireText('prediction.unit', input.prediction.unit);
  }

  // Parameters: the conditions of the run, all of them known to the sandbox.
  if (!input.parameters || typeof input.parameters !== 'object') {
    throw new JournalValidationError('parameters', 'a run must record the parameters it was made under');
  }
  const parameterIds = Object.keys(input.parameters);
  if (parameterIds.length === 0) {
    throw new JournalValidationError('parameters', 'at least one parameter must be recorded');
  }
  for (const parameterId of parameterIds) {
    const range = schema.parameters[parameterId];
    if (!range) {
      throw new JournalValidationError(
        `parameters.${parameterId}`,
        `"${schema.sandboxId}" has no parameter "${parameterId}"`
      );
    }
    checkParameter(parameterId, input.parameters[parameterId], range);
  }

  // Measurement: a channel and a finite value. The unit is optional — a learner may save a reading
  // before naming its unit — but when the manifest declares one, a measurement in a different unit
  // is refused rather than silently mixed into the same column later.
  if (!input.measurement || typeof input.measurement !== 'object') {
    throw new JournalValidationError('measurement', 'an entry must record what was measured');
  }
  const channel = requireText('measurement.channel', input.measurement.channel);
  requireFinite('measurement.value', input.measurement.value);
  if (input.measurement.unit !== undefined) {
    requireText('measurement.unit', input.measurement.unit, { allowEmpty: true });
  }
  if (schema.channels) {
    const declaredUnit = schema.channels[channel];
    if (declaredUnit === undefined) {
      throw new JournalValidationError(
        'measurement.channel',
        `"${schema.sandboxId}" does not emit channel "${channel}" (known: ${Object.keys(schema.channels).join(', ') || 'none'})`
      );
    }
    const givenUnit = input.measurement.unit?.trim() ?? '';
    if (givenUnit !== '' && givenUnit !== declaredUnit) {
      throw new JournalValidationError(
        'measurement.unit',
        `"${channel}" is measured in ${declaredUnit}, not ${givenUnit}`
      );
    }
  }

  // Fit is optional; when present it must be a real coefficient of determination.
  if (input.fit !== undefined) {
    const { model, rSquared, sampleCount } = input.fit;
    if (model !== 'linear' && model !== 'exponential') {
      throw new JournalValidationError('fit.model', `expected "linear" or "exponential", got ${describe(model)}`);
    }
    const r2 = requireFinite('fit.rSquared', rSquared);
    if (r2 < 0 || r2 > 1) {
      throw new JournalValidationError('fit.rSquared', `must be within 0..1, got ${r2}`);
    }
    if (typeof sampleCount !== 'number' || !Number.isInteger(sampleCount) || sampleCount < 2) {
      throw new JournalValidationError(
        'fit.sampleCount',
        `must be an integer ≥ 2 (a single point is not a fit), got ${describe(sampleCount)}`
      );
    }
  }

  // Explanation: the learner may save before writing their conclusion, so empty is allowed.
  requireText('explanation', input.explanation, { allowEmpty: true });
}

/**
 * Has the learner finished this entry? Predict + measure + explain is the loop in ARCHITECTURE
 * §4.2; an entry missing the explanation is saved but not a finished investigation. A measurement
 * unit is not required (the owner's decision, 2026-10-31): a reading without a unit is still an
 * observation, just a weaker one. Pure, so the streak/heatmap series can count finished work rather
 * than keystrokes if a caller wants that.
 */
export function isComplete(entry: InquiryEntry): boolean {
  return (
    entry.prediction.text.trim().length > 0 &&
    Number.isFinite(entry.measurement.value) &&
    entry.explanation.trim().length > 0
  );
}
