import type { InquiryEntry } from './types';
import { JOURNAL_RECORD_VERSION } from './storage';

/**
 * JSON and CSV export for the Inquiry Log (Kaizen batch 2).
 *
 * The CSV is RFC-4180, which the existing telemetry exporter is not, and the difference matters
 * here: telemetry columns are numbers, while a journal row contains free text — a prediction and an
 * explanation — that will contain commas, quotes and newlines the first time a learner writes a real
 * sentence. A number that arrives in the wrong column is a nuisance; a sentence that does is a
 * corrupt dataset. So every field is quoted when it has to be, quotes are doubled, and rows end CRLF.
 *
 * Metadata comments keep the same `# ` convention the telemetry export already uses, so a learner
 * sees one format across both files.
 */

export interface JournalExportOptions {
  /** Fixed ISO timestamp for reproducible output; defaults to now. */
  exportedAt?: string;
  /**
   * Sandbox id → parameter id → unit, for the metadata header only.
   *
   * Passed in rather than stored per entry: parameter units have exactly one source, the sandbox
   * manifest (Art. 5.1), and copying them into every entry would create the duplicate Art. 5.2 calls
   * a defect. Omit it and the export simply states no units for parameters.
   */
  parameterUnits?: Record<string, Record<string, string>>;
}

function resolveExportedAt(options: JournalExportOptions): string {
  return options.exportedAt ?? new Date().toISOString();
}

/** Six significant digits for floating point, integers as-is — same rule as the telemetry export. */
function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toPrecision(6);
}

/**
 * RFC-4180 field escaping.
 *
 * A field is quoted when it contains a comma, a double quote, CR or LF. Embedded quotes are doubled.
 * Nothing else is escaped: backslashes and unicode are data, not syntax.
 */
export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** `k=v` pairs in key order, so the same entry always produces the same cell. */
function formatParameters(parameters: Record<string, number>): string {
  return Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${formatNumber(parameters[key])}`)
    .join('; ');
}

const CSV_COLUMNS = [
  'id',
  'sandbox_id',
  'created_at',
  'prediction',
  'prediction_value',
  'prediction_unit',
  'parameters',
  'measured_channel',
  'measured_value',
  'measured_unit',
  'fit_model',
  'fit_r_squared',
  'fit_sample_count',
  'explanation',
] as const;

/** One entry as a CSV row, in `CSV_COLUMNS` order. */
export function entryToCsvRow(entry: InquiryEntry): string[] {
  return [
    entry.id,
    entry.sandboxId,
    entry.createdAt,
    entry.prediction.text,
    entry.prediction.value === undefined ? '' : formatNumber(entry.prediction.value),
    entry.prediction.unit ?? '',
    formatParameters(entry.parameters),
    entry.measurement.channel,
    formatNumber(entry.measurement.value),
    entry.measurement.unit ?? '',
    entry.fit?.model ?? '',
    entry.fit === undefined ? '' : formatNumber(entry.fit.rSquared),
    entry.fit === undefined ? '' : String(entry.fit.sampleCount),
    entry.explanation,
  ];
}

/** The whole log as RFC-4180 CSV with scientific metadata headers. */
export function formatJournalToCSV(
  entries: readonly InquiryEntry[],
  options: JournalExportOptions = {}
): string {
  const lines: string[] = [];
  lines.push('# Agentuto Inquiry Log Export');
  lines.push(`# Exported: ${resolveExportedAt(options)}`);
  lines.push(`# Entries: ${entries.length}`);
  lines.push(
    '# prediction = stated before measuring, recorded as written and never scored; prediction_value is empty when the prediction was qualitative'
  );
  lines.push(
    '# fit_r_squared = the learner\'s own fit over their own measured series, not a value computed from the law under study'
  );

  const sandboxIds = [...new Set(entries.map((entry) => entry.sandboxId))].sort();
  if (options.parameterUnits) {
    for (const sandboxId of sandboxIds) {
      const units = options.parameterUnits[sandboxId];
      if (!units) continue;
      const described = Object.keys(units)
        .sort()
        .map((parameterId) => `${parameterId}(${units[parameterId]})`)
        .join(', ');
      if (described) lines.push(`# Parameter units (${sandboxId}): ${described}`);
    }
  }
  lines.push(`# Sandboxes: ${sandboxIds.join(', ') || 'none'}`);

  lines.push(CSV_COLUMNS.join(','));
  for (const entry of entries) {
    lines.push(entryToCsvRow(entry).map(csvEscape).join(','));
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * The whole log as JSON.
 *
 * `version` matches the stored record, so an export can be diffed against what the browser holds —
 * useful when a learner reports a problem and pastes the file.
 */
export function formatJournalToJSON(
  entries: readonly InquiryEntry[],
  options: JournalExportOptions = {}
): string {
  return `${JSON.stringify(
    {
      version: JOURNAL_RECORD_VERSION,
      exportedAt: resolveExportedAt(options),
      count: entries.length,
      entries,
    },
    null,
    2
  )}\n`;
}
