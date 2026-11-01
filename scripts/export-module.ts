/**
 * npm run export:module -- local/<id> --course <code> --measure "<what the learner measures>" [--dry-run]
 *
 * Turns a private module into the edits for a pull request: copies it into src/simulations/physics/<id>/, registers
 * it, adds it to one course, then runs `npm test`; if the tests fail it puts everything back. It refuses a module that
 * has not passed the checker, has no hand-worked benchmark or no guide (src/simulations/exportModule.ts says why).
 *
 * It only writes files. It does not touch git: it will not branch, commit or push. After it succeeds, make a branch,
 * run `npm run verify` and `npm run smoke`, and open the pull request (docs/LOCAL_MODULES.md, CONTRIBUTING.md).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SIMULATION_CATALOG } from '../src/simulations';
import type { SimulationRegistration } from '../src/simulations';
import { COURSES } from '../src/courses/courses';
import { checkModule } from '../src/simulations/moduleCheck';
import { planExport } from '../src/simulations/exportModule';

const root = resolve(import.meta.dirname ?? '.', '..');
const argv = process.argv.slice(2).filter((a) => a !== '--');

function flag(name: string): string | undefined {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? argv[at + 1] : undefined;
}
const dryRun = argv.includes('--dry-run');
const target = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--course' && argv[i - 1] !== '--measure');

function stop(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

if (!target) stop('Usage: npm run export:module -- local/<id> --course <code> --measure "<what the learner measures>" [--dry-run]');
const dir = resolve(target);
const moduleFile = join(dir, 'module.ts');
if (!existsSync(moduleFile)) stop(`${target}: there is no module.ts there.`);
const courseCode = flag('course') ?? '';
const measure = flag('measure') ?? '';

let manifest: SimulationRegistration;
try {
  manifest = (await import(pathToFileURL(moduleFile).href)).default;
} catch (error) {
  stop(`${target}: it raised an error while loading (${error instanceof Error ? error.message : String(error)})`);
}

const files: Record<string, string> = {};
const skipped: string[] = [];
for (const name of readdirSync(dir)) {
  const path = join(dir, name);
  if (statSync(path).isFile() && name.endsWith('.ts')) files[name] = readFileSync(path, 'utf8');
  else skipped.push(name);
}
if (skipped.length > 0) console.log(`Not copied (only .ts files at the top of the folder are): ${skipped.join(', ')}`);

const indexPath = join(root, 'src/simulations/index.ts');
const coursesPath = join(root, 'src/courses/courses.ts');
const checks = await checkModule(manifest, {
  folder: manifest?.id ?? '',
  taken: () => false, // the exporter tests for an id clash itself, with a clearer message
});
const plan = planExport({
  manifest,
  files,
  indexTs: readFileSync(indexPath, 'utf8'),
  coursesTs: readFileSync(coursesPath, 'utf8'),
  courseCode,
  measure,
  checks,
  upstreamIds: Object.keys(SIMULATION_CATALOG),
  courseCodes: COURSES.map((c) => c.id),
});

if (!plan.ok) {
  console.log(`${target} cannot be exported yet:`);
  for (const reason of plan.reasons) console.log(`  ✗ ${reason}`);
  process.exit(1);
}

console.log(`${target} can be exported:`);
for (const note of plan.notes) console.log(`  • ${note}`);
for (const write of plan.writes) console.log(`    ${write.path}`);
if (dryRun) {
  console.log('\n--dry-run: nothing was written.');
  process.exit(0);
}

// So that a failed export can be undone cleanly, refuse to start on top of uncommitted work in the files it changes.
const touched = plan.writes.map((w) => w.path);
const status = spawnSync('git', ['status', '--porcelain', '--', ...touched], { cwd: root, encoding: 'utf8' });
if (status.status === 0 && status.stdout.trim()) {
  stop(`\nThese files have uncommitted changes, so a failed export could not be undone cleanly:\n${status.stdout}\nCommit or stash them first, then run this again.`);
}

const before = new Map<string, string | null>();
for (const w of plan.writes) {
  const full = join(root, w.path);
  before.set(w.path, existsSync(full) ? readFileSync(full, 'utf8') : null);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, w.text);
}

console.log('\nRunning npm test on the result...');
const tests = spawnSync('npm test', { cwd: root, shell: true, encoding: 'utf8' });
if (tests.status !== 0) {
  for (const [path, text] of before) {
    const full = join(root, path);
    if (text === null) rmSync(full, { force: true });
    else writeFileSync(full, text);
  }
  rmSync(join(root, 'src', 'simulations', 'physics', manifest.id), { recursive: true, force: true });
  const tail = `${tests.stdout}\n${tests.stderr}`.trim().split('\n').slice(-14).join('\n');
  stop(`The tests failed on the exported module, so everything was put back:\n\n${tail}`);
}

console.log(`
Exported "${manifest.id}". Nothing was committed. Next:

  1. git switch -c feat/${manifest.id}
  2. npm run verify && npm run smoke
  3. delete or move local/${manifest.id}/: while both exist, the local copy is refused (its id is taken)
  4. commit with a Conventional message and open a pull request

Before you open it, the pull-request checklist asks you to confirm that it is your own work under the MIT licence
and has no third-party material; it will be reviewed by a model family other than the one that wrote it
(Constitution Art. 1.4 and 12.5). CONTRIBUTING.md has the details, including keeping your email address private.`);
