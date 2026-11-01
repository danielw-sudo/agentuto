import type { Course } from '../courses/courses';
import type { SimulationRegistration } from './index';

/**
 * Private modules (Constitution Art. 12.4).
 *
 * A learner can keep instruments and courses of their own in a git-ignored `local/` folder. This file is the
 * part of loading them that needs no browser or bundler, so `npm test` can hold its rules: what a module
 * must declare, what is refused and why, and that nothing local can replace something upstream.
 *
 * Nothing here judges whether the physics is right. That is what "local, unreviewed" means, and the module
 * checker (roadmap R2c) is the tool for a closer look.
 */
export interface LocalProblem {
  /** Where it came from: a path under `local/`. */
  source: string;
  /** In plain words, for the person who wrote it or their AI helper. */
  reason: string;
}

export interface LocalReport {
  sandboxes: string[];
  courses: string[];
  problems: LocalProblem[];
}

export function emptyReport(): LocalReport {
  return { sandboxes: [], courses: [], problems: [] };
}

const ID_PATTERN = /^[a-z][a-z0-9-]{1,40}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const TEXT_FIELDS = ['title', 'discipline', 'curriculum', 'governingODE', 'formattedODE', 'description'] as const;

/**
 * Checks one module's default export against what the app needs from a manifest entry. Returns the reason
 * for the first thing wrong, or null.
 */
export function describeProblem(raw: unknown, folder: string, taken: (id: string) => boolean): string | null {
  if (!isRecord(raw)) return 'module.ts must export a manifest object as its default export';

  if (!isText(raw.id) || !ID_PATTERN.test(raw.id)) {
    return 'id must be lower-case letters, digits and hyphens, starting with a letter (for example "free-fall")';
  }
  if (raw.id !== folder) return `id "${raw.id}" must match the folder name "${folder}"`;
  if (taken(raw.id)) return `id "${raw.id}" is already used by another instrument; local modules cannot replace one`;

  for (const field of TEXT_FIELDS) {
    if (!isText(raw[field])) return `${field} must be a non-empty text`;
  }
  if (raw.mode !== '2D' && raw.mode !== '3D') return 'mode must be "2D" or "3D"';

  if (!isRecord(raw.defaultParams) || Object.keys(raw.defaultParams).length === 0) {
    return 'defaultParams must be an object with at least one number';
  }
  for (const [key, value] of Object.entries(raw.defaultParams)) {
    if (!isNumber(value)) return `defaultParams.${key} must be a finite number`;
  }

  if (!Array.isArray(raw.paramDescriptors) || raw.paramDescriptors.length === 0) {
    return 'paramDescriptors must list at least one slider';
  }
  const seen = new Set<string>();
  for (const [index, d] of raw.paramDescriptors.entries()) {
    const at = `paramDescriptors[${index}]`;
    if (!isRecord(d) || !isText(d.id)) return `${at} needs an id`;
    if (seen.has(d.id)) return `${at}: the slider id "${d.id}" appears twice`;
    seen.add(d.id);
    if (!(d.id in (raw.defaultParams as Record<string, unknown>))) {
      return `${at}: "${d.id}" is not a key of defaultParams, so the engine would never receive it`;
    }
    if (!isText(d.label)) return `${at}: label must be a non-empty text`;
    if (typeof d.unit !== 'string') return `${at}: unit must be text (use "" for a dimensionless quantity)`;
    if (!isNumber(d.min) || !isNumber(d.max) || !isNumber(d.step) || !isNumber(d.defaultValue)) {
      return `${at}: min, max, step and defaultValue must be finite numbers`;
    }
    if (!(d.min < d.max)) return `${at}: min must be less than max`;
    if (!(d.step > 0)) return `${at}: step must be greater than 0`;
    if (d.defaultValue < d.min || d.defaultValue > d.max) return `${at}: defaultValue must lie between min and max`;
  }

  if (!isRecord(raw.telemetryUnits) || Object.keys(raw.telemetryUnits).length === 0) {
    return 'telemetryUnits must name every channel the engine emits, with its unit ("dimensionless" if it has none)';
  }
  for (const [channel, unit] of Object.entries(raw.telemetryUnits)) {
    if (!isText(unit)) return `telemetryUnits.${channel} needs a unit ("dimensionless" if it has none)`;
  }

  if (raw.benchmark !== undefined) {
    const b = raw.benchmark;
    if (!isRecord(b) || !isNumber(b.time) || b.time <= 0) return 'benchmark.time must be a positive number of seconds';
    if (!isRecord(b.expected) || Object.keys(b.expected).length === 0) {
      return 'benchmark.expected must give at least one channel and its worked value';
    }
    for (const [channel, value] of Object.entries(b.expected)) {
      if (!isNumber(value)) return `benchmark.expected.${channel} must be a finite number`;
      if (!(channel in (raw.telemetryUnits as Record<string, unknown>))) {
        return `benchmark.expected.${channel} is not a channel declared in telemetryUnits`;
      }
    }
    if (b.params !== undefined) {
      if (!isRecord(b.params)) return 'benchmark.params must be an object of parameter values';
      for (const [key, value] of Object.entries(b.params)) {
        if (!isNumber(value) || !(key in (raw.defaultParams as Record<string, unknown>))) {
          return `benchmark.params.${key} must be a number for a parameter that exists in defaultParams`;
        }
      }
    }
    if (b.tolerance !== undefined && !(isNumber(b.tolerance) && b.tolerance > 0 && b.tolerance <= 1)) {
      return 'benchmark.tolerance must be a number above 0 and at most 1';
    }
  }

  if (typeof raw.load !== 'function') {
    return 'load must be a function returning a promise of { createEngine, createRenderer }';
  }
  return null;
}

/**
 * Adds every valid module to `catalog`, marked local, and records why each refused one was refused. A bad
 * module never stops the others, and never breaks the app: the learner gets a sentence to act on.
 *
 * `modules` maps a path such as `/local/free-fall/module.ts` to that module's default export.
 */
export function registerLocalModules(
  catalog: Record<string, SimulationRegistration>,
  modules: Record<string, unknown>,
  report: LocalReport,
): void {
  for (const path of Object.keys(modules).sort()) {
    const folder = path.split('/').slice(-2, -1)[0] ?? '';
    const raw = modules[path];
    const problem = describeProblem(raw, folder, (id) => Object.prototype.hasOwnProperty.call(catalog, id));
    if (problem) {
      report.problems.push({ source: path.replace(/^\//, ''), reason: problem });
      continue;
    }
    const entry = raw as SimulationRegistration;
    catalog[entry.id] = { ...entry, telemetryUnits: { ...entry.telemetryUnits }, local: true };
    report.sandboxes.push(entry.id);
  }
}

/**
 * Local courses: `local/courses.ts` default-exports a list of courses. Same form as an upstream course; a
 * module may be a local instrument or an upstream one. Codes cannot collide with an existing course.
 */
export function registerLocalCourses(
  courses: Course[],
  catalog: Record<string, SimulationRegistration>,
  exported: unknown,
  report: LocalReport,
): void {
  const source = 'local/courses.ts';
  if (exported === undefined) return;
  if (!Array.isArray(exported)) {
    report.problems.push({ source, reason: 'must export an array of courses as its default export' });
    return;
  }
  for (const [index, raw] of exported.entries()) {
    const at = `course ${index + 1}`;
    if (!isRecord(raw) || !isText(raw.id) || !isText(raw.title) || !isText(raw.lead) || !Array.isArray(raw.modules)) {
      report.problems.push({ source, reason: `${at} needs an id, a title, a lead and a list of modules` });
      continue;
    }
    if (courses.some((c) => c.id === raw.id)) {
      report.problems.push({ source, reason: `${at}: the code "${raw.id}" is already used by another course` });
      continue;
    }
    const modules: Course['modules'] = [];
    let bad: string | null = null;
    for (const m of raw.modules) {
      if (!isRecord(m) || !isText(m.sandboxId) || !isText(m.measure)) {
        bad = 'each module needs a sandboxId and a "measure" line';
        break;
      }
      if (!Object.prototype.hasOwnProperty.call(catalog, m.sandboxId)) {
        bad = `module "${m.sandboxId}" is not an instrument that exists`;
        break;
      }
      modules.push({ sandboxId: m.sandboxId, measure: m.measure });
    }
    if (bad || modules.length === 0) {
      report.problems.push({ source, reason: `${at}: ${bad ?? 'a course needs at least one module'}` });
      continue;
    }
    courses.push({
      id: raw.id,
      title: raw.title,
      shortTitle: isText(raw.shortTitle) ? raw.shortTitle : raw.title,
      equation: isText(raw.equation) ? raw.equation : '',
      lead: raw.lead,
      modules,
      local: true,
    });
    report.courses.push(raw.id);
  }
}
