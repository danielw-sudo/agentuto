/**
 * Inquiry Log — public surface.
 *
 * Consumers import from here, not from the individual modules, so the internal split
 * (types / validation / storage / series / exporters / store / catalogSchema) stays free to change.
 */

export type {
  DayKey,
  Timestamp,
  InquiryPrediction,
  InquiryMeasurement,
  InquiryFit,
  InquiryEntry,
  InquiryEntryInput,
  InquiryLogRecord,
  JournalParameterRange,
  JournalSandboxSchema,
} from './types';

export { JournalValidationError, validateEntryInput, isComplete, MAX_TEXT_LENGTH } from './validation';

export {
  JOURNAL_STORAGE_KEY,
  JOURNAL_RECORD_VERSION,
  JournalStorageError,
  LocalStorageJournalPersistence,
  MemoryJournalPersistence,
  isInquiryEntry,
  resolveBrowserStorage,
} from './storage';
export type { JournalPersistence, JournalStorage } from './storage';

export { dayKey, dayFromNumber, dayNumber, entriesPerDay, streakSummary, heatmapSeries } from './series';
export type { HeatmapCell, StreakSummary } from './series';

export { csvEscape, entryToCsvRow, formatJournalToCSV, formatJournalToJSON } from './exporters';
export type { JournalExportOptions } from './exporters';

export { InquiryJournal, defaultIdFactory } from './store';
export type { InquiryJournalOptions } from './store';

export { schemaFromCatalog, engineChannelsFromSandbox } from './catalogSchema';
