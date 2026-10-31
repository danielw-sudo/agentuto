import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, ClipboardList, Download, Trash2, X } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import type { InquiryEntry, InquiryJournal, JournalSandboxSchema } from '../../core/journal';
import {
  channelsOf,
  displayUnit,
  draftToEntryInput,
  emptyDraft,
  journalExportFilename,
  parameterUnitsFor,
  refusalMessage,
  unitForChannel,
} from '../journal/inquiryLogModel';
import type { DraftAnchor, InquiryDraft, Refusal } from '../journal/inquiryLogModel';

/**
 * Inquiry Log drawer (Kaizen batch 3a).
 *
 * The panel records one investigation — prediction, the conditions it ran under, the measurement and
 * the learner's own conclusion — and keeps the log exportable. Three rules it holds by construction:
 *
 * 1. **Every unit comes from the manifest.** The measurement picker lists `schema.channels` and shows
 *    the unit declared beside each channel; nothing here spells a unit into its own code.
 * 2. **Refusals are shown where they happened.** The journal names the field it refused and
 *    `anchorForField` turns that name into the control that displays it, so no save fails silently.
 * 3. **Nothing is scored.** A prediction is recorded as written (Art. 2.2): it is compared with the
 *    learner's own measurement by the learner, not graded by the application.
 *
 * The panel is a drawer rather than a modal so the simulation stays visible while an entry is written:
 * an observation is recorded while looking at the apparatus, not from memory afterwards.
 */

export interface InquiryLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  journal: InquiryJournal;
  /** False when the browser refused storage; the panel then says so instead of implying a save. */
  persistent: boolean;
  sandboxId: string;
  sandboxTitle: string;
  /** The active sandbox's schema, derived by the caller via `schemaFromCatalog(activeId)`. */
  schema?: JournalSandboxSchema;
  /** The live parameters at the moment of writing — recorded with the entry, not referenced later. */
  parameters: Record<string, number>;
  sandboxTitles: Record<string, string>;
}

function downloadText(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Six significant digits for a measured value, integers as they are — the telemetry export's rule. */
function formatValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return Number.isInteger(value) ? value.toString() : value.toPrecision(6);
}

/** `2026-10-31 09:12 UTC` — one timezone, stated once, the same one streaks and the heatmap use. */
function formatTimestamp(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return timestamp;
  return `${new Date(parsed).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

const INPUT_CLASS =
  'w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500';
const LABEL_CLASS = 'text-xs font-medium text-neutral-300';

export const InquiryLogDrawer: React.FC<InquiryLogDrawerProps> = ({
  isOpen,
  onClose,
  journal,
  persistent,
  sandboxId,
  sandboxTitle,
  schema,
  parameters,
  sandboxTitles,
}) => {
  const [draft, setDraft] = useState<InquiryDraft>(() => emptyDraft(schema));
  // The journal is a mutable store, not React state, so a save or a delete needs its own re-render
  // signal. The value is never read; bumping it is what makes the list below current.
  const [, setRevision] = useState(0);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [fitOpen, setFitOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const channels = useMemo(() => channelsOf(schema), [schema]);
  const declaredUnit = unitForChannel(schema, draft.channel);
  const parameterIds = Object.keys(parameters);

  const entries = journal.entriesNewestFirst();

  if (!isOpen) return null;

  const update = (patch: Partial<InquiryDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const errorFor = (anchor: DraftAnchor): string | null => {
    if (!refusal) return null;
    return refusal.anchor === anchor ? refusal.message : null;
  };

  const handleChannelChange = (channel: string) => {
    // The unit follows the channel's declaration: a learner switching channel must not carry the
    // previous channel's unit, which the journal would then refuse.
    update({ channel, measurementUnit: unitForChannel(schema, channel) ?? '' });
  };

  const handleSave = () => {
    setRefusal(null);
    if (!schema) {
      setRefusal({ field: 'sandboxId', anchor: 'form', message: 'This sandbox is not described by the manifest, so nothing can be recorded against it.' });
      return;
    }
    try {
      journal.add(draftToEntryInput(draft, { sandboxId, parameters, schema }), schema);
      setDraft({ ...emptyDraft(schema), channel: draft.channel, measurementUnit: draft.measurementUnit });
      setSavedAt(new Date().toISOString());
      setRevision((value) => value + 1);
    } catch (error) {
      setRefusal(refusalMessage(error));
    }
  };

  const handleExport = (kind: 'csv' | 'json') => {
    setRefusal(null);
    const all = journal.all();
    if (all.length === 0) return;
    try {
      if (kind === 'csv') {
        downloadText(
          journalExportFilename('csv'),
          journal.exportCSV({ parameterUnits: parameterUnitsFor(all) }),
          'text/csv;charset=utf-8;'
        );
      } else {
        downloadText(journalExportFilename('json'), journal.exportJSON(), 'application/json;charset=utf-8;');
      }
    } catch (error) {
      setRefusal(refusalMessage(error));
    }
  };

  const handleRemove = (id: string) => {
    setRefusal(null);
    try {
      journal.remove(id);
      setRevision((value) => value + 1);
    } catch (error) {
      setRefusal(refusalMessage(error));
    }
  };

  const handleClear = () => {
    setRefusal(null);
    try {
      journal.clear();
      setRevision((value) => value + 1);
      setConfirmClear(false);
      setSavedAt(null);
    } catch (error) {
      setRefusal(refusalMessage(error));
    }
  };

  const topLevelRefusal = refusal && refusal.anchor === 'form' ? refusal : null;

  const fieldError = (anchor: DraftAnchor) => {
    const message = errorFor(anchor);
    if (!message) return null;
    return (
      <p role="alert" className="text-xs text-rose-300 mt-1 leading-snug">
        {message}
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Inquiry Log">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <GlassPanel className="relative h-full w-full sm:max-w-md flex flex-col rounded-none sm:rounded-l-2xl border-l border-neutral-700/60 shadow-2xl select-text">
        <header className="flex items-start justify-between gap-3 p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <ClipboardList className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                Inquiry Log
                <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Recorded against <strong className="text-neutral-300">{sandboxTitle}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the inquiry log"
            className="p-2.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {!persistent && (
            <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-500/30 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-amber-200">
                This browser is not keeping local storage, so these entries last only until the tab
                closes. Export them before you leave.
              </p>
            </div>
          )}

          {topLevelRefusal && (
            <p role="alert" className="text-sm text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 leading-relaxed">
              {topLevelRefusal.message}
            </p>
          )}

          {/* Prediction — stated before the measurement, recorded as written, never scored. */}
          <section className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor="inquiry-prediction">
              Prediction <span className="text-neutral-500">— what do you expect, before measuring?</span>
            </label>
            <textarea
              id="inquiry-prediction"
              value={draft.predictionText}
              onChange={(event) => update({ predictionText: event.target.value })}
              rows={2}
              placeholder="A stiffer spring should shorten the period…"
              className={`${INPUT_CLASS} resize-y leading-relaxed`}
            />
            {fieldError('prediction')}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-neutral-400" htmlFor="inquiry-prediction-value">
                  Expected value (optional)
                </label>
                <input
                  id="inquiry-prediction-value"
                  type="text"
                  inputMode="decimal"
                  value={draft.predictionValue}
                  onChange={(event) => update({ predictionValue: event.target.value })}
                  placeholder="1.4"
                  className={`${INPUT_CLASS} mt-1 font-mono tabular-nums`}
                />
                {fieldError('predictionValue')}
              </div>
              <div className="w-24">
                <label className="text-xs text-neutral-400" htmlFor="inquiry-prediction-unit">
                  Unit
                </label>
                <input
                  id="inquiry-prediction-unit"
                  type="text"
                  value={draft.predictionUnit}
                  onChange={(event) => update({ predictionUnit: event.target.value })}
                  placeholder="s"
                  className={`${INPUT_CLASS} mt-1 font-mono`}
                />
                {fieldError('predictionUnit')}
              </div>
            </div>
          </section>

          {/* Conditions — the live run, snapshotted so the entry can be repeated. */}
          <section className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>Conditions recorded with this entry</span>
            {parameterIds.length === 0 ? (
              <p className="text-xs text-neutral-400">No parameters are set yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {parameterIds.map((parameterId) => {
                  const range = schema?.parameters[parameterId];
                  const unit = range?.unit?.trim() ?? '';
                  return (
                    <span
                      key={parameterId}
                      className="text-xs font-mono text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md px-2 py-1"
                    >
                      {parameterId} = {formatValue(parameters[parameterId])}
                      {unit === '' || unit === 'dimensionless' ? '' : ` ${unit}`}
                    </span>
                  );
                })}
              </div>
            )}
            {fieldError('parameters')}
          </section>

          {/* Measurement — channel and unit both come from the manifest. */}
          <section className="flex flex-col gap-2">
            <div>
              <label className={LABEL_CLASS} htmlFor="inquiry-channel">
                Measured channel
              </label>
              <select
                id="inquiry-channel"
                value={draft.channel}
                onChange={(event) => handleChannelChange(event.target.value)}
                className={`${INPUT_CLASS} mt-1 cursor-pointer`}
                disabled={channels.length === 0}
              >
                {channels.length === 0 && <option value="">No channel is declared for this sandbox</option>}
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel} ({unitForChannel(schema, channel)})
                  </option>
                ))}
              </select>
              {fieldError('channel')}
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-neutral-400" htmlFor="inquiry-measurement-value">
                  Measured value
                </label>
                <input
                  id="inquiry-measurement-value"
                  type="text"
                  inputMode="decimal"
                  value={draft.measurementValue}
                  onChange={(event) => update({ measurementValue: event.target.value })}
                  placeholder="1.392"
                  className={`${INPUT_CLASS} mt-1 font-mono tabular-nums`}
                />
                {fieldError('measurementValue')}
              </div>
              <div className="w-28">
                <label className="text-xs text-neutral-400" htmlFor="inquiry-measurement-unit">
                  Unit
                </label>
                <input
                  id="inquiry-measurement-unit"
                  type="text"
                  value={draft.measurementUnit}
                  onChange={(event) => update({ measurementUnit: event.target.value })}
                  placeholder={declaredUnit ?? 'none'}
                  className={`${INPUT_CLASS} mt-1 font-mono`}
                />
                {fieldError('measurementUnit')}
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              The unit is optional; if you name one it must be the manifest&apos;s own
              {declaredUnit ? ` (${declaredUnit})` : ''}.
            </p>
          </section>

          {/* The learner's own fit, when they made one. Optional, and never computed for them. */}
          <section className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setFitOpen((open) => !open)}
              aria-expanded={fitOpen}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-neutral-100 transition-colors cursor-pointer"
            >
              {fitOpen ? (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              )}
              Attach your own curve fit (optional)
            </button>
            {fitOpen && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-neutral-400" htmlFor="inquiry-fit-model">
                    Model
                  </label>
                  <select
                    id="inquiry-fit-model"
                    value={draft.fitModel}
                    onChange={(event) =>
                      update({ fitModel: event.target.value === 'exponential' ? 'exponential' : 'linear' })
                    }
                    className={`${INPUT_CLASS} mt-1 cursor-pointer`}
                  >
                    <option value="linear">Linear</option>
                    <option value="exponential">Exponential</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400" htmlFor="inquiry-fit-r2">
                    R²
                  </label>
                  <input
                    id="inquiry-fit-r2"
                    type="text"
                    inputMode="decimal"
                    value={draft.fitRSquared}
                    onChange={(event) => update({ fitRSquared: event.target.value })}
                    placeholder="0.984"
                    className={`${INPUT_CLASS} mt-1 font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400" htmlFor="inquiry-fit-samples">
                    Points
                  </label>
                  <input
                    id="inquiry-fit-samples"
                    type="text"
                    inputMode="numeric"
                    value={draft.fitSampleCount}
                    onChange={(event) => update({ fitSampleCount: event.target.value })}
                    placeholder="12"
                    className={`${INPUT_CLASS} mt-1 font-mono tabular-nums`}
                  />
                </div>
                {fieldError('fit')}
              </div>
            )}
          </section>

          {/* Conclusion — may be written later, so an empty conclusion still saves. */}
          <section className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor="inquiry-explanation">
              Conclusion <span className="text-neutral-500">— what did the measurement show?</span>
            </label>
            <textarea
              id="inquiry-explanation"
              value={draft.explanation}
              onChange={(event) => update({ explanation: event.target.value })}
              rows={2}
              placeholder="The period fell as stiffness rose, as predicted…"
              className={`${INPUT_CLASS} resize-y leading-relaxed`}
            />
            {fieldError('explanation')}
          </section>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!schema}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Save entry
            </button>
            {savedAt && (
              <span className="text-xs text-emerald-300 font-mono">saved {formatTimestamp(savedAt).slice(11)}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800/70 text-neutral-200 border border-neutral-700/60 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export JSON
            </button>
            {entries.length > 0 && !confirmClear && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="ml-auto text-xs text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Clear log
              </button>
            )}
            {confirmClear && (
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs text-rose-200">Delete all {entries.length}?</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-rose-300 hover:text-rose-200 cursor-pointer"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="text-xs text-neutral-300 hover:text-neutral-100 cursor-pointer"
                >
                  Keep
                </button>
              </span>
            )}
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Recorded entries</h3>
            {entries.length === 0 ? (
              <p className="text-xs text-neutral-400 leading-relaxed">
                Nothing recorded yet. State a prediction, take a reading, then save — the entry keeps the
                conditions you ran under so the experiment can be repeated.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {entries.map((entry: InquiryEntry) => (
                  <li
                    key={entry.id}
                    className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-neutral-400 font-mono">{formatTimestamp(entry.createdAt)}</p>
                        <p className="text-xs text-neutral-300">
                          {sandboxTitles[entry.sandboxId] ?? entry.sandboxId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(entry.id)}
                        aria-label={`Delete the entry recorded ${formatTimestamp(entry.createdAt)}`}
                        className="p-2 rounded-lg text-neutral-500 hover:text-rose-300 hover:bg-neutral-800/70 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-sm text-neutral-200 leading-relaxed">{entry.prediction.text}</p>
                    <p className="text-sm font-mono text-indigo-200 tabular-nums">
                      {entry.measurement.channel} = {formatValue(entry.measurement.value)}
                      {displayUnit(entry) === '' ? '' : ` ${displayUnit(entry)}`}
                    </p>
                    {entry.fit && (
                      <p className="text-xs font-mono text-amber-200/90">
                        {entry.fit.model} fit, R² = {formatValue(entry.fit.rSquared)} over {entry.fit.sampleCount}{' '}
                        points
                      </p>
                    )}
                    {entry.explanation.trim() !== '' && (
                      <p className="text-xs text-neutral-400 leading-relaxed">{entry.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-neutral-500 leading-relaxed">
            Entries stay in this browser only. Nothing about you is recorded, and no value is computed
            from the law under study: your prediction is compared with your own measurement, by you.
          </p>
        </div>
      </GlassPanel>
    </div>
  );
};
