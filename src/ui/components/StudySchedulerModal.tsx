import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { SIMULATION_CATALOG, SimulationId } from '../../simulations';
import { COURSE_EQUIVALENCE_MAP } from '../../knowledge/courseEquivalence';
import { demoLink } from '../../community';

export interface StudyCheckpoint {
  id: string;
  sandboxId: SimulationId;
  title: string;
  targetDate: string; // YYYY-MM-DD
  durationMinutes: number;
  objective: string;
  completed: boolean;
}

const STORAGE_KEY = 'agentuto_study_schedule_v1';

const DEFAULT_SCHEDULE: StudyCheckpoint[] = [
  {
    id: 'plan-1',
    sandboxId: 'lorentz-force',
    title: 'Lorentz Force & Velocity Selector Equilibrium',
    targetDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    durationMinutes: 45,
    objective: 'Measure cyclotron orbital radius r = mv/(qB) and verify velocity selector balance v = E/B.',
    completed: false,
  },
  {
    id: 'plan-2',
    sandboxId: 'harmonic-oscillator',
    title: 'Harmonic Oscillator Damping & Phase Resonance',
    targetDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    durationMinutes: 60,
    objective: 'Compare underdamped vs critical damping and observe π/2 phase lag at natural frequency.',
    completed: false,
  },
  {
    id: 'plan-3',
    sandboxId: 'photoelectric-effect',
    title: 'Photoelectric Effect & Planck Constant Extraction',
    targetDate: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
    durationMinutes: 45,
    objective: 'Sweep retarding stopping potential to measure slope h = e · dVstop/df.',
    completed: false,
  },
];

export interface StudySchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSandbox: (id: SimulationId) => void;
}

/**
 * Builds Google Calendar Web Intent URL (Solution A - 1-Click with Zero OAuth/API keys)
 */
export function buildGoogleCalendarUrl(checkpoint: StudyCheckpoint): string {
  const sim = SIMULATION_CATALOG[checkpoint.sandboxId];
  const simTitle = sim?.title ?? checkpoint.title;
  const eq = COURSE_EQUIVALENCE_MAP[checkpoint.sandboxId];

  const startDate = new Date(checkpoint.targetDate + 'T14:00:00Z');
  const endDate = new Date(startDate.getTime() + checkpoint.durationMinutes * 60 * 1000);

  const formatGCalDate = (d: Date) =>
    d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const title = encodeURIComponent(`Agentuto Lab: ${simTitle}`);
  const details = encodeURIComponent(
    `Empirical Science Laboratory Session\n\n` +
    `Objective: ${checkpoint.objective}\n` +
    (eq ? `Course Alignment: ${eq.mit} | ${eq.utsg} | ${eq.secondary}\n` : '') +
    `Simulation Link: ${demoLink(checkpoint.sandboxId)}\n\n` +
    `Generated via Agentuto Academic Scheduler`
  );

  const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
}

export const StudySchedulerModal: React.FC<StudySchedulerModalProps> = ({
  isOpen,
  onClose,
  onSelectSandbox,
}) => {
  const [schedule, setSchedule] = useState<StudyCheckpoint[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SCHEDULE;
  });

  const [newSimId, setNewSimId] = useState<SimulationId>('projectile-drag');
  const [newDate, setNewDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [newMinutes, setNewMinutes] = useState<number>(45);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
    } catch {}
  }, [schedule]);

  if (!isOpen) return null;

  const handleToggleCompleted = (id: string) => {
    setSchedule((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
  };

  const handleDelete = (id: string) => {
    setSchedule((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCheckpoint = () => {
    const sim = SIMULATION_CATALOG[newSimId];
    if (!sim) return;

    const newCheckpoint: StudyCheckpoint = {
      id: `plan-${Date.now()}`,
      sandboxId: newSimId,
      title: sim.title,
      targetDate: newDate,
      durationMinutes: newMinutes,
      objective: `Investigate ${sim.title} empirical parameters and test governing ODE: ${sim.formattedODE}`,
      completed: false,
    };

    setSchedule((prev) => [...prev, newCheckpoint]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-card border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-paper">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-soft border border-accent text-accent">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <span>Personal Study Scheduler &amp; Checkpoints</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  Local-First
                </span>
              </h2>
              <p className="text-xs text-muted">
                Pace your academic curriculum and add 1-click checkpoints directly to your Google Calendar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
            title="Close Scheduler"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="space-y-2.5">
            {schedule.map((item) => {
              const eq = COURSE_EQUIVALENCE_MAP[item.sandboxId];
              const gcalUrl = buildGoogleCalendarUrl(item);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    item.completed
                      ? 'bg-paper border-line opacity-60'
                      : 'bg-paper border-line hover:border-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleCompleted(item.id)}
                      className="mt-0.5 text-muted hover:text-emerald-400 transition-colors cursor-pointer"
                      title={item.completed ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium ${
                            item.completed ? 'line-through text-muted' : 'text-ink'
                          }`}
                        >
                          {item.title}
                        </span>
                        {eq && (
                          <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-card text-accent border border-line">
                            {eq.utsg}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted leading-relaxed max-w-xl">
                        {item.objective}
                      </p>

                      <div className="flex items-center gap-3 text-xs font-mono text-muted pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted" />
                          <span>{item.targetDate}</span>
                        </span>
                        <span>•</span>
                        <span>{item.durationMinutes} min</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Launch in App & Add to Google Calendar */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={gcalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-accent-soft hover:bg-accent-soft border border-accent text-accent text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Add 1-Click Checkpoint to Google Calendar (Web Intent)"
                    >
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      <span>Google Cal</span>
                      <ExternalLink className="w-3 h-3 text-accent" />
                    </a>

                    <button
                      onClick={() => {
                        onSelectSandbox(item.sandboxId);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sunken hover:bg-sunken text-ink text-xs font-medium transition-colors cursor-pointer"
                      title="Launch Simulation Sandbox"
                    >
                      Launch
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-muted hover:text-rose-400 hover:bg-sunken rounded transition-colors cursor-pointer"
                      title="Remove checkpoint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Checkpoint Creator Form */}
          <div className="p-4 rounded-xl bg-paper border border-line space-y-3">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wide flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-accent" />
              <span>Add Custom Milestone Checkpoint</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Target Apparatus</label>
                <select
                  value={newSimId}
                  onChange={(e) => setNewSimId(e.target.value as SimulationId)}
                  className="w-full bg-card border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent cursor-pointer"
                >
                  {Object.values(SIMULATION_CATALOG).map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.mode}] {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Target Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-card border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Duration (Min)</label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  step="15"
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(parseInt(e.target.value, 10))}
                  className="w-full bg-card border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <button
              onClick={handleAddCheckpoint}
              className="px-4 py-2 rounded-lg bg-accent hover:opacity-90 text-on-accent text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Study Schedule</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="p-4 border-t border-line bg-paper flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-2">
          <span>
            Checkpoints are stored privately in your browser&apos;s <code className="font-mono text-ink">localStorage</code>. Zero server tracking.
          </span>
          <button
            onClick={() => setSchedule(DEFAULT_SCHEDULE)}
            className="text-xs text-accent hover:text-accent underline cursor-pointer"
          >
            Reset Default Curriculum Track
          </button>
        </div>
      </div>
    </div>
  );
};
