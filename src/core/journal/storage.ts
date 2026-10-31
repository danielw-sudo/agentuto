import type { InquiryEntry, InquiryLogRecord } from './types';

/**
 * Persistence ports for the Inquiry Log.
 *
 * Two decisions worth stating:
 *
 * 1. The adapter takes a `JournalStorage` (the three `localStorage` methods), not the global. That
 *    makes the durability rules testable in Node with a plain map — the alternative is "trust me,
 *    it saves", which Art. 1.5 calls a claim rather than a check.
 * 2. Loading is tolerant, saving is strict. A learner's whole log shares one storage key, so a
 *    single corrupted entry must not destroy the rest, and a save that cannot complete must throw
 *    instead of silently dropping an afternoon's experiments.
 */

export const JOURNAL_STORAGE_KEY = 'agentuto.inquiry-log.v1';

/** Bumped when the stored shape changes in a way a reader must know about. */
export const JOURNAL_RECORD_VERSION = 1;

/** The slice of the Web Storage API this module needs. */
export interface JournalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Where entries live between sessions. */
export interface JournalPersistence {
  load(): InquiryEntry[];
  save(entries: readonly InquiryEntry[]): void;
}

/** A save that could not complete. `cause` carries the browser's original error. */
export class JournalStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'JournalStorageError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Structural guard for one stored entry.
 *
 * Deliberately checks shape only, not range: a stored entry was validated against its sandbox when
 * it was written, and re-validating it against today's manifest would silently delete a learner's
 * older experiments the moment a slider range changed. Shape errors are corruption; range changes
 * are not.
 */
export function isInquiryEntry(value: unknown): value is InquiryEntry {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.sandboxId) || !isNonEmptyString(value.createdAt)) {
    return false;
  }
  if (!isRecord(value.prediction) || !isNonEmptyString(value.prediction.text)) return false;
  if (value.prediction.value !== undefined && !isFiniteNumber(value.prediction.value)) return false;
  if (value.prediction.unit !== undefined && typeof value.prediction.unit !== 'string') return false;

  if (!isRecord(value.parameters)) return false;
  if (!Object.values(value.parameters).every(isFiniteNumber)) return false;

  const measurement = value.measurement;
  if (!isRecord(measurement)) return false;
  if (!isNonEmptyString(measurement.channel) || !isFiniteNumber(measurement.value) || !isNonEmptyString(measurement.unit)) {
    return false;
  }

  if (typeof value.explanation !== 'string') return false;

  if (value.fit !== undefined) {
    const fit = value.fit;
    if (!isRecord(fit)) return false;
    if (fit.model !== 'linear' && fit.model !== 'exponential') return false;
    if (!isFiniteNumber(fit.rSquared) || fit.rSquared < 0 || fit.rSquared > 1) return false;
    if (typeof fit.sampleCount !== 'number' || !Number.isInteger(fit.sampleCount) || fit.sampleCount < 2) return false;
  }

  return true;
}

/** Entries from a parsed payload, tolerating a bare array for forward/backward compatibility. */
function entriesFromPayload(parsed: unknown): InquiryEntry[] {
  if (Array.isArray(parsed)) return parsed.filter(isInquiryEntry);
  if (isRecord(parsed) && Array.isArray(parsed.entries)) return parsed.entries.filter(isInquiryEntry);
  return [];
}

/** Backed by `localStorage`, or whatever object satisfies `JournalStorage`. */
export class LocalStorageJournalPersistence implements JournalPersistence {
  constructor(
    private readonly storage: JournalStorage,
    private readonly key: string = JOURNAL_STORAGE_KEY
  ) {}

  load(): InquiryEntry[] {
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      // Storage disabled mid-session (private mode, policy change): start empty, never throw on read.
      return [];
    }
    if (!raw) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt JSON: keep the session usable, and keep the bad payload on disk so the raw text can
      // still be recovered by hand instead of being overwritten by the next successful save.
      return [];
    }
    return entriesFromPayload(parsed);
  }

  save(entries: readonly InquiryEntry[]): void {
    const record: InquiryLogRecord = { version: JOURNAL_RECORD_VERSION, entries: [...entries] };
    let serialized: string;
    try {
      serialized = JSON.stringify(record);
    } catch (error) {
      throw new JournalStorageError('the inquiry log could not be serialised', { cause: error });
    }
    try {
      this.storage.setItem(this.key, serialized);
    } catch (error) {
      throw new JournalStorageError(
        'the inquiry log could not be saved: browser storage is full or blocked. Export the log to keep it.',
        { cause: error }
      );
    }
  }
}

/** In-memory persistence for tests, and for a build with no storage at all. */
export class MemoryJournalPersistence implements JournalPersistence {
  private entries: InquiryEntry[] = [];

  load(): InquiryEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  save(entries: readonly InquiryEntry[]): void {
    this.entries = entries.map((entry) => ({ ...entry }));
  }
}

/**
 * `window.localStorage` when it exists and is usable, otherwise `null`.
 *
 * Merely existing is not enough: Safari private mode and some embedded webviews expose the object
 * and throw on write. The probe writes and removes a throwaway key once, so the failure is found
 * here instead of at the learner's first save.
 */
export function resolveBrowserStorage(candidate?: JournalStorage): JournalStorage | null {
  const storage =
    candidate ??
    (typeof globalThis === 'object' && 'localStorage' in globalThis
      ? (globalThis as { localStorage?: JournalStorage }).localStorage
      : undefined);
  if (!storage) return null;

  const probeKey = `${JOURNAL_STORAGE_KEY}.probe`;
  try {
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}
