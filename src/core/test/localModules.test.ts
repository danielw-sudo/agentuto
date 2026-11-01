import { SIMULATION_CATALOG } from '../../simulations';
import type { SimulationRegistration } from '../../simulations';
import { COURSES } from '../../courses/courses';
import type { Course } from '../../courses/courses';
import { describeProblem, emptyReport, registerLocalCourses, registerLocalModules } from '../../simulations/local';
import example from '../../../examples/local-module/module';

/**
 * Private-module checks (roadmap R2b, Constitution Art. 12.4).
 *
 * What is held here: the rules a module must meet to be accepted and the sentence each refusal gives; that a
 * local module can never replace an upstream one; that the shipped example is itself valid and its physics
 * matches a closed form worked out here, not read back from the engine; and that `local/` is git-ignored and
 * nothing under it is tracked, so a learner's private work cannot reach the public repository or site.
 */
type Mutation = [label: string, mutate: (m: Record<string, unknown>) => void, expected: string];

export async function runLocalModulesVerification(): Promise<void> {
  const taken = (id: string) => Object.prototype.hasOwnProperty.call(SIMULATION_CATALOG, id);
  const copy = (): Record<string, unknown> => ({ ...(example as unknown as Record<string, unknown>) });

  // 1. The shipped example is valid, as the folder it is meant to be copied to.
  const own = describeProblem(example, 'free-fall', taken);
  if (own !== null) throw new Error(`the shipped example module is refused: ${own}`);

  // 2. Each rule refuses what it should, and says why.
  const refusals: Mutation[] = [
    ['upper-case id', (m) => { m.id = 'Free-Fall'; }, 'lower-case'],
    ['id not matching the folder', (m) => { m.id = 'other-name'; }, 'must match the folder'],
    ['missing title', (m) => { m.title = ''; }, 'title'],
    ['missing description', (m) => { delete m.description; }, 'description'],
    ['mode that does not exist', (m) => { m.mode = '4D'; }, 'mode'],
    ['no default parameters', (m) => { m.defaultParams = {}; }, 'defaultParams'],
    ['non-numeric default parameter', (m) => { m.defaultParams = { initialHeight: 'tall' }; }, 'finite number'],
    ['slider with no matching parameter', (m) => { m.defaultParams = { gravity: 9.81 }; }, 'not a key of defaultParams'],
    ['slider with min above max', (m) => {
      m.paramDescriptors = [{ id: 'gravity', label: 'g', unit: 'm/s²', min: 5, max: 1, step: 1, defaultValue: 3 }];
    }, 'min must be less than max'],
    ['slider default outside its range', (m) => {
      m.paramDescriptors = [{ id: 'gravity', label: 'g', unit: 'm/s²', min: 1, max: 25, step: 1, defaultValue: 99 }];
    }, 'between min and max'],
    ['slider with a zero step', (m) => {
      m.paramDescriptors = [{ id: 'gravity', label: 'g', unit: 'm/s²', min: 1, max: 25, step: 0, defaultValue: 9 }];
    }, 'step'],
    ['two sliders with one id', (m) => {
      const d = { id: 'gravity', label: 'g', unit: 'm/s²', min: 1, max: 25, step: 1, defaultValue: 9 };
      m.paramDescriptors = [d, d];
    }, 'appears twice'],
    ['no telemetry channels declared', (m) => { m.telemetryUnits = {}; }, 'telemetryUnits'],
    ['channel with an empty unit', (m) => { m.telemetryUnits = { height: '' }; }, 'dimensionless'],
    ['load that is not a function', (m) => { m.load = 'later'; }, 'load must be a function'],
  ];
  for (const [label, mutate, expected] of refusals) {
    const broken = copy();
    mutate(broken);
    const reason = describeProblem(broken, 'free-fall', taken);
    if (reason === null) throw new Error(`a module with ${label} was accepted`);
    if (!reason.includes(expected)) throw new Error(`${label}: the reason "${reason}" does not mention "${expected}"`);
  }
  const upstream = describeProblem({ ...copy(), id: 'lorentz-force' }, 'lorentz-force', taken);
  if (!upstream?.includes('cannot replace')) throw new Error(`a module taking an upstream id was not refused for that reason: ${upstream}`);
  for (const [label, value] of [['nothing', undefined], ['an array', []], ['text', 'hello']] as const) {
    if (describeProblem(value, 'free-fall', taken) === null) throw new Error(`a default export of ${label} was accepted`);
  }

  // 3. Registration: valid ones join (marked local), refused ones are reported, and nothing upstream moves.
  const catalog: Record<string, SimulationRegistration> = { ...SIMULATION_CATALOG };
  const upstreamBefore = JSON.stringify(Object.keys(catalog));
  const lorentzBefore = catalog['lorentz-force'];
  const report = emptyReport();
  const hijack = { ...copy(), id: 'lorentz-force', title: 'Impostor' };
  registerLocalModules(
    catalog,
    { '/local/free-fall/module.ts': example, '/local/lorentz-force/module.ts': hijack, '/local/broken/module.ts': { id: 'broken' } },
    report,
  );
  if (JSON.stringify(report.sandboxes) !== JSON.stringify(['free-fall'])) {
    throw new Error(`expected only free-fall to load, got [${report.sandboxes.join(', ')}]`);
  }
  if (report.problems.length !== 2) throw new Error(`expected 2 problems, got ${report.problems.length}`);
  if (catalog['free-fall']?.local !== true) throw new Error('a local module was not marked local');
  if (catalog['lorentz-force'] !== lorentzBefore) throw new Error('a local module replaced an upstream instrument');
  if (SIMULATION_CATALOG['free-fall'] !== undefined) throw new Error('registering touched the real catalogue');
  if (JSON.stringify(Object.keys(catalog).filter((k) => k !== 'free-fall')) !== upstreamBefore) {
    throw new Error('registering changed the upstream instruments');
  }
  if (Object.values(SIMULATION_CATALOG).some((s) => s.local)) throw new Error('an upstream instrument is marked local');

  // 4. Local courses: same form, never replace a course, may use any instrument that exists.
  const courses: Course[] = COURSES.map((c) => ({ ...c }));
  const courseReport = emptyReport();
  registerLocalCourses(
    courses,
    catalog,
    [
      { id: 'mine', title: 'My course', lead: 'Free fall, then a charge in a field.', modules: [
        { sandboxId: 'free-fall', measure: 'how long it takes to land from rest.' },
        { sandboxId: 'lorentz-force', measure: 'the cyclotron radius.' },
      ] },
      { id: '8.02', title: 'Impostor', lead: 'x', modules: [{ sandboxId: 'free-fall', measure: 'something here.' }] },
      { id: 'ghost', title: 'Ghost', lead: 'x', modules: [{ sandboxId: 'not-an-instrument', measure: 'nothing at all.' }] },
    ],
    courseReport,
  );
  if (JSON.stringify(courseReport.courses) !== JSON.stringify(['mine'])) throw new Error(`expected only "mine" to load, got [${courseReport.courses.join(', ')}]`);
  if (courseReport.problems.length !== 2) throw new Error(`expected 2 course problems, got ${courseReport.problems.length}`);
  if (courses.find((c) => c.id === 'mine')?.local !== true) throw new Error('a local course was not marked local');
  if (courses.find((c) => c.id === '8.02')?.title === 'Impostor') throw new Error('a local course replaced an upstream course');
  if (COURSES.some((c) => c.local)) throw new Error('registering a local course touched the real course list');

  // 5. The example's physics against a closed form worked out here, and its declared channels against its engine.
  const runtime = await example.load();
  const engine = runtime.createEngine();
  const params = { initialHeight: 20, initialSpeed: 5, gravity: 9.81 };
  engine.init(params);
  const steps = 400;
  const dt = 0.005;
  for (let i = 0; i < steps; i++) engine.step(dt);
  const t = steps * dt;
  const expectedHeight = params.initialHeight + params.initialSpeed * t - 0.5 * params.gravity * t * t;
  const expectedVelocity = params.initialSpeed - params.gravity * t;
  const state = engine.getState() as unknown as { height: number; velocity: number };
  if (Math.abs(state.height - expectedHeight) > 1e-9) throw new Error(`example height ${state.height} differs from the closed form ${expectedHeight}`);
  if (Math.abs(state.velocity - expectedVelocity) > 1e-9) throw new Error(`example velocity ${state.velocity} differs from the closed form ${expectedVelocity}`);
  const emitted = Object.keys(engine.getTelemetrySnapshot()).filter((c) => c !== 't').sort();
  const declared = Object.keys(example.telemetryUnits).sort();
  if (JSON.stringify(emitted) !== JSON.stringify(declared)) {
    throw new Error(`the example declares [${declared.join(', ')}] but its engine emits [${emitted.join(', ')}]`);
  }

  // 6. A learner's private work cannot reach the repository: `local/` is ignored and nothing under it is tracked.
  const fsName = 'node:fs';
  const cpName = 'node:child_process';
  const { readFileSync } = (await import(fsName)) as { readFileSync: (path: URL, encoding: string) => string };
  const ignore = readFileSync(new URL('../../../.gitignore', import.meta.url), 'utf8').split(/\r?\n/).map((l) => l.trim());
  if (!ignore.includes('local/')) throw new Error('.gitignore does not ignore local/, so private modules could be committed');

  let trackedNote = 'nothing under local/ is tracked';
  try {
    const { execFileSync } = (await import(cpName)) as { execFileSync: (cmd: string, args: string[], opts: object) => string };
    const root = new URL('../../../', import.meta.url);
    const rootPath = decodeURIComponent(root.pathname).replace(/^\/([A-Za-z]:)/, '$1');
    const tracked = execFileSync('git', ['ls-files', '--', 'local'], { cwd: rootPath, encoding: 'utf8' }).trim();
    if (tracked) throw new Error(`files under local/ are tracked by git: ${tracked.split('\n').join(', ')}`);
  } catch (error) {
    // No git here (a downloaded zip): there is nothing tracked to find. A real finding is rethrown.
    if (error instanceof Error && error.message.startsWith('files under local/')) throw error;
    trackedNote = 'git is not available here, so tracking was not checked';
  }

  console.log(
    `✓ Private modules verified: the shipped example is valid and matches y = y₀ + v₀t − ½gt² to 1e-9, ${refusals.length} kinds of bad module are refused with a reason, a local module cannot replace an upstream one, local courses follow the same rules, local/ is git-ignored and ${trackedNote}`
  );
}
