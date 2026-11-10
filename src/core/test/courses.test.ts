import { SIMULATION_CATALOG } from '../../simulations';
import { COURSES, courseById, coursesOfSandbox } from '../../courses/courses';
import { buildSocraticSystemInstruction } from '../../ai/prompts/socraticTutor';

export function runTutorPromptVerification(): void {
  const dummySummary = {
    duration_s: 1.0,
    sample_count: 10,
    min_values: {},
    max_values: {},
    latest_values: {},
  };
  const psychPrompt = buildSocraticSystemInstruction({
    concept_id: 'signal-detection',
    concept_title: 'Signal Detection Theory',
    discipline: 'Psychology',
    active_parameters: {},
    telemetry_summary: dummySummary,
  });
  if (!psychPrompt.includes('mentor in Psychology')) {
    throw new Error('buildSocraticSystemInstruction with discipline "Psychology" must contain "mentor in Psychology"');
  }
  if (psychPrompt.toLowerCase().includes('physics')) {
    throw new Error('buildSocraticSystemInstruction with discipline "Psychology" must not contain "physics"');
  }

  const defaultPrompt = buildSocraticSystemInstruction({
    concept_id: 'test',
    concept_title: 'Test',
    active_parameters: {},
    telemetry_summary: dummySummary,
  });
  if (!defaultPrompt.includes('mentor in science and mathematics')) {
    throw new Error('buildSocraticSystemInstruction without discipline must contain "mentor in science and mathematics"');
  }
  console.log('✓ Socratic tutor prompt verified: discipline specialization and non-physics wording');
}

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

  // Course tags check (Constitution Art. 3.4)
  const allTagCodes = new Set<string>();
  for (const course of COURSES) {
    if (course.local) continue;
    if (!course.tags || course.tags.length !== 2) {
      throw new Error(`course "${course.id}" must have exactly 2 tags, got ${course.tags?.length ?? 0}`);
    }
    const mitTag = course.tags.find((t) => t.school === 'MIT OpenCourseWare');
    if (!mitTag) {
      throw new Error(`course "${course.id}" is missing an MIT OpenCourseWare tag`);
    }
    for (const tag of course.tags) {
      if (!tag.url.startsWith('https://')) {
        throw new Error(`course "${course.id}" tag "${tag.code}" URL must start with https://, got "${tag.url}"`);
      }
      if (allTagCodes.has(tag.code)) {
        throw new Error(`tag code "${tag.code}" in course "${course.id}" is duplicated across courses`);
      }
      allTagCodes.add(tag.code);
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

  runTutorPromptVerification();
}
