import React, { useState, useMemo } from 'react';
import {
  Compass,
  Search,
  Ruler,
  Timer,
  LineChart,
  Download,
  Sliders,
  ShieldAlert,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { SIMULATION_CATALOG, SimulationId, SimulationRegistration } from '../../simulations';
import { SANDBOX_LAB_GUIDES } from '../../simulations/sandboxGuides';
import { COURSES } from '../../courses/courses';
import { LocalBadge } from '../site/LocalBadge';
import { SiteLayout } from '../site/SiteLayout';

export interface LabIndexViewProps {
  isOpen: boolean;
  activeTab: 'catalog' | 'guide';
  onTabChange: (tab: 'catalog' | 'guide') => void;
  /** The sandbox already open underneath, if any, so the page can offer to resume it. */
  resumeSandboxId: string | null;
  onSelectSandbox: (id: SimulationId) => void;
  /** When false, 3D sandboxes are marked as unavailable instead of failing silently on click. */
  webglAvailable?: boolean;
}

// Derived from the course data (Art. 5.2: no hand-kept list beside the manifest). The old chips matched
// substrings of each sandbox's curriculum text, so "8.03" also caught every "18.03" sandbox.
const COURSE_FILTERS = [
  { id: 'ALL', label: 'All Modules', includes: (_sandboxId: string) => true },
  ...COURSES.map((course) => ({
    id: course.id,
    label: `Aligned with ${course.id} (${course.shortTitle})`,
    includes: (sandboxId: string) => course.modules.some((m) => m.sandboxId === sandboxId),
  })),
];

export const LabIndexView: React.FC<LabIndexViewProps> = React.memo(({
  isOpen,
  activeTab,
  onTabChange,
  resumeSandboxId,
  onSelectSandbox,
  webglAvailable = true,
}) => {
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allSimulations = useMemo(() => Object.values(SIMULATION_CATALOG), []);
  const activeSim = resumeSandboxId ? SIMULATION_CATALOG[resumeSandboxId] : undefined;

  const filteredSimulations = useMemo(() => {
    const activeFilterObj = COURSE_FILTERS.find((f) => f.id === courseFilter) ?? COURSE_FILTERS[0];
    const q = searchQuery.trim().toLowerCase();

    return allSimulations.filter((sim) => {
      if (!activeFilterObj.includes(sim.id)) return false;
      if (!q) return true;
      return (
        sim.title.toLowerCase().includes(q) ||
        sim.id.toLowerCase().includes(q) ||
        sim.curriculum.toLowerCase().includes(q) ||
        sim.description.toLowerCase().includes(q) ||
        sim.formattedODE.toLowerCase().includes(q)
      );
    });
  }, [allSimulations, courseFilter, searchQuery]);

  if (!isOpen) return null;

  const handleLaunch = (id: string) => {
    onSelectSandbox(id as SimulationId);
  };

  const isCatalog = activeTab === 'catalog';

  return (
    <SiteLayout current={isCatalog ? 'instruments' : 'guide'} label={isCatalog ? 'Instruments · Agentuto' : 'User guide · Agentuto'}>
      <main className="mx-auto max-w-6xl space-y-10 px-6 py-12 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
              {isCatalog ? 'Instruments' : 'User guide'}
            </h1>
            <p className="mt-4 text-lg text-muted">
              {isCatalog
                ? `All ${allSimulations.length} instruments, with a filter by course. Topic alignment only: Agentuto is not affiliated with or endorsed by any institution.`
                : 'How to run Agentuto, how to drive an instrument, and what each one lets you measure.'}
            </p>
          </div>
          {activeSim && (
            <a
              href={`#/sandbox/${encodeURIComponent(activeSim.id)}`}
              className="inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4"
            >
              Resume {activeSim.title} &rarr;
            </a>
          )}
        </header>

        {activeTab === 'catalog' ? (
          /* ================================================================
             TAB 1: MODULE CATALOG (17 CANONICAL SANDBOXES)
             ================================================================ */
          <section className="space-y-6" aria-label="Simulation Module Directory">
            {/* Search and Course Alignment Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter modules by course alignment">
                {COURSE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCourseFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      courseFilter === f.id
                        ? 'bg-accent-soft border-accent text-ink'
                        : 'bg-card border-line text-muted hover:text-ink hover:border-muted'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter these instruments"
                  aria-label="Filter modules by keyword"
                  className="w-full bg-card border border-line rounded-xl pl-9 pr-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Module Cards Grid - Clean, Compact 3-Column Benchmarked Layout */}
            {filteredSimulations.length === 0 ? (
              <div className="rounded-2xl bg-card border border-line p-8 text-center space-y-2">
                <p className="text-base text-ink font-medium">No modules match your current filter.</p>
                <button
                  onClick={() => {
                    setCourseFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-sm text-accent hover:text-accent underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSimulations.map((sim: SimulationRegistration) => {
                  const catalogIndex = allSimulations.findIndex((s) => s.id === sim.id) + 1;
                  const isCurrent = sim.id === resumeSandboxId;

                  return (
                    <article
                      key={sim.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all hover:shadow-xl ${
                        isCurrent
                          ? 'bg-card border-accent ring-1 ring-accent'
                          : 'bg-card border-line hover:border-muted hover:bg-sunken'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Top Metadata Badges */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-sunken text-ink">
                              #{String(catalogIndex).padStart(2, '0')}
                            </span>
                            <span
                              className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded border ${
                                sim.mode === '3D'
                                  ? 'bg-accent-soft text-accent border-accent'
                                  : 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-600/40 dark:border-sky-500/30'
                              }`}
                            >
                              {sim.mode}
                            </span>
                            {sim.local && <LocalBadge variant="dark" />}
                            {sim.mode === '3D' && !webglAvailable && (
                              <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded border bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-600/40 dark:border-amber-500/30">
                                needs WebGL
                              </span>
                            )}
                          </div>

                          {isCurrent ? (
                            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-muted">
                              {sim.curriculum.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-1" title={sim.title}>
                          {sim.title}
                        </h3>

                        {/* Compact Governing ODE Formula Pill */}
                        <div className="bg-paper border border-line rounded-lg px-2.5 py-1.5 font-mono text-xs text-accent overflow-x-auto whitespace-nowrap">
                          {sim.formattedODE}
                        </div>

                        {/* Description (2 lines clamped) */}
                        <p className="text-xs text-ink leading-relaxed line-clamp-2">
                          {sim.description}
                        </p>

                      </div>

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
                        <button
                          onClick={() => {
                            onTabChange('guide');
                            setTimeout(() => {
                              document.getElementById(`guide-${sim.id}`)?.scrollIntoView({ behavior: 'smooth' });
                            }, 50);
                          }}
                          className="text-xs text-muted hover:text-ink underline cursor-pointer"
                        >
                          Manual
                        </button>

                        <button
                          onClick={() => handleLaunch(sim.id)}
                          className="px-3 py-1.5 rounded-lg bg-accent hover:opacity-90 text-on-accent text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* ================================================================
             TAB 2: LABORATORY MANUAL & USER GUIDE
             ================================================================ */
          <section className="space-y-8" aria-label="Laboratory Manual and User Guide">
            {/* Quick Section Jump Bar */}
            <nav
              aria-label="Manual sections"
              className="rounded-xl bg-card border border-line p-4 flex flex-wrap gap-2 items-center"
            >
              <span className="text-xs font-mono uppercase text-muted mr-2">Jump to Section:</span>
              <button type="button" onClick={() => document.getElementById('manual-workflow')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs px-2.5 py-1 rounded bg-sunken hover:bg-sunken text-ink cursor-pointer">
                1. Inquiry Workflow
              </button>
              <button type="button" onClick={() => document.getElementById('manual-controls')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs px-2.5 py-1 rounded bg-sunken hover:bg-sunken text-ink cursor-pointer">
                2. Operating Controls
              </button>
              <button type="button" onClick={() => document.getElementById('manual-instruments')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs px-2.5 py-1 rounded bg-sunken hover:bg-sunken text-ink cursor-pointer">
                3. Measurement Instruments
              </button>
              <button type="button" onClick={() => document.getElementById('manual-modules')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs px-2.5 py-1 rounded bg-sunken hover:bg-sunken text-ink cursor-pointer">
                4. Module Reference ({allSimulations.length})
              </button>
              <button type="button" onClick={() => document.getElementById('manual-ai')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs px-2.5 py-1 rounded bg-sunken hover:bg-sunken text-ink cursor-pointer">
                5. Optional AI Tutor &amp; Disclaimer
              </button>
            </nav>

            {/* Section 1: Inquiry Workflow */}
            <div id="manual-workflow" className="rounded-2xl bg-card border border-line p-6 space-y-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Compass className="w-5 h-5 text-accent" />
                <span>1. Laboratory Philosophy &amp; Inquiry Workflow</span>
              </h2>
              <p className="text-sm text-ink leading-relaxed">
                Unlike step-by-step demonstrations with fixed outcomes, Agentuto treats each simulation as an open
                experimental apparatus. Every module integrates its governing differential equations at a fixed timestep
                of <code className="font-mono text-accent">Δt = 0.005 s (200 Hz)</code>, decoupled from your monitor
                refresh rate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl bg-paper border border-line p-4 space-y-1.5">
                  <div className="text-xs font-mono text-accent font-semibold">STEP 1 • HYPOTHESIZE</div>
                  <p className="text-sm text-ink leading-relaxed">
                    Inspect the governing differential equation in the header and predict how changing a physical
                    parameter will alter the trajectory or waveform.
                  </p>
                </div>
                <div className="rounded-xl bg-paper border border-line p-4 space-y-1.5">
                  <div className="text-xs font-mono text-sky-700 dark:text-sky-300 font-semibold">STEP 2 • MANIPULATE</div>
                  <p className="text-sm text-ink leading-relaxed">
                    Vary continuous sliders in the Parameter Deck or load a curated benchmark preset from the Curriculum
                    Roadmap tab.
                  </p>
                </div>
                <div className="rounded-xl bg-paper border border-line p-4 space-y-1.5">
                  <div className="text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">STEP 3 • MEASURE &amp; RECORD</div>
                  <p className="text-sm text-ink leading-relaxed">
                    Use the Digital Caliper, Photogate, and 50 Hz Telemetry Recorder to gather empirical measurements
                    independent of theoretical formulas.
                  </p>
                </div>
                <div className="rounded-xl bg-paper border border-line p-4 space-y-1.5">
                  <div className="text-xs font-mono text-amber-700 dark:text-amber-300 font-semibold">STEP 4 • FIT &amp; VERIFY</div>
                  <p className="text-sm text-ink leading-relaxed">
                    Fit linear (<code className="font-mono">y = mx + b</code>) or exponential (
                    <code className="font-mono">y = A·e^(Bx)</code>) models in the Lab Notebook, or export RFC-4180 CSV
                    data to Python, Excel, or Logger Pro.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Operating Controls */}
            <div id="manual-controls" className="rounded-2xl bg-card border border-line p-6 space-y-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Sliders className="w-5 h-5 text-accent" />
                <span>2. Operating the Interface &amp; 3D Viewport Controls</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm text-ink leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">HUD Panels &amp; Playback Shortcuts</h3>
                  <ul className="list-disc list-inside space-y-1.5 text-ink">
                    <li>
                      <strong>Play / Pause (<code className="font-mono text-accent">Space</code>):</strong> Starts
                      or freezes time integration while keeping the 3D camera interactive.
                    </li>
                    <li>
                      <strong>Single Step Forward:</strong> Pauses and advances the physics clock by exactly one fixed
                      step (<code className="font-mono text-accent">Δt = 0.005 s</code>).
                    </li>
                    <li>
                      <strong>Speed Multipliers:</strong> Switch between <code className="font-mono">0.25×</code>,{' '}
                      <code className="font-mono">0.5×</code> (slow-motion), <code className="font-mono">1×</code>{' '}
                      (real-time), and <code className="font-mono">2×</code>.
                    </li>
                    <li>
                      <strong>Sliders &amp; Roadmap Deck (Left Dock):</strong> Adjust parameters live or switch to the
                      Curriculum Roadmap tab for curated presets and cross-disciplinary analogies.
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-ink">3D Camera Navigation (Windows &amp; Mac)</h3>
                  <ul className="list-disc list-inside space-y-1.5 text-ink">
                    <li>
                      <strong>Orbit / Rotate:</strong> Left-click and drag (or single-finger click-and-drag on a Mac
                      trackpad).
                    </li>
                    <li>
                      <strong>Zoom:</strong> Scroll wheel, or two-finger scroll / pinch on a trackpad.
                    </li>
                    <li>
                      <strong>Pan:</strong> Right-click and drag, or hold <code className="font-mono">Shift</code> /{' '}
                      <code className="font-mono">⌘</code> while dragging (available on OrbitControls 3D views).
                    </li>
                    <li>
                      <strong>CSV Downloads on macOS Safari:</strong> If Safari prompts{' '}
                      <em>&ldquo;Do you want to allow downloads on this site?&rdquo;</em>, click <strong>Allow</strong>.
                      Lines beginning with <code className="font-mono">#</code> are metadata headers.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3: Virtual Laboratory Measurement Instruments */}
            <div id="manual-instruments" className="rounded-2xl bg-card border border-line p-6 space-y-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Ruler className="w-5 h-5 text-sky-700 dark:text-sky-300" />
                <span>3. Virtual Laboratory Measurement Instruments</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-paper border border-line p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-semibold text-sm">
                    <Ruler className="w-4 h-4" />
                    <span>Digital Caliper</span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">
                    Toggle from the bottom dock and drag either jaw to measure spatial distances on screen (e.g., Young
                    double-slit fringe spacing <code className="font-mono">Δy</code>, cyclotron diameter, or spring
                    extension).
                  </p>
                </div>

                <div className="rounded-xl bg-paper border border-line p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                    <Timer className="w-4 h-4" />
                    <span>Virtual Photogate Sensor</span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">
                    Measures beam interruption timestamps and transit intervals <code className="font-mono">Δt</code> to
                    determine oscillation periods and instantaneous speeds empirically.
                  </p>
                </div>

                <div className="rounded-xl bg-paper border border-line p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-sm">
                    <LineChart className="w-4 h-4" />
                    <span>In-App Lab Notebook &amp; Curve Fitter</span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">
                    Select any two recorded telemetry channels for X and Y axes and compute Ordinary Least-Squares
                    Linear (<code className="font-mono">y = mx + b</code>) or Exponential (
                    <code className="font-mono">y = A·e^(Bx)</code>) regressions with Pearson{' '}
                    <code className="font-mono">R²</code>.
                  </p>
                </div>

                <div className="rounded-xl bg-paper border border-line p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                    <Download className="w-4 h-4" />
                    <span>RFC-4180 CSV Telemetry Export</span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">
                    Click <strong>Record</strong> to sample up to 10,000 points at 50 Hz in an O(1) circular ring
                    buffer, then click <strong>Export CSV</strong> to download timestamped data with active parameter
                    headers.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Complete 17-Sandbox Reference Manual */}
            <div id="manual-modules" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <Layers className="w-5 h-5 text-accent" />
                  <span>4. Reference Guide to All {allSimulations.length} Modules</span>
                </h2>
                <span className="text-xs text-muted">
                  Faculty-reviewed equations, boundary conditions, and empirical protocols
                </span>
              </div>

              <div className="space-y-4">
                {allSimulations.map((sim, idx) => {
                  const guide = SANDBOX_LAB_GUIDES[sim.id];
                  return (
                    <div
                      key={sim.id}
                      id={`guide-${sim.id}`}
                      className="rounded-2xl bg-card border border-line p-5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-accent">
                              MODULE {String(idx + 1).padStart(2, '0')}
                            </span>
                            <h3 className="text-base font-semibold text-ink">{sim.title}</h3>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-sunken text-ink">
                              Aligned with {sim.curriculum}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-accent">
                            Governing Equation: {sim.formattedODE}
                          </div>
                        </div>

                        <button
                          onClick={() => handleLaunch(sim.id)}
                          className="self-start sm:self-center shrink-0 px-3.5 py-1.5 rounded-xl bg-accent hover:opacity-90 text-on-accent text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <span>Launch Module</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-sm text-ink leading-relaxed">{sim.description}</p>

                      {guide && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-muted">
                              Physical Phenomena &amp; Notes
                            </h4>
                            <ul className="space-y-2">
                              {guide.whatToExplore.map((item, k) => (
                                <li key={k} className="text-sm text-ink leading-relaxed">
                                  <strong className="text-ink">{item.title}:</strong> {item.detail}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl bg-paper border border-line p-3.5 space-y-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-accent">
                              Empirical Measurement Protocol
                            </h4>
                            <ol className="text-sm text-ink space-y-1.5 list-decimal list-inside leading-relaxed">
                              {guide.labProtocol.map((step, k) => (
                                <li key={k}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Optional AI Tutor & Mandatory Disclaimer */}
            <div id="manual-ai" className="rounded-2xl bg-card border border-line p-6 space-y-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                <span>5. Optional Socratic AI Tutor (Bring Your Own Key) &amp; Disclaimer</span>
              </h2>

              <div className="space-y-3 text-sm text-ink leading-relaxed">
                <p>
                  <strong>AI is optional.</strong> All simulations, measurement instruments, the Lab Notebook curve
                  fitter, and CSV export work fully without any AI. If you choose to enable the Socratic AI Tutor or
                  Dynamic Playlist Generator, it connects directly from your browser to Google&apos;s Gemini API using
                  your own account and API key (<code className="font-mono text-accent">gemini-3.8-flash</code>).
                </p>
                <p>
                  Your API key is stored only in your browser&apos;s <code className="font-mono">localStorage</code>.
                  Agentuto operates no backend servers and collects no analytics or telemetry. When you send a message to
                  the tutor, your prompt, active slider parameters, and summary telemetry are sent directly to the AI
                  provider you configured under that provider&apos;s terms of service (including age and regional
                  requirements). Use only services you are allowed to use. If you need permission from a parent, teacher or
                  institution to use an AI service, get it first, and follow the rules that apply to you: many schools,
                  colleges and employers restrict generative AI.
                </p>
                <p>
                  The Socratic tutor is instructed not to compute or hand out final numerical answers, and instead points
                  you to specific telemetry variables to measure and verify yourself. AI models can still make mistakes;
                  always verify results independently against empirical telemetry and analytical equations.
                </p>
                <p className="text-xs text-muted pt-2 border-t border-line">
                  Agentuto is an independent open-source project released under the MIT License. It is not affiliated
                  with or endorsed by MIT, the College Board (AP), the International Baccalaureate (IB), Google, or
                  Anthropic; course labels describe topic alignment only.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </SiteLayout>
  );
});
