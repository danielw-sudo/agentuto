import { SIMULATION_CATALOG } from '../simulations';
import { guideOf } from '../simulations/sandboxGuides';
import { COURSES, coursesOfSandbox } from '../courses/courses';

/**
 * Site-wide search: courses, instruments (by title, equation, what you measure, what to explore) and
 * the fixed pages. Built entirely from data the app already has, so a new sandbox or course is
 * searchable the moment it is registered, with nothing to maintain here (Art. 5.2). No dependency.
 *
 * Matching rules, each held by a check in `src/core/test/search.test.ts`:
 *  - every word you type must match (AND), at the start of a word: "8.03" does not find "18.03";
 *  - case, accents and compatibility forms are ignored ("schrodinger" finds "Schrödinger", "ħ" finds "h");
 *  - a title or a code outranks the same word in a description.
 */
export type SearchKind = 'course' | 'instrument' | 'page';

export interface SearchEntry {
  kind: SearchKind;
  title: string;
  /** One line under the title: the equation for an instrument, the alignment for a course. */
  detail: string;
  href: string;
  /** From the learner's own local/ folder. */
  local?: boolean;
  fields: { text: string; weight: number }[];
}

export interface SearchResult {
  entry: SearchEntry;
  score: number;
}

/** Lower-case, strip accents, fold compatibility forms (ε₀ → ε0). */
export function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

/** Words as the matcher sees them. A dot inside a number stays ("8.03"); a trailing dot does not. */
export function words(text: string): string[] {
  return (normalise(text).match(/[\p{L}\p{N}]+(?:\.[\p{L}\p{N}]+)*/gu) ?? []);
}

const PAGES: { title: string; detail: string; href: string; keywords: string }[] = [
  {
    title: 'Courses',
    detail: 'Home',
    href: '#/',
    keywords: 'home courses list topics aligned mechanics electricity magnetism waves optics quantum thermodynamics differential equations',
  },
  {
    title: 'Instruments',
    detail: 'Every instrument, with filters',
    href: '#/instruments',
    keywords: 'instruments sandboxes simulations catalogue catalog filter all modules 2D 3D',
  },
  {
    title: 'User guide',
    detail: 'HUD panels, shortcuts, camera, what to explore',
    href: '#/guide',
    keywords: 'user guide help how to hud panels playback shortcuts keyboard camera navigation 3D lab protocol socratic ai tutor api key privacy localStorage disclaimer',
  },
  {
    title: 'About',
    detail: 'Licence, independence, credits',
    href: '#/about',
    keywords: 'about licence license mit open source independent affiliated endorsed optional ai tutor key permission credits contributors agents github issues discussions',
  },
];

export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const course of COURSES) {
    entries.push({
      kind: 'course',
      title: course.title,
      detail: `${course.local ? 'Course' : 'Aligned with'} ${course.id} · ${course.modules.length} instruments`,
      href: `#/course/${encodeURIComponent(course.id)}`,
      local: course.local,
      fields: [
        { text: course.title, weight: 10 },
        { text: course.id, weight: 8 },
        { text: course.equation, weight: 4 },
        { text: course.lead, weight: 2 },
      ],
    });
  }

  for (const sandbox of Object.values(SIMULATION_CATALOG)) {
    const guide = guideOf(sandbox);
    const inCourses = coursesOfSandbox(sandbox.id);
    const measures = inCourses.flatMap((course) =>
      course.modules.filter((m) => m.sandboxId === sandbox.id).map((m) => m.measure),
    );
    entries.push({
      kind: 'instrument',
      title: sandbox.title,
      detail: sandbox.formattedODE,
      href: `#/sandbox/${encodeURIComponent(sandbox.id)}`,
      local: sandbox.local,
      fields: [
        { text: sandbox.title, weight: 10 },
        { text: sandbox.id, weight: 8 },
        { text: `${sandbox.formattedODE} ${sandbox.governingODE}`, weight: 4 },
        { text: measures.join(' '), weight: 3 },
        { text: inCourses.map((c) => `${c.id} ${c.title}`).join(' '), weight: 3 },
        { text: sandbox.curriculum, weight: 2 },
        { text: sandbox.description, weight: 2 },
        ...(guide
          ? [
              { text: guide.whatToExplore.map((x) => `${x.title} ${x.detail}`).join(' '), weight: 2 },
              { text: guide.labProtocol.join(' '), weight: 2 },
            ]
          : []),
      ],
    });
  }

  for (const page of PAGES) {
    entries.push({
      kind: 'page',
      title: page.title,
      detail: page.detail,
      href: page.href,
      fields: [
        { text: page.title, weight: 10 },
        { text: page.keywords, weight: 3 },
      ],
    });
  }

  return entries;
}

/** The best weight with which one query word starts a word of the entry; 0 when no field has it. */
function tokenScore(entry: SearchEntry, token: string): number {
  let best = 0;
  for (const field of entry.fields) {
    for (const word of words(field.text)) {
      if (!word.startsWith(token)) continue;
      // A whole-word hit beats a prefix hit; a hit in a high-weight field beats one in a low-weight field.
      const score = field.weight * (word === token ? 1.5 : 1);
      if (score > best) best = score;
    }
  }
  return best;
}

const KIND_ORDER: Record<SearchKind, number> = { course: 0, instrument: 1, page: 2 };

export function search(index: SearchEntry[], query: string, limit = 8): SearchResult[] {
  const tokens = words(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];
  for (const entry of index) {
    let total = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const score = tokenScore(entry, token);
      if (score === 0) {
        matchedAll = false;
        break;
      }
      total += score;
    }
    if (matchedAll) results.push({ entry, score: total });
  }

  results.sort(
    (a, b) =>
      b.score - a.score ||
      KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] ||
      a.entry.title.localeCompare(b.entry.title),
  );
  return results.slice(0, limit);
}
