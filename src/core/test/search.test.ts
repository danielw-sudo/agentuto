import { SIMULATION_CATALOG } from '../../simulations';
import { COURSES } from '../../courses/courses';
import { buildSearchIndex, search } from '../../search/siteSearch';

/**
 * Site-wide search checks (roadmap R4c). The index is built from the manifest and the course data, so
 * these hold the behaviour a learner relies on: you find a thing by its name, a course code means that
 * course and not one that merely contains the digits, accents do not get in the way, and typing more
 * words narrows the answer instead of widening it.
 */
export function runSearchVerification(): void {
  const index = buildSearchIndex();
  const sandboxes = Object.values(SIMULATION_CATALOG);

  // Recall: everything is found by its own name, first. Computed from the data, not from a hand-kept list.
  for (const sandbox of sandboxes) {
    const top = search(index, sandbox.title)[0];
    if (!top || top.entry.href !== `#/sandbox/${sandbox.id}`) {
      throw new Error(`searching "${sandbox.title}" did not put that instrument first (got ${top?.entry.title ?? 'nothing'})`);
    }
  }
  for (const course of COURSES) {
    for (const query of [course.title, course.id]) {
      const top = search(index, query)[0];
      if (!top || top.entry.href !== `#/course/${course.id}`) {
        throw new Error(`searching "${query}" did not put course ${course.id} first (got ${top?.entry.title ?? 'nothing'})`);
      }
    }
  }

  // A code is a code: "8.03" must not drag in "18.03".
  const eight03 = search(index, '8.03', 50);
  if (eight03.some((r) => r.entry.href === '#/course/18.03')) {
    throw new Error('"8.03" found course 18.03; a code must match from the start of a word');
  }

  // Accents and compatibility forms are ignored, in both directions.
  const tunnelling = `#/sandbox/quantum-tunneling`;
  for (const query of ['schrodinger', 'Schrödinger', 'SCHRODINGER']) {
    if (!search(index, query, 20).some((r) => r.entry.href === tunnelling)) {
      throw new Error(`"${query}" did not find the quantum tunnelling instrument`);
    }
  }

  // The equation is searchable: "flux" finds Gauss's law among the first results.
  if (!search(index, 'flux', 3).some((r) => r.entry.href === '#/sandbox/gauss-flux')) {
    throw new Error('"flux" did not find the Gauss flux instrument near the top');
  }

  // Every extra word narrows: two names from different instruments find nothing in common.
  const twoNames = `${words0(sandboxes[0].title)} ${words0(sandboxes[sandboxes.length - 1].title)}`;
  if (search(index, twoNames).length !== 0) {
    throw new Error(`"${twoNames}" should match no single entry but found ${search(index, twoNames).length}`);
  }

  // Nothing, or nonsense, finds nothing; the limit is honoured.
  for (const query of ['', '   ', 'zzzzqx', '!!!']) {
    if (search(index, query).length !== 0) throw new Error(`"${query}" should find nothing`);
  }
  if (search(index, 'a', 5).length > 5) throw new Error('the result limit was ignored');

  // The fixed pages are there to be found.
  for (const [query, href] of [['about', '#/about'], ['user guide', '#/guide'], ['instruments', '#/instruments']]) {
    if (!search(index, query).some((r) => r.entry.href === href)) throw new Error(`"${query}" did not find ${href}`);
  }

  console.log(
    `✓ Search verified: ${index.length} entries; every one of ${sandboxes.length} instruments and ${COURSES.length} courses is found first by its name, "8.03" does not find 18.03, accents and capitals are ignored, and extra words narrow the answer`
  );
}

/** The first word of a title, lower-case. */
function words0(title: string): string {
  return title.split(/[^A-Za-z]+/).find((w) => w.length > 3)!.toLowerCase();
}
