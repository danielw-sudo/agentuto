import type { SimulationEngine } from '../core/types/simulation';
import type { SimulationRegistration } from './index';
import { describeProblem } from './local';

/**
 * The module checker (roadmap R2c): run a module's engine and say, in plain sentences, what is wrong.
 *
 * Pure on purpose, with no file access and no browser, so `npm test` can drive it with deliberately broken
 * engines and so `npm run check:module` is a thin wrapper around it.
 *
 * What it can establish: the manifest is well formed, the engine honours the contract the app relies on, every
 * channel it reports is declared with a unit and the other way round, numbers stay finite across the whole range
 * of every slider, the same inputs give the same outputs, every slider reaches the engine, and, when the author
 * supplies a worked result (`benchmark`), the engine reproduces it. What it cannot establish is that the physics
 * is right. A benchmark is only as good as the calculation behind it, so write it by hand, not from the engine.
 */
export type CheckStatus = 'pass' | 'fail' | 'warn';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface CheckOptions {
  /** The folder the module sits in; its id must equal it. */
  folder: string;
  /** Whether an id already belongs to an upstream instrument. */
  taken: (id: string) => boolean;
  /** Fixed time step in seconds. The app steps engines at 200 Hz. */
  dt?: number;
}

const STEPS_DEFAULT = 2000;
const STEPS_EXTREME = 1000;
const STEPS_EFFECT = 400;

const ENGINE_METHODS = ['init', 'reset', 'dispose', 'step', 'getState', 'setParameters', 'getParameters', 'getTelemetrySnapshot'] as const;
const RENDERER_METHODS = ['mount', 'render', 'resize', 'unmount'] as const;

type Engine = SimulationEngine<Record<string, number>>;

function numericChannels(snapshot: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (key !== 't' && typeof value === 'number') out[key] = value;
  }
  return out;
}

function nonFinite(snapshot: Record<string, unknown>): string[] {
  return Object.entries(snapshot)
    .filter(([, value]) => typeof value === 'number' && !Number.isFinite(value))
    .map(([key]) => key);
}

function runSteps(engine: Engine, steps: number, dt: number): void {
  for (let i = 0; i < steps; i++) engine.step(dt);
}

function sameNumbers(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const differing: string[] = [];
  for (const key of keys) {
    const x = a[key];
    const y = b[key];
    if (typeof x === 'number' && typeof y === 'number') {
      if (!(x === y || (Number.isNaN(x) && Number.isNaN(y)))) differing.push(key);
    }
  }
  return differing;
}

export async function checkModule(manifest: SimulationRegistration, options: CheckOptions): Promise<CheckResult[]> {
  const dt = options.dt ?? 0.005;
  const results: CheckResult[] = [];
  const add = (name: string, status: CheckStatus, detail: string) => results.push({ name, status, detail });

  // 1. The manifest
  const problem = describeProblem(manifest, options.folder, options.taken);
  if (problem) {
    add('Manifest', 'fail', problem);
    return results; // nothing below makes sense without a usable manifest
  }
  add('Manifest', 'pass', 'every required field is present and in range');

  // 2. The engine and renderer load, and the engine runs without a browser
  let engine: Engine;
  let createEngine: () => Engine;
  let createRenderer: () => unknown;
  try {
    const runtime = await manifest.load();
    createEngine = runtime.createEngine as () => Engine;
    createRenderer = runtime.createRenderer as () => unknown;
    if (typeof createEngine !== 'function' || typeof createRenderer !== 'function') {
      throw new Error('load() must resolve to { createEngine, createRenderer }, both functions');
    }
    engine = createEngine();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const dom = /\b(window|document|navigator|HTMLElement|canvas)\b/i.test(message);
    add(
      'Engine loads',
      'fail',
      `${message}${dom ? ' (the engine must be plain TypeScript with no DOM, React or Three.js; keep all drawing in the renderer)' : ''}`,
    );
    return results;
  }
  add('Engine loads', 'pass', 'created without a browser');

  // 3. The contract
  const missing = ENGINE_METHODS.filter((m) => typeof (engine as unknown as Record<string, unknown>)[m] !== 'function');
  if (missing.length > 0) {
    add('Engine contract', 'fail', `the engine has no ${missing.map((m) => `${m}()`).join(', ')}`);
    return results;
  }
  add('Engine contract', 'pass', 'all eight methods are there');

  const defaults = manifest.defaultParams as Record<string, number>;
  const declared = Object.keys(manifest.telemetryUnits).sort();

  try {
    // 4. Channels: what is declared is what is emitted, and the other way round
    engine.init({ ...defaults });
    engine.step(dt);
    const first = engine.getTelemetrySnapshot() as unknown as Record<string, unknown>;
    if (typeof first.t !== 'number') {
      add('Telemetry channels', 'fail', 'the snapshot has no numeric "t" (time in seconds)');
    } else {
      const emitted = Object.keys(numericChannels(first)).sort();
      const undeclared = emitted.filter((c) => !declared.includes(c));
      const silent = declared.filter((c) => !emitted.includes(c));
      if (undeclared.length > 0 || silent.length > 0) {
        add(
          'Telemetry channels',
          'fail',
          [
            undeclared.length > 0 ? `the engine reports [${undeclared.join(', ')}] but telemetryUnits does not declare ${undeclared.length === 1 ? 'it' : 'them'}` : '',
            silent.length > 0 ? `telemetryUnits declares [${silent.join(', ')}] but the engine never reports ${silent.length === 1 ? 'it' : 'them'}` : '',
          ].filter(Boolean).join('; '),
        );
      } else {
        add('Telemetry channels', 'pass', `${declared.length} channel${declared.length === 1 ? '' : 's'} declared with units, and exactly those are reported`);
      }
    }

    // 5. Time advances at the step it is given
    engine.reset({ ...defaults });
    runSteps(engine, 200, dt);
    const clock = (engine.getTelemetrySnapshot() as unknown as Record<string, unknown>).t;
    if (typeof clock !== 'number' || Math.abs(clock - 200 * dt) > 1e-9) {
      add('Clock', 'fail', `after 200 steps of ${dt} s the engine says t = ${String(clock)}, expected ${(200 * dt).toFixed(3)}`);
    } else {
      add('Clock', 'pass', 'time advances by exactly the step given');
    }

    // 6. Numbers stay finite, at the defaults and at both ends of every slider
    const bad: string[] = [];
    engine.reset({ ...defaults });
    runSteps(engine, STEPS_DEFAULT, dt);
    {
      const stuck = nonFinite(engine.getTelemetrySnapshot() as unknown as Record<string, unknown>);
      if (stuck.length > 0) bad.push(`at the default settings, ${stuck.join(', ')}`);
    }
    for (const d of manifest.paramDescriptors) {
      for (const end of [d.min, d.max]) {
        engine.reset({ ...defaults, [d.id]: end });
        runSteps(engine, STEPS_EXTREME, dt);
        const stuck = nonFinite(engine.getTelemetrySnapshot() as unknown as Record<string, unknown>);
        if (stuck.length > 0) bad.push(`with ${d.id} = ${end}, ${stuck.join(', ')}`);
      }
    }
    if (bad.length > 0) {
      add('Finite numbers', 'fail', `a value becomes NaN or infinite: ${bad.slice(0, 3).join('; ')}${bad.length > 3 ? `; and ${bad.length - 3} more` : ''}`);
    } else {
      add('Finite numbers', 'pass', `${STEPS_DEFAULT} steps at the defaults and ${STEPS_EXTREME} at both ends of ${manifest.paramDescriptors.length} slider${manifest.paramDescriptors.length === 1 ? '' : 's'}, all finite`);
    }

    // 7. The same inputs give the same outputs
    engine.reset({ ...defaults });
    runSteps(engine, 300, dt);
    const a = { ...(engine.getTelemetrySnapshot() as unknown as Record<string, unknown>) };
    engine.reset({ ...defaults });
    runSteps(engine, 300, dt);
    const b = engine.getTelemetrySnapshot() as unknown as Record<string, unknown>;
    const drift = sameNumbers(a, b);
    if (drift.length > 0) {
      add('Repeatable', 'fail', `two identical runs differ in ${drift.join(', ')}; avoid Math.random() or the clock inside the engine, or seed them`);
    } else {
      add('Repeatable', 'pass', 'two identical runs give identical numbers');
    }

    // 8. Every slider reaches the engine
    const ignored: string[] = [];
    const inert: string[] = [];
    engine.reset({ ...defaults });
    runSteps(engine, STEPS_EFFECT, dt);
    const baseline = engine.getTelemetrySnapshot() as unknown as Record<string, unknown>;
    for (const d of manifest.paramDescriptors) {
      const target = defaults[d.id] === d.max ? d.min : d.max;
      engine.reset({ ...defaults });
      engine.setParameters({ [d.id]: target });
      if (engine.getParameters()[d.id] !== target) {
        ignored.push(d.id);
        continue;
      }
      engine.reset({ ...defaults, [d.id]: target });
      runSteps(engine, STEPS_EFFECT, dt);
      const moved = sameNumbers(baseline, engine.getTelemetrySnapshot() as unknown as Record<string, unknown>);
      if (moved.length === 0) inert.push(d.id);
    }
    if (ignored.length > 0) {
      add('Sliders reach the engine', 'fail', `setParameters() did not keep ${ignored.join(', ')}: getParameters() must return what was set`);
    } else if (inert.length > 0) {
      add('Sliders reach the engine', 'warn', `moving ${inert.join(', ')} changes nothing the engine reports after ${STEPS_EFFECT} steps; if that slider should do something, the engine is not using it`);
    } else {
      add('Sliders reach the engine', 'pass', 'every slider changes what the engine reports');
    }

    // 9. A worked result, if the author gave one
    if (manifest.benchmark) {
      const bm = manifest.benchmark;
      const steps = Math.round(bm.time / dt);
      if (Math.abs(steps * dt - bm.time) > 1e-9) {
        add('Benchmark', 'fail', `benchmark.time ${bm.time} s is not a whole number of ${dt} s steps`);
      } else {
        engine.reset({ ...defaults, ...(bm.params ?? {}) });
        runSteps(engine, steps, dt);
        const state = engine.getTelemetrySnapshot() as unknown as Record<string, unknown>;
        const tolerance = bm.tolerance ?? 1e-6;
        const misses: string[] = [];
        for (const [channel, expected] of Object.entries(bm.expected)) {
          const got = state[channel];
          if (typeof got !== 'number' || Math.abs(got - expected) > tolerance * Math.max(1, Math.abs(expected))) {
            misses.push(`${channel}: engine ${typeof got === 'number' ? +got.toPrecision(8) : 'is missing'}, expected ${expected}`);
          }
        }
        if (misses.length > 0) {
          add('Benchmark', 'fail', `at t = ${bm.time} s the engine does not reproduce the worked result (${misses.join('; ')}); either the engine or the calculation is wrong`);
        } else {
          add('Benchmark', 'pass', `at t = ${bm.time} s ${Object.keys(bm.expected).join(', ')} match the worked result within ${tolerance}`);
        }
      }
    } else {
      add(
        'Benchmark',
        'warn',
        'no benchmark: nothing compares this engine with a known result. Work one out by hand and add { time, expected } to the manifest',
      );
    }
  } catch (error) {
    add('Engine runs', 'fail', `the engine threw while it was being run: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 10. Clean up, and the renderer has the shape the app expects (it is not run: that needs a browser)
  try {
    engine.dispose();
  } catch (error) {
    add('Dispose', 'fail', `dispose() threw: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    const renderer = createRenderer() as Record<string, unknown>;
    const lacking = RENDERER_METHODS.filter((m) => typeof renderer?.[m] !== 'function');
    if (lacking.length > 0) add('Renderer', 'fail', `the renderer has no ${lacking.map((m) => `${m}()`).join(', ')}`);
    else add('Renderer', 'pass', 'has mount, render, resize and unmount (drawing itself needs a browser and is not run here)');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/\b(window|document|navigator|HTMLElement)\b/i.test(message)) {
      add('Renderer', 'warn', 'could not be created outside a browser, so its shape was not checked; open the instrument in the app to see it');
    } else {
      add('Renderer', 'fail', `createRenderer() threw: ${message}`);
    }
  }

  return results;
}

export function summarise(results: CheckResult[]): { failures: number; warnings: number } {
  return {
    failures: results.filter((r) => r.status === 'fail').length,
    warnings: results.filter((r) => r.status === 'warn').length,
  };
}

export function formatResults(id: string, results: CheckResult[]): string {
  const mark = { pass: '✓', fail: '✗', warn: '!' } as const;
  const { failures, warnings } = summarise(results);
  const lines = results.map((r) => `  ${mark[r.status]} ${r.name}: ${r.detail}`);
  const verdict = failures > 0 ? `FAILED (${failures} problem${failures === 1 ? '' : 's'})` : `passed${warnings > 0 ? ` with ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}`;
  return [`${id}: ${verdict}`, ...lines].join('\n');
}
