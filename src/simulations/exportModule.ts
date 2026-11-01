import type { SimulationRegistration } from './index';
import { summarise } from './moduleCheck';
import type { CheckResult } from './moduleCheck';

/**
 * Sharing a private module (roadmap R5, Constitution Art. 12.5): turn `local/<id>/` into the edits a pull request
 * needs, without anyone having to know the registry's layout.
 *
 * Pure, like the checker: it takes the module's files and the current text of the two files it must change, and
 * returns either the full set of writes or every reason it will not. `npm run export:module` is the thin wrapper
 * that reads files, applies the writes and runs the tests.
 *
 * It refuses rather than guesses. A shared instrument must pass the checker, carry a hand-worked benchmark (Art. 1.2:
 * every sandbox ships with an automated check against a known result) and a guide, say honestly which course it
 * belongs to, and say what the learner measures there. None of that can be invented for the contributor.
 */
export interface ExportInput {
  manifest: SimulationRegistration;
  /** The module's own files, by name: `module.ts`, the engine, the renderer. */
  files: Record<string, string>;
  /** Current text of src/simulations/index.ts and src/courses/courses.ts. */
  indexTs: string;
  coursesTs: string;
  /** The course the instrument joins (its code, e.g. "8.01") and the "you measure" line for it. */
  courseCode: string;
  measure: string;
  checks: CheckResult[];
  upstreamIds: string[];
  courseCodes: string[];
}

export interface FileWrite {
  path: string;
  text: string;
}

export type ExportPlan = { ok: true; writes: FileWrite[]; notes: string[] } | { ok: false; reasons: string[] };

export function camelManifestName(id: string): string {
  const camel = id
    .split('-')
    .map((word, i) => (i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
  return `${camel}Manifest`;
}

/** The module sat in `local/<id>/`, two folders below the project root; upstream it sits in src/simulations/physics/<id>/. */
export function rewriteImports(text: string): string {
  return text.replace(/(['"])\.\.\/\.\.\/src\//g, '$1../../../');
}

/** Course codes a curriculum string names, by the same whole-number rule the courses check uses. */
export function codesNamedBy(curriculum: string, knownCodes: string[]): string[] {
  const tokens: string[] = curriculum.match(/\d+\.\d+/g) ?? [];
  return knownCodes.filter((code) => tokens.includes(code));
}

const quote = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function planExport(input: ExportInput): ExportPlan {
  const { manifest, files, courseCode, measure } = input;
  const id = manifest.id;
  const reasons: string[] = [];

  const { failures } = summarise(input.checks);
  if (failures > 0) {
    reasons.push(
      `the module checker reports ${failures} problem${failures === 1 ? '' : 's'}; run \`npm run check:module -- local/${id}\` and fix them first`,
    );
  }
  if (!manifest.benchmark) {
    reasons.push('it has no `benchmark`: a shared instrument needs a result worked out by hand that the engine is held to (see docs/LOCAL_MODULES.md)');
  }
  if (!manifest.guide) {
    reasons.push('it has no `guide` (labProtocol, whatToExplore, quickPrompts): the guide page and the lab-protocol panel read it');
  }
  if ((manifest as { local?: boolean }).local) {
    reasons.push('the manifest is marked local; export the file you wrote, not a loaded copy');
  }
  if (input.upstreamIds.includes(id)) {
    reasons.push(`"${id}" is already an instrument in the project`);
  }
  if (!('module.ts' in files)) {
    reasons.push('there is no module.ts in the folder');
  }

  if (!input.courseCodes.includes(input.courseCode)) {
    reasons.push(`"${input.courseCode}" is not a course here (they are ${input.courseCodes.join(', ')}); pass one with --course`);
  } else {
    const named = codesNamedBy(manifest.curriculum, input.courseCodes);
    if (!named.includes(courseCode)) {
      reasons.push(
        `its curriculum text ("${manifest.curriculum}") does not name ${courseCode}; say honestly which topics it is aligned with, for example "MIT ${courseCode} ..."`,
      );
    } else if (named.length > 1) {
      reasons.push(
        `its curriculum text names ${named.join(' and ')}, but this tool adds the instrument to one course (${courseCode}); name one, or add the other course by hand`,
      );
    }
  }
  if (measure.trim().length < 20) {
    reasons.push('--measure needs a sentence saying what the learner measures, completing "You measure ..." (at least 20 characters)');
  }

  // The two files it must change, and whether it can find its way around them
  const imports = [...input.indexTs.matchAll(/^import .* from '\.\/physics\/[^']+';$/gm)];
  const catalogEnd = '\n};\n\nexport type SimulationId';
  const manifestName = camelManifestName(id);
  if (imports.length === 0 || !input.indexTs.includes(catalogEnd)) {
    reasons.push('src/simulations/index.ts is not laid out as this tool expects; add the instrument by hand (see docs/ARCHITECTURE.md §6.7)');
  } else if (input.indexTs.includes(`'${id}':`) || input.indexTs.includes(`./physics/${id}/`)) {
    reasons.push(`src/simulations/index.ts already mentions "${id}"`);
  }
  const courseAt = input.coursesTs.indexOf(`    id: '${courseCode}',`);
  const modulesEnd = courseAt < 0 ? -1 : input.coursesTs.indexOf('\n    ],\n', courseAt);
  if (input.courseCodes.includes(courseCode) && (courseAt < 0 || modulesEnd < 0)) {
    reasons.push(`src/courses/courses.ts is not laid out as this tool expects; add the module to course ${courseCode} by hand`);
  }

  if (reasons.length > 0) return { ok: false, reasons };

  const writes: FileWrite[] = Object.entries(files).map(([name, text]) => ({
    path: `src/simulations/physics/${id}/${name}`,
    text: rewriteImports(text),
  }));

  const lastImport = imports[imports.length - 1];
  const importLine = `import ${manifestName} from './physics/${id}/module';`;
  const insertAt = (lastImport.index ?? 0) + lastImport[0].length;
  let indexTs = `${input.indexTs.slice(0, insertAt)}\n${importLine}${input.indexTs.slice(insertAt)}`;
  indexTs = indexTs.replace(catalogEnd, `\n  '${id}': ${manifestName},\n};\n\nexport type SimulationId`);
  writes.push({ path: 'src/simulations/index.ts', text: indexTs });

  const line = `      { sandboxId: '${id}', measure: ${quote(measure.trim())} },\n`;
  writes.push({
    path: 'src/courses/courses.ts',
    text: `${input.coursesTs.slice(0, modulesEnd + 1)}${line}${input.coursesTs.slice(modulesEnd + 1)}`,
  });

  return {
    ok: true,
    writes,
    notes: [
      `Copies ${Object.keys(files).length} file${Object.keys(files).length === 1 ? '' : 's'} to src/simulations/physics/${id}/ with their imports pointed at the project.`,
      `Registers "${id}" in src/simulations/index.ts and adds it to course ${courseCode} in src/courses/courses.ts.`,
    ],
  };
}
