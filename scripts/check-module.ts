/**
 * npm run check:module [-- <folder> ...]
 *
 * Runs the module checker (src/simulations/moduleCheck.ts) on private modules and prints one line per check.
 * With no argument it checks every `local/<id>/module.ts`; with arguments it checks those folders (or
 * `module.ts` files), for example `npm run check:module -- local/pendulum` or
 * `npm run check:module -- examples/local-module`.
 *
 * Exit code 0 when nothing failed (warnings do not fail), 1 otherwise. It checks the form, the contract and the
 * numbers; it cannot tell you the physics is right.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SIMULATION_CATALOG } from '../src/simulations';
import type { SimulationRegistration } from '../src/simulations';
import { checkModule, formatResults, summarise } from '../src/simulations/moduleCheck';

const root = resolve(import.meta.dirname ?? '.', '..');
const args = process.argv.slice(2).filter((a) => a !== '--');

function moduleFile(target: string): string | null {
  const path = resolve(target);
  if (existsSync(path) && statSync(path).isFile()) return path;
  const inside = join(path, 'module.ts');
  return existsSync(inside) ? inside : null;
}

function defaultTargets(): string[] {
  const local = join(root, 'local');
  if (!existsSync(local)) return [];
  return readdirSync(local)
    .map((name) => join(local, name))
    .filter((p) => statSync(p).isDirectory() && existsSync(join(p, 'module.ts')));
}

const targets = args.length > 0 ? args : defaultTargets();
if (targets.length === 0) {
  console.log('No private modules found: there is no local/<id>/module.ts here, and no folder was named.');
  console.log('Copy examples/local-module to local/<id>/ to start (docs/LOCAL_MODULES.md).');
  process.exit(0);
}

let failed = 0;
for (const target of targets) {
  const file = moduleFile(target);
  if (!file) {
    console.log(`${target}: FAILED\n  ✗ Module: there is no module.ts at that path`);
    failed++;
    continue;
  }
  const dir = dirname(file);
  let manifest: SimulationRegistration;
  try {
    manifest = (await import(pathToFileURL(file).href)).default;
  } catch (error) {
    console.log(`${target}: FAILED\n  ✗ Module: it raised an error while loading (${error instanceof Error ? error.message : String(error)})`);
    failed++;
    continue;
  }
  // A module in local/<id>/ must be named for its folder. One checked from elsewhere (the shipped example) is
  // checked as if it had been copied to local/<its id>/.
  const folder = basename(dirname(dir)) === 'local' ? basename(dir) : (manifest as { id?: string })?.id ?? basename(dir);
  const results = await checkModule(manifest, {
    folder,
    taken: (id) => Object.prototype.hasOwnProperty.call(SIMULATION_CATALOG, id),
  });
  console.log(formatResults(target, results));
  if (summarise(results).failures > 0) failed++;
}

console.log(
  failed === 0
    ? '\nNothing failed. This checks form, contract and numbers; it does not prove the physics. Work one result out by hand and put it in `benchmark`.'
    : `\n${failed} module${failed === 1 ? '' : 's'} failed. Fix the lines marked ✗ and run it again.`,
);
process.exit(failed === 0 ? 0 : 1);
