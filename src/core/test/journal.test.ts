import { SIMULATION_CATALOG } from '../../simulations';
import { linearRegression } from '../math/regression';
import {
  InquiryJournal,
  JournalStorageError,
  JournalValidationError,
  LocalStorageJournalPersistence,
  MemoryJournalPersistence,
  engineChannelsFromSandbox,
  isComplete,
  schemaFromCatalog,
  validateEntryInput,
} from '../journal';
import type { InquiryEntryInput, JournalSandboxSchema, JournalStorage } from '../journal';

/**
 * Inquiry Log checks (Kaizen batch 2).
 *
 * Kept beside the rest of the engine suite and called from `runCoreVerification`, so one command
 * still gates everything. Every check here fails when the journal is wrong, and the two that could
 * quietly agree with the implementation do not reuse it:
 *
 * - the CSV reader below is a separate RFC-4180 parser, not the writer's own code;
 * - R² is computed from its correlation definition, not by calling the regression helper being
 *   checked (Constitution Art. 1.5).
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

  /** Raw payload, for assertions about the stored shape. */
  raw(key: string): string | null {
    return this.getItem(key);
  }
}

/** Saves always fail: browser storage full, or blocked by policy. */
class FullStorage implements JournalStorage {
  getItem(): string | null {
    return null;
  }

  setItem(): void {
    throw new Error('QuotaExceededError: simulated full storage');
  }

  removeItem(): void {}
}

/** Storage that exists but throws on every access, as in Safari private mode. */
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
    return `entry-${counter}`;
  };
}

const SANDBOX_ID = 'harmonic-oscillator';
const schema: JournalSandboxSchema = schemaFromCatalog(SANDBOX_ID);
const PARAMETER_IDS = Object.keys(schema.parameters);
const PRIMARY_PARAMETER = PARAMETER_IDS[0];
const PRIMARY_RANGE = schema.parameters[PRIMARY_PARAMETER];
const PRIMARY_CHANNEL = Object.keys(schema.channels ?? {})[0];
/** The unit the manifest declares for that channel — a measurement must not disagree with it. */
const PRIMARY_UNIT = (schema.channels ?? {})[PRIMARY_CHANNEL];

function midRange(parameterId: string): number {
  const range = schema.parameters[parameterId];
  return range.min + (range.max - range.min) * 0.5;
}

function makeInput(overrides: Partial<InquiryEntryInput> = {}): InquiryEntryInput {
  return {
    sandboxId: SANDBOX_ID,
    prediction: { text: 'The period should shorten as the spring stiffens', value: 1.4, unit: 's' },
    parameters: { [PRIMARY_PARAMETER]: midRange(PRIMARY_PARAMETER) },
    measurement: { channel: PRIMARY_CHANNEL, value: 1.392, unit: PRIMARY_UNIT },
    explanation: 'Measured period sat inside the predicted range.',
    ...overrides,
  };
}

/**
 * Minimal RFC-4180 reader, written independently of the writer: quotes said twice are one quote,
 * CRLF ends a row, and `# ` metadata lines are dropped. Anything it misreads shows up as a field
 * mismatch in the comparison below.
 */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];

    // A `# ` metadata comment starts a line and runs to the next CRLF. Skipping it here (rather
    // than by splitting the text first) keeps quoted multi-line fields intact.
    if (!inQuotes && row.length === 0 && field.length === 0 && char === '#') {
      const lineEnd = csv.indexOf('\r\n', i);
      if (lineEnd === -1) break;
      i = lineEnd + 1;
      continue;
    }

    if (inQuotes) {
      if (char === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' && csv[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((parsed) => !(parsed.length === 1 && parsed[0].startsWith('# ')));
}

function expectRejection(fn: () => void, expectedField: string, label: string): void {
  try {
    fn();
  } catch (error) {
    if (!(error instanceof JournalValidationError)) {
      throw new Error(`${label}: expected a JournalValidationError, got ${String(error)}`);
    }
    if (error.field !== expectedField) {
      throw new Error(`${label}: refused field "${error.field}", expected "${expectedField}"`);
    }
    return;
  }
  throw new Error(`${label}: the journal accepted an entry it should have refused`);
}

export function runJournalVerification(): void {
  // J1 — The manifest port works for every sandbox: parameter ranges from the descriptors, and the
  // declared channel units must equal what the engine really emits. A declaration nobody checks drifts
  // the first time a channel is renamed, which is exactly the failure this line is here to stop.
  const catalogIds = Object.keys(SIMULATION_CATALOG);
  let parameterCount = 0;
  let dimensionlessParameters = 0;
  let channelCount = 0;
  let dimensionlessChannels = 0;

  for (const sandboxId of catalogIds) {
    const sandboxSchema = schemaFromCatalog(sandboxId);
    const parameterIds = Object.keys(sandboxSchema.parameters);
    if (parameterIds.length === 0) {
      throw new Error(`Sandbox "${sandboxId}" exposes no parameters, so no run could ever be reproduced`);
    }
    for (const parameterId of parameterIds) {
      const range = sandboxSchema.parameters[parameterId];
      if (!Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min >= range.max) {
        throw new Error(
          `Sandbox "${sandboxId}" parameter "${parameterId}" has an unusable range [${range.min}, ${range.max}]`
        );
      }
      parameterCount += 1;
      if (range.unit.trim() === '') dimensionlessParameters += 1;
    }

    const declared = sandboxSchema.channels ?? {};
    const declaredKeys = Object.keys(declared).sort();
    if (declaredKeys.length === 0) {
      throw new Error(`Sandbox "${sandboxId}" declares no telemetry channel, so nothing is measurable`);
    }
    for (const channel of declaredKeys) {
      const unit = declared[channel];
      if (typeof unit !== 'string' || unit.trim() === '') {
        throw new Error(
          `Sandbox "${sandboxId}" channel "${channel}" has no declared unit; write "dimensionless" rather than leaving it empty`
        );
      }
      channelCount += 1;
      if (unit === 'dimensionless') dimensionlessChannels += 1;
    }

    // The declaration and the engine must agree, in both directions.
    const emitted = engineChannelsFromSandbox(sandboxId);
    const missing = emitted.filter((channel) => !declaredKeys.includes(channel));
    const extra = declaredKeys.filter((channel) => !emitted.includes(channel));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `Sandbox "${sandboxId}" channel declaration does not match its engine: ` +
          `emitted but undeclared [${missing.join(', ')}], declared but never emitted [${extra.join(', ')}]`
      );
    }

    // A well-formed entry for this sandbox must validate against its own derived schema, in the
    // manifest's own unit.
    const parameterId = parameterIds[0];
    const range = sandboxSchema.parameters[parameterId];
    const channel = declaredKeys[0];
    validateEntryInput(
      {
        sandboxId,
        prediction: { text: 'Predicting before measuring' },
        parameters: { [parameterId]: range.min + (range.max - range.min) * 0.5 },
        measurement: { channel, value: 1, unit: declared[channel] },
        explanation: '',
      },
      sandboxSchema
    );
    // ...and the same entry with no unit at all, because the unit is optional by the owner's decision.
    validateEntryInput(
      {
        sandboxId,
        prediction: { text: 'Predicting before measuring' },
        parameters: { [parameterId]: range.min + (range.max - range.min) * 0.5 },
        measurement: { channel, value: 1 },
        explanation: '',
      },
      sandboxSchema
    );
  }
  console.log(
    `✓ Inquiry Log schema derived from the manifest for all ${catalogIds.length} sandboxes: ${parameterCount} parameters with ranges (${dimensionlessParameters} dimensionless), ${channelCount} declared telemetry-channel units (${dimensionlessChannels} dimensionless) matching each sandbox's running engine exactly, and a well-formed entry validates against each with or without a unit`
  );

  // J2 — Refusals. An entry the journal cannot stand behind is rejected, and it names the field.
  expectRejection(
    () => validateEntryInput(makeInput({ parameters: { notAParameter: 1 } }), schema),
    'parameters.notAParameter',
    'unknown parameter'
  );
  expectRejection(
    () =>
      validateEntryInput(
        makeInput({
          parameters: {
            [PRIMARY_PARAMETER]:
              PRIMARY_RANGE.max + Math.abs(PRIMARY_RANGE.max - PRIMARY_RANGE.min) + 1,
          },
        }),
        schema
      ),
    `parameters.${PRIMARY_PARAMETER}`,
    'parameter outside its own range'
  );
  expectRejection(
    () => validateEntryInput(makeInput({ parameters: {} }), schema),
    'parameters',
    'run with no recorded parameters'
  );
  expectRejection(
    () => validateEntryInput(makeInput({ prediction: { text: '   ' } }), schema),
    'prediction.text',
    'blank prediction'
  );
  expectRejection(
    () => validateEntryInput(makeInput({ prediction: { text: 'about 1.4 seconds', value: 1.4 } }), schema),
    'prediction.unit',
    'quantitative prediction with no unit'
  );
  expectRejection(
    () => validateEntryInput(makeInput({ measurement: { channel: PRIMARY_CHANNEL, value: Number.NaN, unit: 's' } }), schema),
    'measurement.value',
    'NaN measurement'
  );
  expectRejection(
    () => validateEntryInput(makeInput({ measurement: { channel: 'charm', value: 1, unit: 's' } }), schema),
    'measurement.channel',
    'channel the sandbox does not emit'
  );
  expectRejection(
    () =>
      validateEntryInput(
        makeInput({ measurement: { channel: PRIMARY_CHANNEL, value: 1, unit: 'furlongs' } }),
        schema
      ),
    'measurement.unit',
    'measurement in a unit the manifest does not declare'
  );
  expectRejection(
    () => validateEntryInput(makeInput({ fit: { model: 'linear', rSquared: 1.4, sampleCount: 5 } }), schema),
    'fit.rSquared',
    'R² above 1'
  );
  expectRejection(
    () => validateEntryInput(makeInput({ fit: { model: 'linear', rSquared: 0.9, sampleCount: 1 } }), schema),
    'fit.sampleCount',
    'fit over a single point'
  );
  expectRejection(
    () => validateEntryInput(makeInput({ sandboxId: 'kepler-orbits' }), schema),
    'sandboxId',
    'entry filed under the wrong sandbox'
  );

  const saved = new InquiryJournal({
    persistence: new MemoryJournalPersistence(),
    now: () => new Date('2026-10-31T09:00:00.000Z'),
    idFactory: sequentialIds(),
  }).add(makeInput(), schema);
  if (isComplete({ ...saved, explanation: '' })) {
    throw new Error('An entry with no explanation must not report itself complete to the streak series');
  }
  if (!isComplete(saved)) {
    throw new Error('An entry with prediction, measurement and explanation must report itself complete');
  }
  console.log(
    '✓ Inquiry Log refused 11 malformed entries (unknown/out-of-range/absent parameters, blank or unitless prediction, NaN measurement, unknown channel, a unit the manifest does not declare, impossible R², single-point fit, wrong sandbox) and accepted the well-formed one'
  );

  // J3 — Save, reload, compare. Two entries, one with a fit, through the real localStorage adapter.
  const storage = new MapStorage();
  const firstRun = new InquiryJournal({
    persistence: new LocalStorageJournalPersistence(storage),
    now: () => new Date('2026-10-31T10:00:00.000Z'),
    idFactory: sequentialIds(),
  });
  const withFit = firstRun.add(
    makeInput({ fit: { model: 'linear', rSquared: 0.9987, sampleCount: 8 } }),
    schema
  );
  const withoutFit = firstRun.add(
    makeInput({ prediction: { text: 'Qualitative prediction only' }, explanation: '' }),
    schema
  );
  const rawPayload = storage.raw('agentuto.inquiry-log.v1');
  if (!rawPayload) throw new Error('Nothing was written to the storage key the adapter claims to use');
  const payload = JSON.parse(rawPayload) as { version?: number; entries?: unknown[] };
  if (payload.version !== 1) {
    throw new Error(`Stored record carries version ${String(payload.version)}, expected 1`);
  }
  if (payload.entries?.length !== 2) {
    throw new Error(`Stored record holds ${String(payload.entries?.length)} entries, expected 2`);
  }

  const secondRun = new InquiryJournal({
    persistence: new LocalStorageJournalPersistence(storage),
    now: () => new Date('2026-10-31T11:00:00.000Z'),
    idFactory: sequentialIds(),
  });
  if (secondRun.size !== 2) {
    throw new Error(`Reloaded log holds ${secondRun.size} entries, expected 2`);
  }
  const reloaded = secondRun.all();
  if (JSON.stringify(reloaded) !== JSON.stringify([withFit, withoutFit])) {
    throw new Error('Reloaded entries differ from the ones saved: shape was lost or reordered');
  }
  if (reloaded[0].fit?.rSquared !== 0.9987 || reloaded[1].fit !== undefined) {
    throw new Error('Optional fit did not survive the round trip exactly once');
  }

  // J4 — Tolerance on read, strictness on write.
  const corruptStorage = new MapStorage();
  corruptStorage.setItem('agentuto.inquiry-log.v1', '{not json at all');
  if (new LocalStorageJournalPersistence(corruptStorage).load().length !== 0) {
    throw new Error('Corrupt JSON must load as an empty log, not throw and not invent entries');
  }
  const mixedStorage = new MapStorage();
  mixedStorage.setItem(
    'agentuto.inquiry-log.v1',
    JSON.stringify({ version: 1, entries: [withFit, { id: 'broken', sandboxId: SANDBOX_ID }] })
  );
  const mixed = new LocalStorageJournalPersistence(mixedStorage).load();
  if (mixed.length !== 1 || mixed[0].id !== withFit.id) {
    throw new Error(`A corrupted entry destroyed the healthy ones: loaded ${mixed.length}, expected the 1 valid entry`);
  }
  if (new LocalStorageJournalPersistence(new BlockedStorage()).load().length !== 0) {
    throw new Error('Storage that throws on read must load as an empty log instead of breaking the page');
  }

  // J5 — A failed save leaves no phantom entry in memory.
  const fullJournal = new InquiryJournal({
    persistence: new LocalStorageJournalPersistence(new FullStorage()),
    now: () => new Date('2026-10-31T12:00:00.000Z'),
    idFactory: sequentialIds(),
  });
  let failure: unknown;
  try {
    fullJournal.add(makeInput(), schema);
  } catch (error) {
    failure = error;
  }
  if (!(failure instanceof JournalStorageError)) {
    throw new Error(`A full storage must fail as a JournalStorageError, got ${String(failure)}`);
  }
  if (fullJournal.size !== 0) {
    throw new Error(`A failed save left ${fullJournal.size} entries in memory; the log now disagrees with the disk`);
  }
  console.log(
    '✓ Inquiry Log persistence verified: 2 entries saved and reloaded identically (fit kept once), record versioned at 1, corrupt/partial/blocked payloads degrade to the valid entries instead of throwing, and a failed save rolls back to 0 entries'
  );

  // J6 — CSV export is RFC-4180, proven by an independent reader.
  const csvJournal = new InquiryJournal({
    persistence: new MemoryJournalPersistence(),
    now: () => new Date('2026-10-31T13:00:00.000Z'),
    idFactory: sequentialIds(),
  });
  const nasty = csvJournal.add(
    makeInput({
      prediction: { text: 'Period ∝ √m, so about "1.4" s — maybe, 2 s worst case' },
      explanation: 'Line one, with a comma\r\nand a "quoted" word\nand a bare newline',
      fit: { model: 'exponential', rSquared: 0.5, sampleCount: 3 },
    }),
    schema
  );
  const csvText = csvJournal.exportCSV({ exportedAt: '2026-10-31T13:05:00.000Z' });
  if (!csvText.includes('\r\n')) throw new Error('CSV export must use CRLF row endings (RFC 4180)');
  if (!csvText.endsWith('\r\n')) throw new Error('CSV export must end with a CRLF');
  if (!csvText.includes('""quoted""')) {
    throw new Error('CSV export did not double the embedded quotes in the explanation');
  }

  const rows = parseCsv(csvText);
  if (rows.length !== 2) {
    throw new Error(`CSV parsed to ${rows.length} rows, expected a header plus one entry`);
  }
  const header = rows[0];
  const row = rows[1];
  if (header.length !== 14 || row.length !== header.length) {
    throw new Error(`CSV row has ${row.length} fields against a ${header.length}-column header`);
  }
  const record = Object.fromEntries(header.map((column, index) => [column, row[index]]));

  // Text cells are compared exactly — that is where quoting and escaping could lose data.
  const exactCells: Record<string, string> = {
    id: nasty.id,
    sandbox_id: SANDBOX_ID,
    created_at: '2026-10-31T13:00:00.000Z',
    prediction: nasty.prediction.text,
    prediction_value: '',
    prediction_unit: '',
    measured_channel: PRIMARY_CHANNEL,
    measured_unit: PRIMARY_UNIT ?? '',
    fit_model: 'exponential',
    fit_sample_count: '3',
    explanation: nasty.explanation,
  };
  for (const [column, value] of Object.entries(exactCells)) {
    if (record[column] !== value) {
      throw new Error(
        `CSV column "${column}" read back as ${JSON.stringify(record[column])}, expected ${JSON.stringify(value)}`
      );
    }
  }
  // Numeric cells are compared as numbers, so the reader is not just echoing the writer's format.
  const numericCells: Record<string, number> = {
    measured_value: nasty.measurement.value,
    fit_r_squared: 0.5,
  };
  for (const [column, value] of Object.entries(numericCells)) {
    if (Math.abs(Number(record[column]) - value) > 1e-12) {
      throw new Error(`CSV column "${column}" read back as ${record[column]}, expected ${value}`);
    }
  }
  if (!record.parameters.includes(`${PRIMARY_PARAMETER}=`)) {
    throw new Error(`CSV parameters cell "${record.parameters}" lost the parameter id it recorded`);
  }
  if (!record.parameters.includes(String(Number(nasty.parameters[PRIMARY_PARAMETER].toPrecision(6))))) {
    throw new Error(`CSV parameters cell "${record.parameters}" lost the parameter value it recorded`);
  }

  // J7 — JSON export round trip.
  const json = JSON.parse(csvJournal.exportJSON({ exportedAt: '2026-10-31T13:05:00.000Z' })) as {
    version: number;
    exportedAt: string;
    count: number;
    entries: unknown[];
  };
  if (json.version !== 1 || json.count !== 1 || json.entries.length !== 1) {
    throw new Error(
      `JSON export header is wrong: version=${json.version} count=${json.count} entries=${json.entries.length}`
    );
  }
  if (json.exportedAt !== '2026-10-31T13:05:00.000Z') {
    throw new Error('JSON export ignored the supplied timestamp, so its output cannot be reproduced');
  }
  if (JSON.stringify(json.entries[0]) !== JSON.stringify(csvJournal.all()[0])) {
    throw new Error('JSON export does not round-trip the entry it was given');
  }
  console.log(
    '✓ Inquiry Log CSV/JSON export verified: comma-, quote- and newline-bearing text survives an independent RFC-4180 reader field-for-field across all 14 columns, rows end CRLF, and the JSON export round-trips with a fixed timestamp'
  );

  // J8 — Streaks and heatmap against hand-counted days.
  let clock = new Date('2026-10-25T10:00:00.000Z');
  const streakJournal = new InquiryJournal({
    persistence: new MemoryJournalPersistence(),
    now: () => clock,
    idFactory: sequentialIds(),
  });
  const logOn = (iso: string, times = 1): void => {
    clock = new Date(iso);
    for (let i = 0; i < times; i += 1) streakJournal.add(makeInput(), schema);
  };
  logOn('2026-10-25T10:00:00.000Z');
  logOn('2026-10-26T08:00:00.000Z', 2);
  logOn('2026-10-27T23:59:59.000Z');
  logOn('2026-10-29T06:00:00.000Z');
  logOn('2026-10-30T21:00:00.000Z');

  const graceStreak = streakJournal.streaks('2026-10-31T09:00:00.000Z');
  if (graceStreak.longest !== 3) {
    throw new Error(`Longest streak counted ${graceStreak.longest} days, expected 3 (2026-10-25..27)`);
  }
  if (graceStreak.current !== 2) {
    throw new Error(
      `Current streak with nothing logged today but work logged yesterday counted ${graceStreak.current}, expected 2`
    );
  }
  if (graceStreak.currentDays.join(',') !== '2026-10-29,2026-10-30') {
    throw new Error(`Streak days read back as ${graceStreak.currentDays.join(',')}`);
  }

  logOn('2026-10-31T07:00:00.000Z');
  const todayStreak = streakJournal.streaks('2026-10-31T09:00:00.000Z');
  if (todayStreak.current !== 3 || todayStreak.longest !== 3) {
    throw new Error(
      `After logging today the streak should be 3/3, got current=${todayStreak.current} longest=${todayStreak.longest}`
    );
  }
  const emptyStreak = new InquiryJournal({ persistence: new MemoryJournalPersistence() }).streaks(
    '2026-10-31T09:00:00.000Z'
  );
  if (emptyStreak.current !== 0 || emptyStreak.longest !== 0) {
    throw new Error('An empty log reported a non-zero streak');
  }

  const heatmap = streakJournal.heatmap('2026-10-24', '2026-10-31');
  const expectedHeatmap = '0,1,2,1,0,1,1,1';
  const actualHeatmap = heatmap.map((cell) => cell.count).join(',');
  if (actualHeatmap !== expectedHeatmap) {
    throw new Error(`Heatmap counts read ${actualHeatmap}, expected ${expectedHeatmap}`);
  }
  if (heatmap.length !== 8 || heatmap[0].day !== '2026-10-24' || heatmap[7].day !== '2026-10-31') {
    throw new Error('Heatmap cells are not one contiguous day each across the requested window');
  }
  let backwardsRejected = false;
  try {
    streakJournal.heatmap('2026-10-31', '2026-10-24');
  } catch {
    backwardsRejected = true;
  }
  if (!backwardsRejected) throw new Error('A heatmap window that ends before it starts must be refused');
  console.log(
    `✓ Inquiry Log series verified: longest streak 3 days (2026-10-25..27), current streak 2 with yesterday as grace and 3 after logging today, empty log 0, and the 2026-10-24..31 heatmap reads ${actualHeatmap} across 8 contiguous UTC days`
  );

  // J9 — R² is carried, not invented: independent correlation algebra vs. the shipped fit.
  const xs = [1, 2, 3, 4, 5];
  const ys = [2, 4, 5, 4, 5];
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
    sxx += (xs[i] - meanX) ** 2;
    syy += (ys[i] - meanY) ** 2;
  }
  const independentR2 = (sxy * sxy) / (sxx * syy); // r² = Sxy² / (Sxx·Syy)
  if (Math.abs(independentR2 - 0.6) > 1e-12) {
    throw new Error(`The independent R² algebra itself is wrong: computed ${independentR2}, expected 0.6`);
  }
  const fitted = linearRegression(xs, ys);
  if (Math.abs(fitted.rSquared - independentR2) > 1e-12) {
    throw new Error(
      `linearRegression reports R²=${fitted.rSquared} where the correlation definition gives ${independentR2}`
    );
  }

  const fitJournal = new InquiryJournal({
    persistence: new MemoryJournalPersistence(),
    now: () => new Date('2026-10-31T14:00:00.000Z'),
    idFactory: sequentialIds(),
  });
  fitJournal.add(
    makeInput({
      fit: { model: 'linear', rSquared: independentR2, sampleCount: xs.length },
      explanation: 'Five points, one fit.',
    }),
    schema
  );
  const fitCsvRows = parseCsv(fitJournal.exportCSV({ exportedAt: '2026-10-31T14:05:00.000Z' }));
  const fitColumns = fitCsvRows[0];
  const fitRow = fitCsvRows[1];
  const r2Cell = fitRow[fitColumns.indexOf('fit_r_squared')];
  if (Math.abs(Number(r2Cell) - independentR2) > 1e-12) {
    throw new Error(`Exported R² cell read ${r2Cell}, expected the independent value ${independentR2}`);
  }
  console.log(
    `✓ Inquiry Log fit provenance verified: independent correlation algebra gives R² = ${independentR2.toFixed(6)} for the 5-point series, linearRegression agrees to 1e-12, and that exact value survives the journal and the CSV export`
  );
}
