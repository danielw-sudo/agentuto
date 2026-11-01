import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Activity, ChevronLeft, Eye, EyeOff, MoreHorizontal, Sliders, Sparkles } from 'lucide-react';
import { ViewportContainer } from './layout/ViewportContainer';
import { DockLayout } from './layout/DockLayout';
import { SiteSearch } from '../ui/site/SiteSearch';
import { COMMUNITY, feedbackUrl } from '../community';
import { LocalBadge } from '../ui/site/LocalBadge';
import { coursesOfSandbox } from '../courses/courses';
import { GlassPanel } from '../ui/components/GlassPanel';
import { ParameterDeck } from '../ui/components/ParameterDeck';
import { TelemetryBar } from '../ui/components/TelemetryBar';
import { LiveTelemetryCard } from '../ui/components/LiveTelemetryCard';
import { SocraticDrawer } from '../ui/components/SocraticDrawer';
import { RoadmapDeck } from '../ui/components/RoadmapDeck';
import { VirtualCaliper } from '../ui/components/VirtualCaliper';
import { VirtualPhotogate } from '../ui/components/VirtualPhotogate';
import { LabNotebookDrawer } from '../ui/components/LabNotebookDrawer';
import { InquiryLogDrawer } from '../ui/components/InquiryLogDrawer';
import { createInquiryJournal, schemaForSandbox } from '../ui/journal/inquiryLogModel';
import { UnavailableViewport } from '../ui/components/UnavailableViewport';
import { StudySchedulerModal } from '../ui/components/StudySchedulerModal';
import { useAITutor } from '../ai/hooks/useAITutor';
import { SimulationTelemetryContext } from '../ai/types';

import { SIMULATION_CATALOG, SimulationId, SimulationRuntime } from '../simulations';
import { guideOf } from '../simulations/sandboxGuides';
import { TelemetryRecorder } from '../core/telemetry/TelemetryRecorder';
import { formatTelemetryToCSV, triggerCSVDownload } from '../core/telemetry/csvExporter';
import { useSimulationEngine } from '../core/hooks/useSimulationEngine';
import { sandboxNeedsWebGL } from '../core/graphics/sandboxChoice';

export interface SandboxWorkspaceProps {
  sandboxId: SimulationId;
  /** Engine and renderer factories, already fetched: the workspace never waits on the network. */
  runtime: SimulationRuntime;
  webglAvailable: boolean;
  /** True while the catalogue / guide is shown over the workspace. The simulation keeps running behind it. */
  isIndexOpen: boolean;
  onOpenSandbox: (id: SimulationId) => void;
  onCloseIndex: () => void;
}

export const SandboxWorkspace: React.FC<SandboxWorkspaceProps> = ({
  sandboxId,
  runtime,
  webglAvailable,
  isIndexOpen,
  onOpenSandbox,
  onCloseIndex,
}) => {
  const selectedSimId = sandboxId;
  const [activeLeftTab, setActiveLeftTab] = useState<'controls' | 'roadmap'>('controls');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const pendingPresetRef = useRef<Record<string, number> | null>(null);
  const simRegistration = SIMULATION_CATALOG[selectedSimId];
  const labGuide = guideOf(SIMULATION_CATALOG[selectedSimId]);

  // Re-instantiate engine, renderer, and recorder when simulation changes
  const engine = useMemo(() => runtime.createEngine(), [selectedSimId, runtime]);
  // A 3D renderer constructs its WebGL context eagerly, so creating one can throw. Catching it here
  // keeps the shell (catalogue, parameters, telemetry, 2D sandboxes) alive instead of taking the
  // whole React tree down with it.
  const rendererFailure = useRef<string | null>(null);
  const renderer = useMemo(() => {
    if (sandboxNeedsWebGL(simRegistration) && !webglAvailable) {
      rendererFailure.current = 'webgl-unavailable';
      return undefined;
    }
    try {
      rendererFailure.current = null;
      return runtime.createRenderer();
    } catch (error) {
      rendererFailure.current = error instanceof Error ? error.message : 'renderer failed to start';
      return undefined;
    }
  }, [selectedSimId, simRegistration, runtime, webglAvailable]);
  const recorder = useMemo(() => new TelemetryRecorder({ sampleRateHz: 50, maxSamples: 10000 }), [selectedSimId]);

  const {
    isRunning,
    simTime,
    params,
    speedMultiplier,
    isRecording,
    liveState,
    sampleCount,
    togglePlayPause,
    stepForward,
    resetSimulation,
    updateParameter,
    batchUpdateParameters,
    setSpeedMultiplier,
    toggleRecording,
  } = useSimulationEngine({
    engine,
    renderer,
    recorder,
    initialParams: simRegistration.defaultParams,
    fixedDeltaTime: 0.005,
  });

  // Apply pending preset when sandbox switch completes
  useEffect(() => {
    if (pendingPresetRef.current) {
      const preset = { ...simRegistration.defaultParams, ...pendingPresetRef.current };
      pendingPresetRef.current = null;
      batchUpdateParameters(preset);
      resetSimulation(preset);
    }
  }, [engine, simRegistration.defaultParams, batchUpdateParameters, resetSimulation]);

  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [isCaliperOpen, setIsCaliperOpen] = useState<boolean>(false);
  const [isPhotogateOpen, setIsPhotogateOpen] = useState<boolean>(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isInquiryLogOpen, setIsInquiryLogOpen] = useState<boolean>(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState<boolean>(false);

  // One Inquiry Log for the whole session: created once, so every sandbox writes into the same log.
  // `persistent` is false when the browser refuses local storage, and the drawer says so.
  const inquiryJournal = useMemo(() => createInquiryJournal(), []);
  // Parameter ranges and channel units for the active sandbox, derived from the manifest — the drawer
  // never spells a unit into its own code (Art. 5.1).
  const inquirySchema = useMemo(() => schemaForSandbox(selectedSimId), [selectedSimId]);
  const sandboxTitles = useMemo(
    () => Object.fromEntries(Object.values(SIMULATION_CATALOG).map((sim) => [sim.id, sim.title])),
    [],
  );

  // Below 1024 px the panels open as drawers over the apparatus, so they start closed and a phone
  // shows the apparatus first.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsLeftCollapsed(true);
      setIsRightCollapsed(true);
    }
  }, []);

  // Global keyboard shortcuts: Space toggles Play/Pause; Escape closes Lab Index; H toggles Zen View
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Escape' && isInquiryLogOpen) {
        e.preventDefault();
        setIsInquiryLogOpen(false);
        return;
      }

      if (e.code === 'Escape' && isIndexOpen) {
        e.preventDefault();
        onCloseIndex();
        return;
      }

      if (e.code === 'Space' && !isIndexOpen && !isTutorOpen && !isNotebookOpen && !isInquiryLogOpen) {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      if (
        (e.code === 'KeyH' || e.code === 'KeyZ') &&
        !isIndexOpen &&
        !isTutorOpen &&
        !isNotebookOpen &&
        !isInquiryLogOpen
      ) {
        e.preventDefault();
        setIsLeftCollapsed((prev) => !prev);
        setIsRightCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIndexOpen, isTutorOpen, isNotebookOpen, isInquiryLogOpen, togglePlayPause]);

  // Mount Antigravity Developer Bridge on localhost (window.__AGENTUTO_SIM__); dev builds only
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as any).__AGENTUTO_SIM__ = {
      getActiveId: () => selectedSimId,
      getEngine: () => engine,
      getRenderer: () => renderer,
      getRecorder: () => recorder,
      injectParameters: (newParams: Record<string, number>) => {
        batchUpdateParameters(newParams);
      },
      triggerExportCSV: () => {
        return formatTelemetryToCSV(recorder.getBuffer(), {
          experimentTitle: simRegistration.title,
          parameters: params,
        });
      },
    };

    return () => {
      delete (window as any).__AGENTUTO_SIM__;
    };
  }, [engine, renderer, recorder, params, batchUpdateParameters, selectedSimId, simRegistration]);

  // Gemini Socratic Tutor Hook
  const {
    apiKey,
    hasApiKey,
    saveApiKey,
    messages,
    isLoading: isTutorLoading,
    error: tutorError,
    sendMessage: sendTutorMessage,
    clearChat: clearTutorChat,
  } = useAITutor();

  // Dynamic fresh telemetry compiler (evaluates live at the moment of asking the tutor)
  const getFreshTelemetryContext = (): SimulationTelemetryContext => {
    const summary = recorder.getSummary();
    const liveSnapshot = engine.getTelemetrySnapshot();

    const latestValues =
      summary.sample_count > 0 ? summary.latest_values : (liveSnapshot as Record<string, number>);

    return {
      concept_id: simRegistration.id,
      concept_title: simRegistration.title,
      governing_ode: simRegistration.governingODE,
      active_parameters: params,
      telemetry_summary: {
        ...summary,
        latest_values: latestValues,
      },
    };
  };

  const handleSendTutorMessage = (text: string) => {
    const freshContext = getFreshTelemetryContext();
    sendTutorMessage(text, freshContext);
  };

  const handleApplyPreset = (sandboxId: string, presetParams: Record<string, number>) => {
    if (sandboxId !== selectedSimId && SIMULATION_CATALOG[sandboxId]) {
      pendingPresetRef.current = presetParams;
      onOpenSandbox(sandboxId as SimulationId);
    } else {
      const merged = { ...simRegistration.defaultParams, ...presetParams };
      batchUpdateParameters(merged);
      resetSimulation(merged);
    }
  };

  const handleExportCSV = () => {
    const buffer = recorder.getBuffer();
    if (buffer.length === 0) return;

    const csvContent = formatTelemetryToCSV(buffer, {
      experimentTitle: simRegistration.title,
      parameters: params,
      notes: 'Generated via Agentuto empirical sandbox',
    });

    triggerCSVDownload(
      `agentuto_${simRegistration.id}_${Date.now()}.csv`,
      csvContent
    );
  };

  useEffect(() => {
    const previous = document.title;
    document.title = `${simRegistration.title} · Agentuto`;
    return () => {
      document.title = previous;
    };
  }, [simRegistration.title]);

  const totalSandboxCount = Object.keys(SIMULATION_CATALOG).length;
  const parentCourse = coursesOfSandbox(selectedSimId)[0];
  const allCollapsed = isLeftCollapsed && isRightCollapsed;

  const headerButton =
    'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-ink hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer';
  const toggleButton = (on: boolean) => `${headerButton} ${on ? 'bg-accent-soft' : ''}`;

  return (
    <main
      data-theme="dark"
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-paper font-sans text-ink select-none"
    >
      <DockLayout
        isLeftCollapsed={isLeftCollapsed}
        isRightCollapsed={isRightCollapsed}
        header={
          <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-card px-4 py-2">
            <a
              href={parentCourse ? `#/course/${encodeURIComponent(parentCourse.id)}` : '#/'}
              className="inline-flex min-h-11 max-w-44 items-center gap-1 truncate text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only sm:truncate">{parentCourse ? parentCourse.title : 'Courses'}</span>
            </a>
            <h1
              className="order-last w-full truncate font-display text-lg font-medium tracking-tight sm:order-none sm:w-auto sm:max-w-[18rem]"
              title={simRegistration.title}
            >
              {simRegistration.title}
            </h1>
            <span className="hidden rounded-md border border-line px-2 py-0.5 font-mono text-[13px] text-muted sm:inline">
              {simRegistration.mode}
            </span>
            {simRegistration.local && <LocalBadge />}
            <span className="hidden font-mono text-sm text-muted 2xl:inline">{simRegistration.formattedODE}</span>

            <span className="flex-1" />

            <div className="hidden w-52 lg:block">
              <SiteSearch />
            </div>
            <div className="hidden items-center gap-4 lg:flex">
              <a href="#/instruments" className={headerButton} title={`All ${totalSandboxCount} instruments`}>
                Instruments
              </a>
              <a href="#/guide" className={headerButton}>
                Guide
              </a>
              <button type="button" onClick={() => setIsSchedulerOpen(true)} className={headerButton}>
                Planner
              </button>
              <a
                href={feedbackUrl(simRegistration.id)}
                target="_blank"
                rel="noreferrer"
                data-community="feedback"
                title="Report a problem with this instrument (opens GitHub)"
                className={headerButton}
              >
                Feedback
              </a>
              <a href={COMMUNITY.discussions} target="_blank" rel="noreferrer" data-community="discuss" className={headerButton}>
                Discuss
              </a>
            </div>
            <details className="relative lg:hidden">
              <summary
                aria-label="More: instruments, guide, planner, feedback, discussions"
                className={`${headerButton} list-none [&::-webkit-details-marker]:hidden`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-full z-30 mt-2 flex w-48 flex-col gap-1 rounded-xl border border-line bg-card p-2 shadow-xl">
                <a href="#/instruments" className={`${headerButton} justify-start border-0`}>
                  Instruments
                </a>
                <a href="#/guide" className={`${headerButton} justify-start border-0`}>
                  Guide
                </a>
                <button
                  type="button"
                  onClick={(event) => {
                    (event.currentTarget.closest('details') as HTMLDetailsElement).open = false;
                    setIsSchedulerOpen(true);
                  }}
                  className={`${headerButton} justify-start border-0`}
                >
                  Planner
                </button>
                <a href={feedbackUrl(simRegistration.id)} target="_blank" rel="noreferrer" className={`${headerButton} justify-start border-0`}>
                  Feedback
                </a>
                <a href={COMMUNITY.discussions} target="_blank" rel="noreferrer" className={`${headerButton} justify-start border-0`}>
                  Discuss
                </a>
              </div>
            </details>
            <span className="flex items-center gap-1.5" role="group" aria-label="Panels">
              <button
                type="button"
                aria-pressed={!isLeftCollapsed}
                onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
                className={toggleButton(!isLeftCollapsed)}
                title="Parameters and roadmap"
              >
                <Sliders className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Controls</span>
              </button>
              <button
                type="button"
                aria-pressed={!isRightCollapsed}
                onClick={() => setIsRightCollapsed(!isRightCollapsed)}
                className={toggleButton(!isRightCollapsed)}
                title="Telemetry and lab protocol"
              >
                <Activity className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Telemetry</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLeftCollapsed(!allCollapsed);
                  setIsRightCollapsed(!allCollapsed);
                }}
                className={headerButton}
                title="Show only the apparatus (H)"
              >
                {allCollapsed ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                <span className="sr-only">{allCollapsed ? 'Show panels' : 'Focus'}</span>
              </button>
            </span>
          </header>
        }
        viewport={
          <ViewportContainer
            key={selectedSimId}
            renderer={renderer}
            fallback={
              <UnavailableViewport
                sandboxTitle={simRegistration.title}
                reason={
                  rendererFailure.current === 'webgl-unavailable'
                    ? 'This browser could not create a WebGL context, so the 3D view cannot start. Hardware acceleration may be switched off, or the graphics driver may be blocking it.'
                    : `The renderer failed to start: ${rendererFailure.current ?? 'unknown error'}.`
                }
                alternatives={Object.values(SIMULATION_CATALOG)
                  .filter((sim) => sim.mode !== '3D' && sim.id !== selectedSimId)
                  .slice(0, 4)
                  .map((sim) => ({ id: sim.id, title: sim.title }))}
                onSelectSandbox={(id) => onOpenSandbox(id as SimulationId)}
              />
            }
          />
        }
        leftDock={
          <>
            <div role="tablist" aria-label="Left panel" className="flex rounded-xl border border-line bg-card p-1 text-sm font-medium">
              {([
                ['controls', 'Parameters'],
                ['roadmap', 'Roadmap'],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeLeftTab === tab}
                  onClick={() => setActiveLeftTab(tab)}
                  className={`min-h-10 flex-1 cursor-pointer rounded-lg px-2 text-center focus-visible:outline-2 focus-visible:outline-accent ${
                    activeLeftTab === tab ? 'bg-accent-soft font-semibold text-ink' : 'text-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeLeftTab === 'controls' ? (
              <ParameterDeck
                key={selectedSimId}
                title={`${simRegistration.mode} Control Deck`}
                descriptors={simRegistration.paramDescriptors}
                values={params}
                onChange={(key, val) => updateParameter(key, val)}
                onReset={() => {
                  batchUpdateParameters(simRegistration.defaultParams);
                  resetSimulation();
                }}
              />
            ) : (
              <RoadmapDeck
                currentSandboxId={selectedSimId}
                hasApiKey={hasApiKey}
                apiKey={apiKey}
                onSelectSandbox={(id) => onOpenSandbox(id as SimulationId)}
                onApplyPreset={handleApplyPreset}
              />
            )}
          </>
        }
        rightDock={
          <>
            <LiveTelemetryCard sandboxId={selectedSimId} state={liveState} />

            {/* Per-sandbox lab protocol: three steps from the instrument guide */}
            <GlassPanel subtle className="flex w-full flex-col gap-2 p-3.5 text-sm text-muted">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Lab protocol
                </h2>
                <a href="#/guide" className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-2">
                  Guide
                </a>
              </div>
              {labGuide ? (
                <ol className="list-inside list-decimal space-y-1.5 leading-relaxed">
                  {labGuide.labProtocol.map((step, idx) => (
                    <li key={idx}>
                      <span className="text-ink">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="leading-relaxed">
                  1. Vary parameters to observe physical and phase responses.
                  <br />
                  2. Click <strong className="text-ink">Record</strong> to buffer 50 Hz telemetry.
                  <br />
                  3. Open <strong className="text-ink">Lab Fit</strong> or <strong className="text-ink">Export CSV</strong>.
                </p>
              )}
            </GlassPanel>
          </>
        }
        transport={
          <TelemetryBar
            isRunning={isRunning}
            simTime={simTime}
            speedMultiplier={speedMultiplier}
            isRecording={isRecording}
            sampleCount={sampleCount}
            isCaliperOpen={isCaliperOpen}
            isPhotogateOpen={isPhotogateOpen}
            isNotebookOpen={isNotebookOpen}
            onTogglePlay={togglePlayPause}
            onStepForward={stepForward}
            onReset={resetSimulation}
            onSetSpeed={setSpeedMultiplier}
            onToggleRecording={toggleRecording}
            onExportCSV={handleExportCSV}
            onToggleCaliper={() => setIsCaliperOpen(!isCaliperOpen)}
            onTogglePhotogate={() => setIsPhotogateOpen(!isPhotogateOpen)}
            onToggleNotebook={() => setIsNotebookOpen(!isNotebookOpen)}
            isInquiryLogOpen={isInquiryLogOpen}
            onToggleInquiryLog={() => setIsInquiryLogOpen(!isInquiryLogOpen)}
          />
        }
      />

      {/* 3. In-App Socratic AI Tutor Drawer (BYOK Gemini) */}
      <SocraticDrawer
        isOpen={isTutorOpen}
        onToggle={() => setIsTutorOpen(!isTutorOpen)}
        messages={messages}
        isLoading={isTutorLoading}
        error={tutorError}
        hasApiKey={hasApiKey}
        onSaveApiKey={saveApiKey}
        onSendMessage={handleSendTutorMessage}
        onClearChat={clearTutorChat}
        quickPrompts={labGuide?.quickPrompts ?? []}
      />

      {/* 4. Empirical Lab Notebook & Regression Curve Fitter */}
      <LabNotebookDrawer
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        buffer={recorder.getBuffer()}
        simTitle={simRegistration.title}
        onExportCSV={handleExportCSV}
      />

      {/* 4b. Inquiry Log — prediction, conditions, measurement, conclusion; exportable. Keyed per
          sandbox so an unfinished draft never carries another sandbox's conditions, and keyed with a
          distinct string because sibling keys must be unique in this tree (ViewportContainer already
          uses the bare sandbox id). */}
      <InquiryLogDrawer
        key={`inquiry-log-${selectedSimId}`}
        isOpen={isInquiryLogOpen}
        onClose={() => setIsInquiryLogOpen(false)}
        journal={inquiryJournal.journal}
        persistent={inquiryJournal.persistent}
        sandboxId={selectedSimId}
        sandboxTitle={simRegistration.title}
        schema={inquirySchema}
        parameters={params}
        sandboxTitles={sandboxTitles}
      />

      {/* 5. Virtual Lab Measurement Instruments (Caliper & Photogate) */}
      <VirtualCaliper
        isOpen={isCaliperOpen}
        onClose={() => setIsCaliperOpen(false)}
      />

      <VirtualPhotogate
        isOpen={isPhotogateOpen}
        onClose={() => setIsPhotogateOpen(false)}
        currentSimTime={simTime}
        currentPos={
          selectedSimId === 'harmonic-oscillator' || selectedSimId === 'projectile-drag' || selectedSimId === 'doppler-shift'
            ? (liveState?.x ?? liveState?.sourceX ?? 0)
            : selectedSimId === 'photoelectric-effect'
            ? (liveState?.photocurrentMicroAmps ?? 0)
            : selectedSimId === 'carnot-cycle'
            ? (liveState?.volumeLiters ?? 0)
            : selectedSimId === 'gauss-flux'
            ? (liveState?.enclosedChargeNc ?? 0)
            : selectedSimId === 'conservation-momentum'
            ? (liveState?.body1?.x ?? 0)
            : selectedSimId === 'rc-rl-circuits'
            ? (liveState?.componentVoltage ?? 0)
            : selectedSimId === 'lcr-circuit'
            ? ((liveState?.charge ?? 0) * 1e6)
            : selectedSimId === 'standing-waves'
            ? ((liveState?.stringY?.[Math.floor((liveState?.stringY?.length || 1) / 2)] ?? 0) * 100)
            : selectedSimId === 'faraday-induction'
            ? (liveState?.z ?? 0)
            : selectedSimId === 'lorenz-attractor'
            ? (liveState?.pos1?.x ?? 0)
            : (liveState?.pos?.x ?? 0)
        }
        currentSpeed={
          selectedSimId === 'harmonic-oscillator'
            ? Math.abs(liveState?.v ?? 0)
            : selectedSimId === 'lcr-circuit'
            ? Math.abs(liveState?.current ?? 0)
            : selectedSimId === 'standing-waves'
            ? (liveState?.waveSpeed ?? 0)
            : selectedSimId === 'doppler-shift'
            ? Math.abs(params?.sourceSpeed ?? 0)
            : selectedSimId === 'photoelectric-effect'
            ? (liveState?.maxElectronSpeedMps ?? 0)
            : selectedSimId === 'carnot-cycle'
            ? (liveState?.pressureAtm ?? 0)
            : selectedSimId === 'gauss-flux'
            ? (liveState?.numericalFlux ?? 0)
            : selectedSimId === 'conservation-momentum'
            ? Math.hypot(liveState?.body1?.vx ?? 0, liveState?.body1?.vy ?? 0)
            : selectedSimId === 'rc-rl-circuits'
            ? (liveState?.currentMilliAmps ?? 0)
            : selectedSimId === 'faraday-induction'
            ? Math.abs(liveState?.vz ?? 0)
            : (liveState?.speed ?? 0)
        }
      />

      {/* 7. Local-First Study Planner & Google Calendar Checkpoints */}
      <StudySchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        onSelectSandbox={(id) => onOpenSandbox(id as SimulationId)}
      />
    </main>
  );
};

export default SandboxWorkspace;
