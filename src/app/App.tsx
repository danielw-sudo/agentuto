import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Atom, BookOpen, Calendar, ExternalLink, Eye, EyeOff, Grid, Layers, Sparkles } from 'lucide-react';
import { ViewportContainer } from './layout/ViewportContainer';
import { OverlayLayout } from './layout/OverlayLayout';
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
import { LabIndexView } from '../ui/components/LabIndexView';
import { UnavailableViewport } from '../ui/components/UnavailableViewport';
import { StudySchedulerModal } from '../ui/components/StudySchedulerModal';
import { useAITutor } from '../ai/hooks/useAITutor';
import { SimulationTelemetryContext } from '../ai/types';

import { SIMULATION_CATALOG, SimulationId } from '../simulations';
import { SANDBOX_LAB_GUIDES } from '../simulations/sandboxGuides';
import { TelemetryRecorder } from '../core/telemetry/TelemetryRecorder';
import { formatTelemetryToCSV, triggerCSVDownload } from '../core/telemetry/csvExporter';
import { useSimulationEngine } from '../core/hooks/useSimulationEngine';
import { isWebGLAvailable } from '../core/graphics/webgl';
import { chooseInitialSandbox, sandboxNeedsWebGL } from '../core/graphics/sandboxChoice';

export const App: React.FC = () => {
  // Probed once per load. Twelve of the seventeen sandboxes draw to a 2D canvas and need no GPU,
  // so a machine without WebGL should still land on something that runs.
  const webglAvailable = useMemo(() => isWebGLAvailable(), []);
  const [selectedSimId, setSelectedSimId] = useState<SimulationId>(
    () => chooseInitialSandbox(SIMULATION_CATALOG, isWebGLAvailable(), 'lorentz-force') as SimulationId,
  );
  const [activeLeftTab, setActiveLeftTab] = useState<'controls' | 'roadmap'>('controls');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isIndexOpen, setIsIndexOpen] = useState<boolean>(true);
  const [indexTab, setIndexTab] = useState<'catalog' | 'guide'>('catalog');
  const pendingPresetRef = useRef<Record<string, number> | null>(null);
  const simRegistration = SIMULATION_CATALOG[selectedSimId];
  const labGuide = SANDBOX_LAB_GUIDES[selectedSimId];

  // Re-instantiate engine, renderer, and recorder when simulation changes
  const engine = useMemo(() => simRegistration.createEngine(), [selectedSimId]);
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
      return simRegistration.createRenderer();
    } catch (error) {
      rendererFailure.current = error instanceof Error ? error.message : 'renderer failed to start';
      return undefined;
    }
  }, [selectedSimId, simRegistration, webglAvailable]);
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

  // Responsive adaptation: collapse right panel initially on mobile/tablet viewports (< 1024px)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
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
        setIsIndexOpen(false);
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
      setSelectedSimId(sandboxId as SimulationId);
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

  const totalSandboxCount = Object.keys(SIMULATION_CATALOG).length;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none">
      {/* 1. Full-Bleed Viewport Canvas (3D WebGL or 2D Canvas) */}
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
            onSelectSandbox={(id) => setSelectedSimId(id as SimulationId)}
          />
        }
      />

      {/* 2. Glassmorphism Floating Overlay HUD */}
      <OverlayLayout
        isLeftCollapsed={isLeftCollapsed}
        isRightCollapsed={isRightCollapsed}
        onToggleLeft={() => setIsLeftCollapsed(!isLeftCollapsed)}
        onToggleRight={() => setIsRightCollapsed(!isRightCollapsed)}
        header={
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-3 pointer-events-none">
            {/* Title & Curriculum Selector */}
            <GlassPanel className="px-5 py-3 flex items-center gap-3.5 shadow-2xl">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Atom className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-semibold tracking-wide text-neutral-100">
                    {simRegistration.title}
                  </h1>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                    Aligned with {simRegistration.curriculum}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    {simRegistration.mode}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  ODE: <span className="font-mono text-indigo-300 font-medium">{simRegistration.formattedODE}</span>
                </p>
              </div>
            </GlassPanel>

            {/* Sandbox Catalog Switcher, Lab Index, User Guide & Platform Brand */}
            <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
              <GlassPanel subtle className="px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg">
                <button
                  onClick={() => {
                    setIndexTab('catalog');
                    setIsIndexOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Open Laboratory Module Index"
                >
                  <Grid className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lab Index ({totalSandboxCount})</span>
                </button>
                <button
                  onClick={() => {
                    setIndexTab('guide');
                    setIsIndexOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Open Laboratory User Guide"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>User Guide</span>
                </button>
                <button
                  onClick={() => setIsSchedulerOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Open Study Planner & Google Calendar Checkpoints"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Planner</span>
                </button>
                <button
                  onClick={() => {
                    const next = !(isLeftCollapsed && isRightCollapsed);
                    setIsLeftCollapsed(next);
                    setIsRightCollapsed(next);
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    isLeftCollapsed && isRightCollapsed
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                      : 'bg-neutral-800/80 hover:bg-neutral-800 border-neutral-700/60 text-neutral-300'
                  }`}
                  title="Toggle Full Viewport Zen Mode (H)"
                >
                  {isLeftCollapsed && isRightCollapsed ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Show HUD</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="hidden sm:inline">Zen View</span>
                    </>
                  )}
                </button>
              </GlassPanel>

              <GlassPanel subtle className="px-3 py-1.5 flex items-center gap-2 shadow-lg">
                <Layers className="w-4 h-4 text-indigo-400" />
                <select
                  value={selectedSimId}
                  onChange={(e) => setSelectedSimId(e.target.value as SimulationId)}
                  aria-label="Select active simulation sandbox"
                  className="bg-transparent text-xs text-neutral-200 font-medium focus:outline-none cursor-pointer"
                >
                  {Object.values(SIMULATION_CATALOG).map((sim) => (
                    <option key={sim.id} value={sim.id} className="bg-neutral-900 text-neutral-200">
                      [{sim.mode}] {sim.title}
                    </option>
                  ))}
                </select>
              </GlassPanel>

              <GlassPanel subtle className="px-3.5 py-2 flex items-center gap-2 shadow-lg">
                <span className="text-xs font-semibold text-neutral-200">
                  Agentuto <span className="text-[10px] text-indigo-400 font-mono">v0.1</span>
                </span>
                <a
                  href="https://github.com/danielw-sudo/agentuto"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-500 hover:text-neutral-300 ml-1 cursor-pointer"
                  title="Agentuto Open-Source Repository"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </GlassPanel>
            </div>
          </header>
        }
        leftPanel={
          <div className="flex flex-col gap-2 pointer-events-auto">
            {/* Tab Toggle: Controls vs Roadmap */}
            <div className="flex bg-neutral-900/60 p-1 rounded-xl border border-neutral-800 text-xs w-80 font-medium">
              <button
                onClick={() => setActiveLeftTab('controls')}
                className={`flex-1 py-1 rounded-lg text-center cursor-pointer transition-colors ${
                  activeLeftTab === 'controls'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sliders & Fields
              </button>
              <button
                onClick={() => setActiveLeftTab('roadmap')}
                className={`flex-1 py-1 rounded-lg text-center cursor-pointer transition-colors ${
                  activeLeftTab === 'roadmap'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Curriculum Roadmap
              </button>
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
                onSelectSandbox={(id) => setSelectedSimId(id as SimulationId)}
                onApplyPreset={handleApplyPreset}
              />
            )}
          </div>
        }
        rightPanel={
          <div className="flex flex-col gap-3 pointer-events-auto">
            <LiveTelemetryCard sandboxId={selectedSimId} state={liveState} />

            {/* Per-Sandbox Empirical Lab Protocol Callout */}
            <GlassPanel subtle className="w-64 p-3.5 text-xs text-neutral-400 flex flex-col gap-2 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-neutral-200 font-medium flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Empirical Lab Protocol
                </span>
                <button
                  onClick={() => {
                    setIndexTab('guide');
                    setIsIndexOpen(true);
                  }}
                  className="text-xs font-mono text-indigo-300 hover:text-indigo-200 underline underline-offset-2 cursor-pointer"
                >
                  Manual →
                </button>
              </div>
              {labGuide ? (
                <ol className="text-xs leading-relaxed text-neutral-300 space-y-1 list-decimal list-inside">
                  {labGuide.labProtocol.map((step, idx) => (
                    <li key={idx} className="text-neutral-400">
                      <span className="text-neutral-300">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs leading-relaxed text-neutral-400">
                  1. Vary parameters to observe physical and phase responses.<br />
                  2. Click <strong className="text-rose-400">Record</strong> to buffer 50 Hz telemetry.<br />
                  3. Open <strong className="text-indigo-300">Lab Fit</strong> or <strong className="text-sky-300">Export CSV</strong>.
                </p>
              )}
            </GlassPanel>
          </div>
        }
        bottomBar={
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

      {/* 6. Scholarly Non-SaaS Laboratory Module Index & User Guide */}
      <LabIndexView
        isOpen={isIndexOpen}
        webglAvailable={webglAvailable}
        activeTab={indexTab}
        currentSandboxId={selectedSimId}
        onTabChange={setIndexTab}
        onSelectSandbox={(id) => {
          setSelectedSimId(id);
          setIsIndexOpen(false);
        }}
        onClose={() => setIsIndexOpen(false)}
      />

      {/* 7. Local-First Study Planner & Google Calendar Checkpoints */}
      <StudySchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        onSelectSandbox={(id) => setSelectedSimId(id)}
      />
    </main>
  );
};

export default App;
