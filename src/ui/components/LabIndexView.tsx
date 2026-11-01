import React, { useState, useMemo } from 'react';
import {
  Atom,
  BookOpen,
  Compass,
  Play,
  Search,
  Ruler,
  Timer,
  LineChart,
  Download,
  Sliders,
  ShieldAlert,
  ArrowRight,
  Layers,
  X,
} from 'lucide-react';
import { SIMULATION_CATALOG, SimulationId, SimulationRegistration } from '../../simulations';
import { SANDBOX_LAB_GUIDES } from '../../simulations/sandboxGuides';
import { COURSE_EQUIVALENCE_MAP } from '../../knowledge/courseEquivalence';
import { COURSES } from '../../courses/courses';

export interface LabIndexViewProps {
  isOpen: boolean;
  activeTab: 'catalog' | 'guide';
  onTabChange: (tab: 'catalog' | 'guide') => void;
  currentSandboxId: SimulationId;
  onSelectSandbox: (id: SimulationId) => void;
  onClose: () => void;
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
  currentSandboxId,
  onSelectSandbox,
  onClose,
  webglAvailable = true,
}) => {
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allSimulations = useMemo(() => Object.values(SIMULATION_CATALOG), []);
  const activeSim = SIMULATION_CATALOG[currentSandboxId];

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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/98 text-neutral-100 overflow-y-auto select-text"
      role="dialog"
      aria-modal="true"
      aria-label="Agentuto Laboratory Module Index and User Guide"
    >
      {/* Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-20 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
              <Atom className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-semibold tracking-tight text-neutral-100">Instruments</h1>
                <a href="#/" className="text-sm text-neutral-300 hover:text-neutral-100 underline underline-offset-4">&larr; Courses</a>
              </div>
            </div>
          </div>

          {/* Primary View Switcher & Return to Active Apparatus */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800"
              role="tablist"
              aria-label="Index view tabs"
            >
              <button
                role="tab"
                aria-selected={activeTab === 'catalog'}
                onClick={() => onTabChange('catalog')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'bg-indigo-600 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Module Catalog ({allSimulations.length})</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'guide'}
                onClick={() => onTabChange('guide')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-indigo-600 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>User Guide &amp; Lab Manual</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-sm font-medium transition-colors cursor-pointer"
              title={`Return to active simulation (${activeSim?.title})`}
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span className="hidden sm:inline">Return to Apparatus</span>
              <X className="w-4 h-4 text-neutral-400 sm:hidden" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Scholarly Scope & Non-Affiliation Banner */}
        <section className="rounded-2xl bg-neutral-900/60 border border-neutral-800/90 p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <h2 className="text-base font-semibold text-neutral-100">
                Open-Ended Empirical Science Sandbox
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Agentuto provides continuous parameter spaces, fixed-step numerical integrators (200 Hz RK4 &amp;
                Crank-Nicolson), virtual measurement instruments (caliper, photogate, OLS &amp; exponential regression
                notebook, RFC-4180 CSV export), and an optional bring-your-own-key Socratic AI tutor. Every simulation,
                instrument, and data export works completely offline without AI.
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                <strong>Topic Alignment:</strong> Modules are aligned with topics from MIT OpenCourseWare (8.01, 8.02,
                8.03, 8.04, 8.044, 18.03) and AP/IB Physics syllabi. Course labels describe topic alignment only;
                Agentuto is an independent open-source project and is not affiliated with or endorsed by these
                institutions.
              </p>
            </div>

            {activeSim && (
              <div className="shrink-0 rounded-xl bg-neutral-950/90 border border-indigo-500/30 p-4 flex flex-col gap-2 min-w-[260px]">
                <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
                  Currently Loaded Apparatus
                </span>
                <div className="text-sm font-semibold text-neutral-100">{activeSim.title}</div>
                <div className="text-xs font-mono text-neutral-400 truncate">{activeSim.formattedODE}</div>
                <button
                  onClick={onClose}
                  className="mt-1 w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Resume Active Sandbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </section>

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
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by topic, equation, or keyword…"
                  aria-label="Filter modules by keyword"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Module Cards Grid - Clean, Compact 3-Column Benchmarked Layout */}
            {filteredSimulations.length === 0 ? (
              <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800 p-8 text-center space-y-2">
                <p className="text-base text-neutral-300 font-medium">No modules match your current filter.</p>
                <button
                  onClick={() => {
                    setCourseFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-sm text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSimulations.map((sim: SimulationRegistration) => {
                  const catalogIndex = allSimulations.findIndex((s) => s.id === sim.id) + 1;
                  const eq = COURSE_EQUIVALENCE_MAP[sim.id];
                  const isCurrent = sim.id === currentSandboxId;

                  return (
                    <article
                      key={sim.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all hover:shadow-xl ${
                        isCurrent
                          ? 'bg-neutral-900/90 border-indigo-500/60 ring-1 ring-indigo-500/30'
                          : 'bg-neutral-900/50 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-900/70'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Top Metadata Badges */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                              #{String(catalogIndex).padStart(2, '0')}
                            </span>
                            <span
                              className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded border ${
                                sim.mode === '3D'
                                  ? 'bg-indigo-950/70 text-indigo-300 border-indigo-500/30'
                                  : 'bg-sky-950/70 text-sky-300 border-sky-500/30'
                              }`}
                            >
                              {sim.mode}
                            </span>
                            {sim.mode === '3D' && !webglAvailable && (
                              <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded border bg-amber-950/60 text-amber-300 border-amber-500/30">
                                needs WebGL
                              </span>
                            )}
                          </div>

                          {isCurrent ? (
                            <span className="text-xs font-mono text-emerald-400 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-neutral-500">
                              {sim.curriculum.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-neutral-100 leading-snug line-clamp-1" title={sim.title}>
                          {sim.title}
                        </h3>

                        {/* Compact Governing ODE Formula Pill */}
                        <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-lg px-2.5 py-1.5 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-nowrap">
                          {sim.formattedODE}
                        </div>

                        {/* Description (2 lines clamped) */}
                        <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                          {sim.description}
                        </p>

                        {/* Course Equivalence Pill (UTSG, MIT, AP/IB) */}
                        {eq && (
                          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 bg-neutral-950/60 px-2 py-1 rounded border border-neutral-800/80">
                            <span className="text-indigo-400 font-semibold">{eq.utsg}</span>
                            <span className="text-neutral-600">•</span>
                            <span className="text-neutral-400 truncate">{eq.secondary}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/70">
                        <button
                          onClick={() => {
                            onTabChange('guide');
                            setTimeout(() => {
                              document.getElementById(`guide-${sim.id}`)?.scrollIntoView({ behavior: 'smooth' });
                            }, 50);
                          }}
                          className="text-xs text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
                        >
                          Manual
                        </button>

                        <button
                          onClick={() => handleLaunch(sim.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
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
              className="rounded-xl bg-neutral-900/70 border border-neutral-800 p-4 flex flex-wrap gap-2 items-center"
            >
              <span className="text-xs font-mono uppercase text-neutral-400 mr-2">Jump to Section:</span>
              <a href="#manual-workflow" className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200">
                1. Inquiry Workflow
              </a>
              <a href="#manual-controls" className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200">
                2. Operating Controls
              </a>
              <a href="#manual-instruments" className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200">
                3. Measurement Instruments
              </a>
              <a href="#manual-modules" className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200">
                4. Module Reference ({allSimulations.length})
              </a>
              <a href="#manual-ai" className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200">
                5. Optional AI Tutor &amp; Disclaimer
              </a>
            </nav>

            {/* Section 1: Inquiry Workflow */}
            <div id="manual-workflow" className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-400" />
                <span>1. Laboratory Philosophy &amp; Inquiry Workflow</span>
              </h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Unlike step-by-step demonstrations with fixed outcomes, Agentuto treats each simulation as an open
                experimental apparatus. Every module integrates its governing differential equations at a fixed timestep
                of <code className="font-mono text-indigo-300">Δt = 0.005 s (200 Hz)</code>, decoupled from your monitor
                refresh rate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 p-4 space-y-1.5">
                  <div className="text-xs font-mono text-indigo-400 font-semibold">STEP 1 • HYPOTHESIZE</div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Inspect the governing differential equation in the header and predict how changing a physical
                    parameter will alter the trajectory or waveform.
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 p-4 space-y-1.5">
                  <div className="text-xs font-mono text-sky-400 font-semibold">STEP 2 • MANIPULATE</div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Vary continuous sliders in the Parameter Deck or load a curated benchmark preset from the Curriculum
                    Roadmap tab.
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 p-4 space-y-1.5">
                  <div className="text-xs font-mono text-emerald-400 font-semibold">STEP 3 • MEASURE &amp; RECORD</div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Use the Digital Caliper, Photogate, and 50 Hz Telemetry Recorder to gather empirical measurements
                    independent of theoretical formulas.
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-950/80 border border-neutral-800 p-4 space-y-1.5">
                  <div className="text-xs font-mono text-amber-400 font-semibold">STEP 4 • FIT &amp; VERIFY</div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Fit linear (<code className="font-mono">y = mx + b</code>) or exponential (
                    <code className="font-mono">y = A·e^(Bx)</code>) models in the Lab Notebook, or export RFC-4180 CSV
                    data to Python, Excel, or Logger Pro.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Operating Controls */}
            <div id="manual-controls" className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span>2. Operating the Interface &amp; 3D Viewport Controls</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm text-neutral-300 leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-semibold text-neutral-100">HUD Panels &amp; Playback Shortcuts</h3>
                  <ul className="list-disc list-inside space-y-1.5 text-neutral-300">
                    <li>
                      <strong>Play / Pause (<code className="font-mono text-indigo-300">Space</code>):</strong> Starts
                      or freezes time integration while keeping the 3D camera interactive.
                    </li>
                    <li>
                      <strong>Single Step Forward:</strong> Pauses and advances the physics clock by exactly one fixed
                      step (<code className="font-mono text-indigo-300">Δt = 0.005 s</code>).
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
                  <h3 className="font-semibold text-neutral-100">3D Camera Navigation (Windows &amp; Mac)</h3>
                  <ul className="list-disc list-inside space-y-1.5 text-neutral-300">
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
            <div id="manual-instruments" className="rounded-2xl bg-neutral-900/50 border border-neutral-800 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-sky-400" />
                <span>3. Virtual Laboratory Measurement Instruments</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-300 font-semibold text-sm">
                    <Ruler className="w-4 h-4" />
                    <span>Digital Caliper</span>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Toggle from the bottom dock and drag either jaw to measure spatial distances on screen (e.g., Young
                    double-slit fringe spacing <code className="font-mono">Δy</code>, cyclotron diameter, or spring
                    extension).
                  </p>
                </div>

                <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                    <Timer className="w-4 h-4" />
                    <span>Virtual Photogate Sensor</span>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Measures beam interruption timestamps and transit intervals <code className="font-mono">Δt</code> to
                    determine oscillation periods and instantaneous speeds empirically.
                  </p>
                </div>

                <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                    <LineChart className="w-4 h-4" />
                    <span>In-App Lab Notebook &amp; Curve Fitter</span>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Select any two recorded telemetry channels for X and Y axes and compute Ordinary Least-Squares
                    Linear (<code className="font-mono">y = mx + b</code>) or Exponential (
                    <code className="font-mono">y = A·e^(Bx)</code>) regressions with Pearson{' '}
                    <code className="font-mono">R²</code>.
                  </p>
                </div>

                <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                    <Download className="w-4 h-4" />
                    <span>RFC-4180 CSV Telemetry Export</span>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
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
                <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <span>4. Reference Guide to All {allSimulations.length} Modules</span>
                </h2>
                <span className="text-xs text-neutral-400">
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
                      className="rounded-2xl bg-neutral-900/45 border border-neutral-800 p-5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-indigo-400">
                              MODULE {String(idx + 1).padStart(2, '0')}
                            </span>
                            <h3 className="text-base font-semibold text-neutral-100">{sim.title}</h3>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                              Aligned with {sim.curriculum}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-indigo-300">
                            Governing Equation: {sim.formattedODE}
                          </div>
                        </div>

                        <button
                          onClick={() => handleLaunch(sim.id)}
                          className="self-start sm:self-center shrink-0 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <span>Launch Module</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-sm text-neutral-300 leading-relaxed">{sim.description}</p>

                      {guide && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                              Physical Phenomena &amp; Notes
                            </h4>
                            <ul className="space-y-2">
                              {guide.whatToExplore.map((item, k) => (
                                <li key={k} className="text-sm text-neutral-300 leading-relaxed">
                                  <strong className="text-neutral-100">{item.title}:</strong> {item.detail}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl bg-neutral-950/70 border border-neutral-800/80 p-3.5 space-y-2">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-indigo-300">
                              Empirical Measurement Protocol
                            </h4>
                            <ol className="text-sm text-neutral-300 space-y-1.5 list-decimal list-inside leading-relaxed">
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
            <div id="manual-ai" className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>5. Optional Socratic AI Tutor (Bring Your Own Key) &amp; Disclaimer</span>
              </h2>

              <div className="space-y-3 text-sm text-neutral-300 leading-relaxed">
                <p>
                  <strong>AI is optional.</strong> All simulations, measurement instruments, the Lab Notebook curve
                  fitter, and CSV export work fully without any AI. If you choose to enable the Socratic AI Tutor or
                  Dynamic Playlist Generator, it connects directly from your browser to Google&apos;s Gemini API using
                  your own account and API key (<code className="font-mono text-indigo-300">gemini-3.8-flash</code>).
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
                <p className="text-xs text-neutral-400 pt-2 border-t border-neutral-800">
                  Agentuto is an independent open-source project released under the MIT License. It is not affiliated
                  with or endorsed by MIT, the College Board (AP), the International Baccalaureate (IB), Google, or
                  Anthropic; course labels describe topic alignment only.
                </p>
              </div>
            </div>
          </section>
        )}
        {/* The credits, licence and community links live on the About page. */}
        <footer className="mt-12 pt-6 border-t border-neutral-800 text-sm text-neutral-400 flex flex-wrap items-center justify-between gap-3">
          <span>Open source under the MIT licence. Not affiliated with any institution.</span>
          <span className="flex gap-5">
            <a href="#/" className="hover:text-neutral-200 underline underline-offset-4">Courses</a>
            <a href="#/about" className="hover:text-neutral-200 underline underline-offset-4">About</a>
          </span>
        </footer>
      </div>
    </div>
  );
});
