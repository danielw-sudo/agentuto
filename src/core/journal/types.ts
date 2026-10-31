/**
 * Inquiry Log — the durable record of one learner's investigation.
 *
 * Kaizen batch 2 (`temp/HANDOFF-20261031.md`): core only, zero UI. The design follows the Inquiry
 * Loop in ARCHITECTURE §4.2 — hypothesise, manipulate, run, export, reflect — so one entry is the
 * five things a lab notebook needs:
 *
 *   prediction  what the learner expected, stated before measuring
 *   parameters  the conditions the run was made under (reproducibility, Art. 1.3)
 *   measurement what was actually measured, with its channel and unit
 *   fit         the quality of the learner's own fit over their own measured series
 *   explanation what the learner concluded
 *
 * Two deliberate omissions, both required by the Constitution:
 *
 * - Nothing computed from the law under study is stored. Art. 2.2: a value computed from the law
 *   is not evidence for the law. The learner verifies from measured quantities, so `fit.rSquared`
 *   is always *their* fit over *their* series, never a model the engine produced.
 * - Nothing about a person is stored (Art. 8.1, no accounts or analytics). Entries live in this
 *   browser only.
 */

/** A calendar day in UTC, `YYYY-MM-DD`. One timezone convention, stated here and nowhere else. */
export type DayKey = string;

/** ISO-8601 UTC timestamp, e.g. `2026-10-31T09:12:04.318Z`. */
export type Timestamp = string;

/** The learner's stated expectation, captured before the measurement exists. */
export interface InquiryPrediction {
  /** Required. A prediction with no wording cannot be compared with anything later. */
  text: string;
  /** Optional quantitative half of the prediction, e.g. "period ≈ 1.4". Needs `unit`. */
  value?: number;
  /** Required whenever `value` is present: Art. 1.2 asks for units everywhere a quantity appears. */
  unit?: string;
}

/** Measurement unit, when the entry recorded one. */
export interface InquiryMeasurement {
  /** Telemetry channel key, e.g. `kineticEnergy`; validated against the sandbox when known. */
  channel: string;
  value: number;
  /**
   * Unit of the reading. Optional (owner's decision): a learner may save a reading before naming its
   * unit. When the manifest declares a unit for the channel, this must either be absent or match it.
   */
  unit?: string;
}

/** Quality of the learner's own curve fit over their own measured series. */
export interface InquiryFit {
  model: 'linear' | 'exponential';
  /** Coefficient of determination of that fit, 0..1. */
  rSquared: number;
  /** How many measured points the fit used. Fewer than 2 is not a fit. */
  sampleCount: number;
}

/** One saved experiment. */
export interface InquiryEntry {
  id: string;
  sandboxId: string;
  createdAt: Timestamp;
  prediction: InquiryPrediction;
  /** Snapshot of the active sandbox parameters at measurement time. */
  parameters: Record<string, number>;
  measurement: InquiryMeasurement;
  fit?: InquiryFit;
  explanation: string;
}

/** Everything the caller supplies; `id` and `createdAt` are stamped by the journal itself. */
export type InquiryEntryInput = Omit<InquiryEntry, 'id' | 'createdAt'>;

/** Range and unit of one sandbox parameter, mirrored from its `ParameterDescriptor`. */
export interface JournalParameterRange {
  min: number;
  max: number;
  unit: string;
}

/**
 * What the journal needs to know about a sandbox in order to validate an entry.
 *
 * This is a narrow port rather than an import of `SIMULATION_CATALOG`: `src/core` must not depend
 * on `src/simulations` (Art. 6.1, and it would invert the layering). `catalogSchema.ts` is the one
 * file that bridges the two, and the caller passes the schema in.
 */
export interface JournalSandboxSchema {
  sandboxId: string;
  /** Parameter id → allowed range. An entry may only record parameters listed here. */
  parameters: Record<string, JournalParameterRange>;
  /**
   * Telemetry channels this sandbox emits, mapped to their unit. Both are checked when supplied:
   * membership catches a channel that has been renamed, the unit catches a measurement recorded in
   * something other than the manifest's own unit. The declaration lives in the manifest
   * (`src/simulations/index.ts`), so there is no second copy of it anywhere.
   */
  channels?: Record<string, string>;
}

/** The record written to storage, versioned so a future shape change can migrate rather than guess. */
export interface InquiryLogRecord {
  version: number;
  entries: InquiryEntry[];
}
