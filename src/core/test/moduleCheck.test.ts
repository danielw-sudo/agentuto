import { SIMULATION_CATALOG } from '../../simulations';
import type { SimulationRegistration } from '../../simulations';
import { checkModule, formatResults, summarise } from '../../simulations/moduleCheck';
import type { CheckResult } from '../../simulations/moduleCheck';
import example from '../../../examples/local-module/module';
import { FreeFallEngine } from '../../../examples/local-module/FreeFallEngine';
import { FreeFallRenderer2D } from '../../../examples/local-module/FreeFallRenderer2D';

/**
 * Module-checker checks (roadmap R2c).
 *
 * A checker that has only ever seen a good module proves nothing, so this feeds it a good one and then one
 * deliberately broken module per rule, and asserts which check fails and what the sentence says. The wrong-physics
 * case matters most: an engine that runs, is finite and repeatable but integrates the wrong equation is caught only
 * by the hand-worked benchmark, which is why the example ships one.
 */
type Loose = Record<string, any>;

const FOLDER = 'free-fall';
const taken = (id: string) => Object.prototype.hasOwnProperty.call(SIMULATION_CATALOG, id);

function variant(engine: () => unknown, patch: Loose = {}, renderer: () => unknown = () => new FreeFallRenderer2D()): SimulationRegistration {
  return {
    ...(example as SimulationRegistration),
    ...patch,
    load: async () => ({ createEngine: engine as never, createRenderer: renderer as never }),
  };
}

function find(results: CheckResult[], name: string): CheckResult {
  const hit = results.find((r) => r.name === name);
  if (!hit) throw new Error(`the checker produced no "${name}" result (got ${results.map((r) => r.name).join(', ')})`);
  return hit;
}

async function expectIssue(label: string, manifest: SimulationRegistration, name: string, status: 'fail' | 'warn', mentions: string[]) {
  const results = await checkModule(manifest, { folder: FOLDER, taken });
  const hit = find(results, name);
  if (hit.status !== status) throw new Error(`${label}: "${name}" was ${hit.status} (${hit.detail}), expected ${status}`);
  for (const word of mentions) {
    if (!hit.detail.includes(word)) throw new Error(`${label}: the sentence "${hit.detail}" does not mention "${word}"`);
  }
}

export async function runModuleCheckVerification(): Promise<void> {
  // 1. The shipped example passes everything, with no warnings.
  const good = await checkModule(example as SimulationRegistration, { folder: FOLDER, taken });
  const goodSummary = summarise(good);
  if (goodSummary.failures > 0 || goodSummary.warnings > 0) {
    throw new Error(`the shipped example does not pass cleanly:\n${formatResults('example', good)}`);
  }
  for (const name of ['Manifest', 'Engine loads', 'Engine contract', 'Telemetry channels', 'Clock', 'Finite numbers', 'Repeatable', 'Sliders reach the engine', 'Benchmark', 'Renderer']) {
    if (find(good, name).status !== 'pass') throw new Error(`the example's "${name}" did not pass`);
  }

  // 2. One broken module per rule.
  class Undeclared extends FreeFallEngine {
    getTelemetrySnapshot() {
      return { ...super.getTelemetrySnapshot(), extra: 1 };
    }
  }
  await expectIssue('a channel the manifest does not declare', variant(() => new Undeclared()), 'Telemetry channels', 'fail', ['extra', 'does not declare']);
  await expectIssue(
    'a declared channel that is never reported',
    variant(() => new FreeFallEngine(), { telemetryUnits: { height: 'm', velocity: 'm/s', energy: 'J' } }),
    'Telemetry channels', 'fail', ['energy', 'never reports'],
  );

  class Blows extends FreeFallEngine {
    step(dt: number) {
      super.step(dt);
      if (this.getParameters().gravity >= 25) (this as Loose).height = Number.NaN;
    }
  }
  await expectIssue('a number that turns to NaN at the end of a slider', variant(() => new Blows()), 'Finite numbers', 'fail', ['gravity = 25', 'height']);

  class Deaf extends FreeFallEngine {
    setParameters() {}
  }
  await expectIssue('setParameters that keeps nothing', variant(() => new Deaf()), 'Sliders reach the engine', 'fail', ['initialHeight', 'getParameters']);

  await expectIssue(
    'a slider the engine never uses',
    variant(() => new FreeFallEngine(), {
      defaultParams: { initialHeight: 20, initialSpeed: 5, gravity: 9.81, mass: 1 },
      paramDescriptors: [
        ...(example as SimulationRegistration).paramDescriptors,
        { id: 'mass', label: 'Mass', unit: 'kg', min: 0.1, max: 10, step: 0.1, defaultValue: 1 },
      ],
    }),
    'Sliders reach the engine', 'warn', ['mass', 'changes nothing'],
  );

  class Jitter extends FreeFallEngine {
    step(dt: number) {
      super.step(dt);
      (this as Loose).height += Math.random() * 1e-6;
    }
  }
  await expectIssue('an engine that uses Math.random', variant(() => new Jitter()), 'Repeatable', 'fail', ['height', 'Math.random']);

  class SlowClock extends FreeFallEngine {
    step(dt: number) {
      super.step(dt * 2);
    }
  }
  await expectIssue('a clock that does not follow the step', variant(() => new SlowClock()), 'Clock', 'fail', ['200 steps']);

  // The case the benchmark exists for: it runs, it is finite, it repeats, and it integrates the wrong equation.
  class WrongPhysics extends FreeFallEngine {
    step(dt: number) {
      super.setParameters({ gravity: 9.81 * 1.001 });
      super.step(dt);
    }
  }
  await expectIssue('physics that is slightly wrong', variant(() => new WrongPhysics()), 'Benchmark', 'fail', ['height', 'does not reproduce']);
  const wrongSummary = summarise(await checkModule(variant(() => new WrongPhysics()), { folder: FOLDER, taken }));
  if (wrongSummary.failures !== 1) throw new Error(`the slightly wrong engine should fail only the benchmark, but ${wrongSummary.failures} checks failed`);

  await expectIssue(
    'a worked result that is itself wrong',
    variant(() => new FreeFallEngine(), { benchmark: { time: 2, expected: { height: 99, velocity: -14.62 } } }),
    'Benchmark', 'fail', ['height', 'expected 99'],
  );
  await expectIssue(
    'a benchmark time that is not a whole number of steps',
    variant(() => new FreeFallEngine(), { benchmark: { time: 2.0003, expected: { height: 10.38 } } }),
    'Benchmark', 'fail', ['whole number'],
  );
  const noBenchmark = variant(() => new FreeFallEngine());
  delete (noBenchmark as Loose).benchmark;
  await expectIssue('no benchmark', noBenchmark, 'Benchmark', 'warn', ['no benchmark']);

  const domEngine = { ...variant(() => new FreeFallEngine()), load: async () => { throw new ReferenceError('document is not defined'); } } as SimulationRegistration;
  await expectIssue('an engine that touches the DOM', domEngine, 'Engine loads', 'fail', ['document is not defined', 'no DOM']);

  class Throws extends FreeFallEngine {
    step(): void {
      throw new Error('boom');
    }
  }
  await expectIssue('an engine that throws', variant(() => new Throws()), 'Engine runs', 'fail', ['boom']);

  const missingMethod = variant(() => {
    const engine = new FreeFallEngine() as Loose;
    engine.getState = undefined;
    return engine;
  });
  await expectIssue('an engine missing a method', missingMethod, 'Engine contract', 'fail', ['getState']);

  await expectIssue('a renderer with no methods', variant(() => new FreeFallEngine(), {}, () => ({})), 'Renderer', 'fail', ['mount', 'unmount']);

  // A bad manifest stops the checker at once, with the loader's own sentence.
  const badId = await checkModule(variant(() => new FreeFallEngine(), { id: 'other-name' }), { folder: FOLDER, taken });
  if (badId.length !== 1 || badId[0].status !== 'fail' || !badId[0].detail.includes('must match the folder')) {
    throw new Error(`a manifest problem should stop the checker with the loader's sentence, got ${JSON.stringify(badId)}`);
  }
  const loaderBenchmark = await checkModule(variant(() => new FreeFallEngine(), { benchmark: { time: 2, expected: { nope: 1 } } }), { folder: FOLDER, taken });
  if (loaderBenchmark[0].status !== 'fail' || !loaderBenchmark[0].detail.includes('not a channel declared')) {
    throw new Error(`a benchmark naming an undeclared channel should be refused by the manifest check, got ${JSON.stringify(loaderBenchmark[0])}`);
  }

  // 3. The report reads as one verdict and one line per check.
  const report = formatResults('x', await checkModule(variant(() => new WrongPhysics()), { folder: FOLDER, taken }));
  if (!report.startsWith('x: FAILED (1 problem)') || !report.includes('✗ Benchmark') || !report.includes('✓ Clock')) {
    throw new Error(`the report does not read as expected:\n${report}`);
  }

  console.log(
    `✓ Module checker verified: the shipped example passes all ${good.length} checks with no warnings, and 15 deliberately broken or incomplete modules are each caught by the check that should catch them, including an engine with 0.1% wrong gravity that only the hand-worked benchmark finds`
  );
}
