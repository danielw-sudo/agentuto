import { SIMULATION_CATALOG } from '../../simulations';
import { COURSES, courseById, coursesOfSandbox } from '../../courses/courses';

/**
 * Course checks (roadmap R4a). Courses are data over sandboxes; the one way that can go wrong without
 * anyone noticing is a sandbox that claims a course on its own card and is missing from that course's
 * page, or the reverse. This holds the two lists together.
 *
 * The expected membership is recomputed here from each sandbox's `curriculum` string, matching the code as a
 * whole number token ("8.04" is not "8.044", "8.03" is not "18.03"), not read back from the course list.
 */
export function runCoursesVerification(): void {
  const sandboxIds = Object.keys(SIMULATION_CATALOG);

  const claims = (curriculum: string, code: string): boolean => {
    // Match the code as a whole token: "8.04" is not "8.044", and "18.03" is not "8.03".
    const tokens: string[] = curriculum.match(/\d+\.\d+/g) ?? [];
    return tokens.includes(code);
  };

  const codes = new Set<string>();
  for (const course of COURSES) {
    if (codes.has(course.id)) throw new Error(`course "${course.id}" is listed twice`);
    codes.add(course.id);

    const listed = course.modules.map((m) => m.sandboxId);
    if (new Set(listed).size !== listed.length) throw new Error(`course "${course.id}" lists a sandbox twice`);

    for (const m of course.modules) {
      if (!SIMULATION_CATALOG[m.sandboxId]) throw new Error(`course "${course.id}" lists unknown sandbox "${m.sandboxId}"`);
      if (m.measure.trim().length < 20) throw new Error(`course "${course.id}" gives no usable "measure" line for "${m.sandboxId}"`);
    }

    const expected = sandboxIds.filter((id) => claims(SIMULATION_CATALOG[id].curriculum, course.id)).sort();
    const actual = [...listed].sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      const missing = expected.filter((id) => !actual.includes(id));
      const extra = actual.filter((id) => !expected.includes(id));
      throw new Error(
        `course "${course.id}" disagrees with the sandboxes' own curriculum strings: ` +
          `claimed but not listed [${missing.join(', ')}], listed but not claimed [${extra.join(', ')}]`
      );
    }
  }

  // Nothing falls through: every sandbox is reachable from at least one course.
  const orphans = sandboxIds.filter((id) => coursesOfSandbox(id).length === 0);
  if (orphans.length > 0) throw new Error(`sandboxes in no course: ${orphans.join(', ')}`);

  if (courseById('8.02')?.modules.length !== 5 || courseById('nonsense') !== undefined) {
    throw new Error('courseById does not find a course by its code, or invents one');
  }

  const shared = sandboxIds.filter((id) => coursesOfSandbox(id).length > 1);
  console.log(
    `✓ Courses verified: ${COURSES.length} courses cover all ${sandboxIds.length} sandboxes, each course lists exactly the sandboxes whose own curriculum names it, and ${shared.join(', ')} appear${shared.length === 1 ? 's' : ''} in more than one`
  );
}
