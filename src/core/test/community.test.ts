import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { COMMUNITY, COMMUNITY_URLS, DEMO, DISCUSSION_CATEGORIES, ISSUE_FORMS, REPO, demoLink, feedbackUrl } from '../../community';
import { SIMULATION_CATALOG } from '../../simulations';
import { parseRoute } from '../../app/routes';

/**
 * Community links (roadmap: the project survives on people being able to ask, report and discuss).
 *
 * The addresses live in src/community.ts and nowhere else. These checks hold them against the repository: every
 * issue form a link names exists in .github/ISSUE_TEMPLATE, the GitHub issue chooser's own config points at the
 * same Discussions page, the categories are ones the repository has (read from GitHub on 2026-11-01), the link from
 * inside an instrument names that instrument, and no other source file spells the repository address.
 */
const ROOT = resolve(import.meta.dirname ?? '.', '..', '..', '..');
const REPO_CATEGORIES = ['announcements', 'general', 'ideas', 'polls', 'q-a', 'show-and-tell'];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

export function runCommunityVerification(): void {
  // Every address is an https GitHub address inside this repository.
  for (const url of COMMUNITY_URLS) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com' || !parsed.pathname.startsWith('/danielw-sudo/agentuto')) {
      throw new Error(`${url} is not an https address inside ${REPO}`);
    }
  }
  if (COMMUNITY_URLS.length !== new Set(COMMUNITY_URLS).size) throw new Error('two community links have the same address');

  // The issue forms named exist, and every template= in a link is one of them.
  const forms = Object.values(ISSUE_FORMS);
  for (const file of forms) {
    if (!existsSync(join(ROOT, '.github', 'ISSUE_TEMPLATE', file))) throw new Error(`the issue form ${file} does not exist in .github/ISSUE_TEMPLATE`);
  }
  for (const url of COMMUNITY_URLS) {
    const template = new URL(url).searchParams.get('template');
    if (template && !(forms as string[]).includes(template)) throw new Error(`${url} names an issue form that is not in ISSUE_FORMS`);
  }

  // The chooser's own contact link is the same Discussions page.
  const config = readFileSync(join(ROOT, '.github', 'ISSUE_TEMPLATE', 'config.yml'), 'utf8');
  if (!config.includes(`url: ${COMMUNITY.discussions}`)) throw new Error('.github/ISSUE_TEMPLATE/config.yml does not point at the same Discussions page');

  // Discussions categories are real ones.
  for (const slug of Object.values(DISCUSSION_CATEGORIES)) {
    if (!REPO_CATEGORIES.includes(slug)) throw new Error(`"${slug}" is not a Discussions category of the repository`);
  }
  for (const url of [COMMUNITY.ask, COMMUNITY.ideas, COMMUNITY.showAndTell]) {
    if (!url.includes('/discussions/new?category=')) throw new Error(`${url} should open a new discussion in a category`);
  }

  // A report from inside an instrument carries that instrument's id, and only that.
  for (const id of Object.keys(SIMULATION_CATALOG)) {
    const parsed = new URL(feedbackUrl(id));
    if (parsed.searchParams.get('title') !== `[${id}] `) throw new Error(`the feedback title for ${id} was "${parsed.searchParams.get('title')}"`);
    if (parsed.searchParams.get('template') !== ISSUE_FORMS.bug) throw new Error(`the feedback link for ${id} does not use the bug form`);
    if ([...parsed.searchParams.keys()].sort().join(',') !== 'template,title') throw new Error(`the feedback link for ${id} carries more than the form and the title`);
  }

  // The demo link lands on the instrument, with the address style the app now uses.
  if (demoLink() !== DEMO) throw new Error('demoLink() with no id should be the demo address');
  for (const id of Object.keys(SIMULATION_CATALOG)) {
    const hash = new URL(demoLink(id)).hash;
    const route = parseRoute(hash, { isSandbox: (s) => s in SIMULATION_CATALOG, isCourse: () => false });
    if (route.view !== 'sandbox' || route.id !== id) throw new Error(`demoLink(${id}) opens ${JSON.stringify(route)}, not that instrument`);
  }

  // One source of truth: no other source file spells the repository or demo address.
  const offenders = sourceFiles(join(ROOT, 'src'))
    .filter((file) => !file.replace(/\\/g, '/').endsWith('src/community.ts') && !file.replace(/\\/g, '/').includes('src/core/test/'))
    .filter((file) => /danielw-sudo/.test(readFileSync(file, 'utf8')));
  if (offenders.length > 0) throw new Error(`these files spell the repository address instead of using src/community.ts: ${offenders.map((f) => f.slice(ROOT.length + 1)).join(', ')}`);

  console.log(`✓ Community links verified: ${COMMUNITY_URLS.length} addresses inside the repository, issue forms and Discussions categories exist, ${Object.keys(SIMULATION_CATALOG).length} instrument feedback links carry only the id, demo links open the instrument, one source of truth`);
}
