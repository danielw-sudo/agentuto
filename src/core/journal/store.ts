import { JournalPersistence } from './storage';
import { JournalValidationError, validateEntryInput } from './validation';
import { formatJournalToCSV, formatJournalToJSON, JournalExportOptions } from './exporters';
import { dayKey, heatmapSeries, streakSummary, type HeatmapCell, type StreakSummary } from './series';
import type {
  DayKey,
  InquiryEntry,
  InquiryEntryInput,
  JournalSandboxSchema,
  Timestamp,
} from './types';

/**
 * The Inquiry Log itself (Kaizen batch 2: core only, zero UI).
 *
 * Invariants this class holds, each of which is checked in `core/test/journal.test.ts`:
 *
 * - An entry that cannot be reproduced or compared later is refused (see `validation.ts`).
 * - A save that fails leaves the in-memory log exactly as it was. A learner must never see an
 *   experiment in the list that is not on disk: that is the one failure mode where a cheerful UI
 *   silently loses a day's work.
 * - Reading back is shape-tolerant, writing is strict, and the id/createdAt stamps come from
 *   injectable functions so the whole thing is reproducible under test.
 */

let fallbackIdCounter = 0;

/**
 * UUID when the environment offers one, otherwise a timestamp + counter + random suffix.
 *
 * `crypto.randomUUID` needs a secure context, which plain-HTTP local-network classroom deployments
 * do not have, so the fallback is not a formality — it is the normal path on a school LAN.
 */
export function defaultIdFactory(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  fallbackIdCounter += 1;
  const random = Math.floor(Math.random() * 0xffffff).toString(36);
  return `entry-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}-${random}`;
}

export interface InquiryJournalOptions {
  /** Where entries are kept. `MemoryJournalPersistence` for tests or a storage-less build. */
  persistence: JournalPersistence;
  /** Injectable clock, so `createdAt` is reproducible under test. */
  now?: () => Date;
  /** Injectable id source, so ids are reproducible under test. */
  idFactory?: () => string;
}

export class InquiryJournal {
  private readonly persistence: JournalPersistence;
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private entries: InquiryEntry[];

  constructor(options: InquiryJournalOptions) {
    this.persistence = options.persistence;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? defaultIdFactory;
    this.entries = options.persistence.load();
  }

  get size(): number {
    return this.entries.length;
  }

  /** Insertion order, oldest first. A copy: callers cannot mutate the log by accident. */
  all(): InquiryEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  /** Newest first, for a drawer that lists recent work at the top. */
  entriesNewestFirst(): InquiryEntry[] {
    return this.all().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  get(id: string): InquiryEntry | undefined {
    const found = this.entries.find((entry) => entry.id === id);
    return found === undefined ? undefined : { ...found };
  }

  bySandbox(sandboxId: string): InquiryEntry[] {
    return this.entries.filter((entry) => entry.sandboxId === sandboxId).map((entry) => ({ ...entry }));
  }

  /** Entries whose UTC day matches `day`. */
  byDay(day: DayKey): InquiryEntry[] {
    return this.entries.filter((entry) => dayKey(entry.createdAt) === day).map((entry) => ({ ...entry }));
  }

  /**
   * Validate, stamp and persist one entry.
   *
   * The schema is supplied by the caller (see `catalogSchema.ts`) so `src/core` keeps no dependency
   * on `src/simulations`.
   */
  add(input: InquiryEntryInput, schema: JournalSandboxSchema): InquiryEntry {
    validateEntryInput(input, schema);

    const id = this.idFactory();
    if (this.entries.some((entry) => entry.id === id)) {
      throw new JournalValidationError('id', `duplicate entry id "${id}"; the id factory must be unique`);
    }
    const createdAt = this.now().toISOString();

    const entry: InquiryEntry = {
      id,
      sandboxId: input.sandboxId,
      createdAt,
      prediction: { ...input.prediction },
      parameters: { ...input.parameters },
      measurement: { ...input.measurement },
      explanation: input.explanation,
      ...(input.fit === undefined ? {} : { fit: { ...input.fit } }),
    };

    this.commit([...this.entries, entry]);
    return { ...entry };
  }

  /** Remove one entry. Returns false when the id was not in the log. */
  remove(id: string): boolean {
    const next = this.entries.filter((entry) => entry.id !== id);
    if (next.length === this.entries.length) return false;
    this.commit(next);
    return true;
  }

  /** Forget everything. Exports are the only copy after this, which is why the UI must ask first. */
  clear(): void {
    this.commit([]);
  }

  streaks(today: Timestamp | DayKey): StreakSummary {
    return streakSummary(this.entries, today);
  }

  /** Contiguous day cells in `[startDay, endDay]`, zero-filled. */
  heatmap(startDay: DayKey, endDay: DayKey): HeatmapCell[] {
    return heatmapSeries(this.entries, startDay, endDay);
  }

  exportCSV(options: JournalExportOptions = {}): string {
    return formatJournalToCSV(this.entries, options);
  }

  exportJSON(options: JournalExportOptions = {}): string {
    return formatJournalToJSON(this.entries, options);
  }

  /** Persist then adopt. A failed write leaves the log untouched (see the class invariant). */
  private commit(next: InquiryEntry[]): void {
    const previous = this.entries;
    this.entries = next;
    try {
      this.persistence.save(next);
    } catch (error) {
      this.entries = previous;
      throw error;
    }
  }
}
