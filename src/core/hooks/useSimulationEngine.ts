import { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationEngine, ViewportRenderer, SimulationState } from '../types/simulation';
import { TelemetryRecorder } from '../telemetry/TelemetryRecorder';

export interface UseSimulationEngineOptions<TParams, TState extends SimulationState> {
  engine: SimulationEngine<TParams, TState>;
  renderer?: ViewportRenderer<TState>;
  recorder?: TelemetryRecorder;
  initialParams: TParams;
  fixedDeltaTime?: number; // default: 0.005s (200Hz)
  maxFrameTime?: number;   // default: 0.1s (prevents death spiral on tab switch)
}

export function useSimulationEngine<TParams extends Record<string, number>, TState extends SimulationState>({
  engine,
  renderer,
  recorder,
  initialParams,
  fixedDeltaTime = 0.005,
  maxFrameTime = 0.1,
}: UseSimulationEngineOptions<TParams, TState>) {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [liveState, setLiveState] = useState<TState>(() => engine.getState());
  const [sampleCount, setSampleCount] = useState<number>(0);
  const [params, setParams] = useState<TParams>(initialParams);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Mutable refs for RAF loop
  const isRunningRef = useRef<boolean>(isRunning);
  const speedRef = useRef<number>(speedMultiplier);
  const lastTimeRef = useRef<number>(0);
  const lastStateEmitTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  isRunningRef.current = isRunning;
  speedRef.current = speedMultiplier;

  // Initialize engine on mount (and on sandbox switch, so params don't carry over from the previous engine)
  useEffect(() => {
    engine.init(initialParams);
    setParams(initialParams);
    const initState = engine.getState();
    setSimTime(initState.time);
    setLiveState(initState);
    setSampleCount(recorder ? recorder.getSampleCount() : 0);
    return () => {
      engine.dispose();
    };
  }, [engine, initialParams, recorder]);

  // Main fixed-timestep accumulator loop
  useEffect(() => {
    lastTimeRef.current = performance.now();
    lastStateEmitTimeRef.current = performance.now();

    const loop = (currentTime: number) => {
      let rawDelta = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Clamp frame delta: prevent negative timestamps and cap at maxFrameTime
      const frameDelta = Math.max(0, Math.min(rawDelta, maxFrameTime));

      if (isRunningRef.current) {
        accumulatorRef.current += frameDelta * speedRef.current;

        while (accumulatorRef.current >= fixedDeltaTime) {
          engine.step(fixedDeltaTime);

          // Record telemetry
          if (recorder && recorder.isActive()) {
            recorder.sample(engine.getTelemetrySnapshot());
          }

          accumulatorRef.current -= fixedDeltaTime;
        }

        const state = engine.getState();

        // Single unified ~30Hz React state update (batches simTime, liveState, and sampleCount)
        if (currentTime - lastStateEmitTimeRef.current >= 33) {
          setSimTime(state.time);
          setLiveState(state);
          if (recorder) {
            setSampleCount(recorder.getSampleCount());
          }
          lastStateEmitTimeRef.current = currentTime;
        }

        // Render with interpolation factor alpha
        if (renderer) {
          const alpha = accumulatorRef.current / fixedDeltaTime;
          renderer.render(state, alpha);
        }
      } else {
        // When paused, still render current state (allows orbit camera movement)
        if (renderer) {
          renderer.render(engine.getState(), 0);
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [engine, renderer, recorder, fixedDeltaTime, maxFrameTime]);

  const togglePlayPause = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const stepForward = useCallback(() => {
    setIsRunning(false);
    engine.step(fixedDeltaTime);
    if (recorder && recorder.isActive()) {
      recorder.sample(engine.getTelemetrySnapshot());
    }
    const state = engine.getState();
    setSimTime(state.time);
    setLiveState(state);
    if (recorder) {
      setSampleCount(recorder.getSampleCount());
    }
    if (renderer) {
      renderer.render(state, 1);
    }
  }, [engine, renderer, recorder, fixedDeltaTime]);

  const resetSimulation = useCallback((overrideParams?: TParams) => {
    const targetParams = overrideParams ?? engine.getParameters();
    if (overrideParams) {
      setParams(overrideParams);
    }
    engine.reset(targetParams);
    accumulatorRef.current = 0;
    if (recorder) {
      recorder.reset();
      setIsRecording(false);
      setSampleCount(0);
    }
    const state = engine.getState();
    setSimTime(state.time);
    setLiveState(state);
    if (renderer) {
      renderer.render(state, 0);
    }
  }, [engine, renderer, recorder]);

  const updateParameter = useCallback(
    (key: keyof TParams, value: number) => {
      setParams((prev) => ({ ...prev, [key]: value }));
      engine.setParameters({ [key]: value } as Partial<TParams>);
      setLiveState(engine.getState());
    },
    [engine]
  );

  const batchUpdateParameters = useCallback(
    (newParams: Partial<TParams>) => {
      setParams((prev) => ({ ...prev, ...newParams }));
      engine.setParameters(newParams);
      setLiveState(engine.getState());
    },
    [engine]
  );

  const toggleRecording = useCallback(() => {
    if (!recorder) return;
    if (recorder.isActive()) {
      recorder.pause();
      setIsRecording(false);
    } else {
      recorder.start();
      setIsRecording(true);
    }
  }, [recorder]);

  return {
    isRunning,
    simTime,
    liveState,
    sampleCount,
    params,
    speedMultiplier,
    isRecording,
    togglePlayPause,
    stepForward,
    resetSimulation,
    updateParameter,
    batchUpdateParameters,
    setSpeedMultiplier,
    toggleRecording,
  };
}
