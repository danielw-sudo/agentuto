/**
 * Where people go to talk to the project. Every outward link in the app comes from here and nowhere else, so
 * the addresses are written once, are the same on the demo site and on a learner's own localhost, and are held
 * against the repository by a test (src/core/test/community.test.ts): the issue forms they point at must exist,
 * and the Discussions categories must be ones the repository has.
 *
 * They are deliberately fixed to the upstream project, not derived from the page address: a copy running on
 * localhost, or a fork, still sends questions and reports to the place where the maintainers and the other
 * learners are. (A fork that wants its own can change REPO.)
 *
 * Opening a link needs the internet; everything else in Agentuto works without it.
 */

export const REPO = 'https://github.com/danielw-sudo/agentuto';

/** Slugs of the repository's Discussions categories. */
export const DISCUSSION_CATEGORIES = { questions: 'q-a', ideas: 'ideas', showAndTell: 'show-and-tell', general: 'general' } as const;

/** File names in .github/ISSUE_TEMPLATE/. */
export const ISSUE_FORMS = {
  bug: 'bug_report.md',
  physics: 'physics_discrepancy.yml',
  instrument: 'new_instrument.md',
  course: 'course_equivalence.yml',
} as const;

export const COMMUNITY = {
  repo: REPO,
  discussions: `${REPO}/discussions`,
  ask: `${REPO}/discussions/new?category=${DISCUSSION_CATEGORIES.questions}`,
  ideas: `${REPO}/discussions/new?category=${DISCUSSION_CATEGORIES.ideas}`,
  showAndTell: `${REPO}/discussions/new?category=${DISCUSSION_CATEGORIES.showAndTell}`,
  issues: `${REPO}/issues/new/choose`,
  bug: `${REPO}/issues/new?template=${ISSUE_FORMS.bug}`,
  physics: `${REPO}/issues/new?template=${ISSUE_FORMS.physics}`,
  proposeInstrument: `${REPO}/issues/new?template=${ISSUE_FORMS.instrument}`,
  mapCourse: `${REPO}/issues/new?template=${ISSUE_FORMS.course}`,
} as const;

/** Every address above, for tests and for anything that needs to list them. */
export const COMMUNITY_URLS: readonly string[] = Object.values(COMMUNITY);

/** The public demo, where a calendar entry or a shared note can point: the page itself, or one instrument by id. */
export const DEMO = 'https://danielw-sudo.github.io/agentuto/';
export function demoLink(sandboxId?: string): string {
  return sandboxId ? `${DEMO}#/sandbox/${encodeURIComponent(sandboxId)}` : DEMO;
}

/**
 * A bug report opened from inside an instrument, titled with the instrument's id so the maintainers know which
 * one without being told. Only the id goes in the address: nothing about the person or their machine.
 */
export function feedbackUrl(sandboxId: string): string {
  return `${COMMUNITY.bug}&title=${encodeURIComponent(`[${sandboxId}] `)}`;
}
