import { SIMULATION_CATALOG } from './index';
import { COURSES } from '../courses/courses';
import type { LocalReport } from './local';

/**
 * Reads the learner's private modules from `local/` (Constitution Art. 12.4). This is the only file that
 * touches the bundler's glob, which is why the test suite, which runs in Node, never imports it.
 *
 * `local/` is git-ignored and absent from a fresh checkout, so the public build finds nothing and ships
 * nothing from it; the glob then matches no files and costs nothing. Each module is imported separately,
 * so one that throws is reported instead of taking the app down.
 */
export const localReport: LocalReport = { sandboxes: [], courses: [], problems: [] };

const moduleLoaders = import.meta.glob('/local/*/module.ts', { import: 'default' });
const courseLoaders = import.meta.glob('/local/courses.ts', { import: 'default' });

export async function loadLocalModules(): Promise<void> {
  // The usual case, and every public build: there is no local/ folder, so none of the validation code is
  // fetched and nothing more happens.
  if (Object.keys(moduleLoaders).length === 0 && Object.keys(courseLoaders).length === 0) return;
  const { registerLocalCourses, registerLocalModules } = await import('./local');

  const modules: Record<string, unknown> = {};
  for (const [path, load] of Object.entries(moduleLoaders)) {
    try {
      modules[path] = await load();
    } catch (error) {
      localReport.problems.push({
        source: path.replace(/^\//, ''),
        reason: `it raised an error while loading (${error instanceof Error ? error.message : String(error)})`,
      });
    }
  }
  registerLocalModules(SIMULATION_CATALOG, modules, localReport);

  const courseLoader = courseLoaders['/local/courses.ts'];
  if (courseLoader) {
    try {
      registerLocalCourses(COURSES, SIMULATION_CATALOG, await courseLoader(), localReport);
    } catch (error) {
      localReport.problems.push({
        source: 'local/courses.ts',
        reason: `it raised an error while loading (${error instanceof Error ? error.message : String(error)})`,
      });
    }
  }

  if (localReport.problems.length > 0) {
    // Also in the console, where an AI helper or a developer will look first.
    console.warn('Agentuto: some local modules were not loaded', localReport.problems);
  }
}
