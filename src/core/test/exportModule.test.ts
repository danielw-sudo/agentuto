import { SIMULATION_CATALOG } from '../../simulations';
import type { SimulationRegistration } from '../../simulations';
import { COURSES } from '../../courses/courses';
import { checkModule } from '../../simulations/moduleCheck';
import { camelManifestName, codesNamedBy, planExport, rewriteImports } from '../../simulations/exportModule';
import type { ExportInput, ExportPlan } from '../../simulations/exportModule';
import example from '../../../examples/local-module/module';

/**
 * Share-path checks (roadmap R5, Constitution Art. 12.5).
 *
 * The exporter turns `local/<id>/` into the edits for a pull request. It has to be right in both directions:
 * produce exactly the edits that make the project accept the instrument, and refuse, with the reason, anything the
 * project would reject. The edits are checked against the real `src/simulations/index.ts` and `src/courses/courses.ts`
 * text; the end-to-end proof (the whole suite passing with an instrument exported) is run separately and recorded in
 * the pull request.
 */
export async function runExportModuleVerification(): Promise<void> {
  const fsName = 'node:fs';
  const { readFileSync } = (await import(fsName)) as { readFileSync: (path: URL, encoding: string) => string };
  const read = (rel: string) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');
  const indexTs = read('src/simulations/index.ts');
  const coursesTs = read('src/courses/courses.ts');
  const moduleFiles = {
    'module.ts': read('examples/local-module/module.ts'),
    'FreeFallEngine.ts': read('examples/local-module/FreeFallEngine.ts'),
    'FreeFallRenderer2D.ts': read('examples/local-module/FreeFallRenderer2D.ts'),
  };

  // The example, as a contributor would have finished it: an honest curriculum line that names one course.
  const shared: SimulationRegistration = { ...(example as SimulationRegistration), id: 'zz-export-fixture', curriculum: 'MIT 8.01 Classical Mechanics' };
  const checks = await checkModule(shared, { folder: 'zz-export-fixture', taken: () => false });
  const base: ExportInput = {
    manifest: shared,
    files: moduleFiles,
    indexTs,
    coursesTs,
    courseCode: '8.01',
    measure: 'how long a dropped ball takes to land, and the speed it lands at.',
    checks,
    upstreamIds: Object.keys(SIMULATION_CATALOG),
    courseCodes: COURSES.map((c) => c.id),
  };

  // 1. The good case writes exactly the right edits.
  const plan = planExport(base);
  if (!plan.ok) throw new Error(`a valid module was refused: ${plan.reasons.join('; ')}`);
  const written = new Map(plan.writes.map((w) => [w.path, w.text]));
  for (const name of Object.keys(moduleFiles)) {
    const text = written.get(`src/simulations/physics/zz-export-fixture/${name}`);
    if (!text) throw new Error(`${name} was not copied to the project`);
    if (/['"]\.\.\/\.\.\/src\//.test(text)) throw new Error(`${name} still imports from ../../src/, which does not exist inside the project`);
  }
  if (!written.get('src/simulations/physics/zz-export-fixture/FreeFallEngine.ts')!.includes("from '../../../core/types/simulation'")) {
    throw new Error("the engine's import of the core types was not rewritten to ../../../core/types/simulation");
  }

  const newIndex = written.get('src/simulations/index.ts')!;
  const importLine = "import zzExportFixtureManifest from './physics/zz-export-fixture/module';";
  const entryLine = "  'zz-export-fixture': zzExportFixtureManifest,";
  if (newIndex.split(importLine).length !== 2 || newIndex.split(entryLine).length !== 2) {
    throw new Error('the registry import and entry must each appear exactly once');
  }
  if (newIndex.indexOf(importLine) > newIndex.indexOf('export interface SimulationRuntime')) {
    throw new Error('the import was not placed with the others at the top of the registry');
  }
  if (newIndex.indexOf(entryLine) < newIndex.indexOf('export const SIMULATION_CATALOG')) {
    throw new Error('the entry was not placed inside SIMULATION_CATALOG');
  }
  if (newIndex.split('\n').length !== indexTs.split('\n').length + 2) throw new Error('the registry edit should add exactly two lines');
  if (newIndex.replace(importLine + '\n', '').replace(entryLine + '\n', '') !== indexTs) {
    throw new Error('the registry edit changed something besides adding its two lines');
  }

  const newCourses = written.get('src/courses/courses.ts')!;
  const moduleLine = "      { sandboxId: 'zz-export-fixture', measure: 'how long a dropped ball takes to land, and the speed it lands at.' },";
  if (newCourses.split(moduleLine).length !== 2) throw new Error('the course line must appear exactly once');
  const at = newCourses.indexOf(moduleLine);
  if (!(newCourses.indexOf("id: '8.01'") < at && at < newCourses.indexOf("id: '8.02'"))) {
    throw new Error('the instrument was not added inside course 8.01');
  }
  if (newCourses.replace(moduleLine + '\n', '') !== coursesTs) throw new Error('the course edit changed something besides adding its line');

  // 2. A measure line with an apostrophe survives as valid source.
  const quoted = planExport({ ...base, measure: "the ball's landing time and landing speed." });
  if (!quoted.ok || !quoted.writes.find((w) => w.path === 'src/courses/courses.ts')!.text.includes("the ball\\'s landing time")) {
    throw new Error("an apostrophe in the measure line was not escaped");
  }

  // 3. Each thing the project would reject is refused, with its reason.
  const refuses = (label: string, input: ExportInput, mention: string) => {
    const result: ExportPlan = planExport(input);
    if (result.ok) throw new Error(`${label}: the exporter accepted it`);
    if (!result.reasons.some((r) => r.includes(mention))) {
      throw new Error(`${label}: reasons [${result.reasons.join(' | ')}] do not mention "${mention}"`);
    }
  };
  const without = (key: string): SimulationRegistration => {
    const copy = { ...shared } as Record<string, unknown>;
    delete copy[key];
    return copy as unknown as SimulationRegistration;
  };
  refuses('no benchmark', { ...base, manifest: without('benchmark') }, 'benchmark');
  refuses('no guide', { ...base, manifest: without('guide') }, 'guide');
  refuses('a module the checker fails', { ...base, checks: [{ name: 'Benchmark', status: 'fail', detail: 'x' }] }, 'checker reports 1 problem');
  refuses('the shipped example itself', { ...base, manifest: { ...shared, id: 'free-fall' } }, 'shipped example');
  refuses('an id the project already has', { ...base, manifest: { ...shared, id: 'lorentz-force' } }, 'already an instrument');
  refuses('a course that does not exist', { ...base, courseCode: '9.99' }, 'is not a course');
  refuses('a curriculum that does not name the course', { ...base, manifest: { ...shared, curriculum: 'Example private module' } }, 'does not name 8.01');
  refuses('a curriculum that names two courses', { ...base, manifest: { ...shared, curriculum: 'MIT 8.01 / MIT 8.02' } }, '8.01 and 8.02');
  refuses('a curriculum that names another course instead', { ...base, courseCode: '8.02' }, 'does not name 8.02');
  refuses('a vague measure line', { ...base, measure: 'stuff' }, '--measure');
  refuses('no module.ts', { ...base, files: { 'FreeFallEngine.ts': moduleFiles['FreeFallEngine.ts'] } }, 'no module.ts');
  refuses('a registry laid out differently', { ...base, indexTs: 'export const nothing = 1;' }, 'not laid out');
  refuses('an instrument already in the registry', { ...base, indexTs: `// './physics/zz-export-fixture/'\n${indexTs}` }, 'already mentions');
  refuses('a courses file laid out differently', { ...base, coursesTs: 'export const COURSES = [];' }, 'not laid out');
  refuses('a manifest still marked local', { ...base, manifest: { ...shared, local: true } }, 'marked local');

  // 4. The helpers
  if (camelManifestName('zz-export-fixture') !== 'zzExportFixtureManifest' || camelManifestName('kepler-orbit-2') !== 'keplerOrbit2Manifest') {
    throw new Error('manifest names are not camel-cased from the id');
  }
  if (rewriteImports("import a from '../../src/core/x';\nimport b from \"../../src/y\";\nimport c from './z';") !== "import a from '../../../core/x';\nimport b from \"../../../y\";\nimport c from './z';") {
    throw new Error('import rewriting is wrong');
  }
  if (JSON.stringify(codesNamedBy('AP Physics 2 / IB Physics HL / MIT 8.044', ['8.04', '8.044'])) !== '["8.044"]') {
    throw new Error('8.04 was taken for 8.044');
  }

  console.log(
    `✓ Share path verified: a finished module becomes exactly ${plan.writes.length} writes (its ${Object.keys(moduleFiles).length} files with imports pointed at the project, two added lines in the registry, one in course 8.01), and 15 kinds of module the project would reject are each refused with the reason`
  );
}
