# Open topics

Things the owner has said matter, written down so any agent or contributor can pick them up. None of them is
scheduled; [`ROADMAP.md`](ROADMAP.md) holds the batches that are. Add to this list, and move a topic to the roadmap
when someone commits to it.

## The honest starting point

Agentuto began as a cheap, fast, mostly machine-written utility. Left alone it stays that. What changes it is
continuous small improvement (kaizen) in three places, and the first two need people, not only models.

## 1. Correctness and a wider range of courses

Faculty correctness and the diversity of courses cannot be settled by the maintainers or by one model family.
They need learners, teachers and subject experts to say "this is wrong", "my course says it this way" and "here is
an experiment you are missing".

- The channels now exist and are linked from every page (`src/community.ts`): Discussions, the physics-discrepancy
  form, the course-mapping form, the new-instrument form. What is missing is people knowing about them.
- Closed-form checks now hold every engine to the textbook (Art. 1.5), but a check is only as good as the formula
  behind it. A second pair of eyes on each formula is the cheapest quality gain available.
- Three instruments run in scaled units that learners are not told about (ROADMAP §4, item 6). That is a faculty
  question first and a code question second.
- Courses beyond the six MIT-aligned ones: other universities' codes, AP and IB units, other languages' syllabi.
  A course is data (`src/courses/courses.ts`), so this is cheap once someone supplies the mapping.

## 2. Look and feel (UI, UX)

There is a long way to go, and most of it is cheap with a high return.

- **Themes.** Auto, light, dark and high contrast exist (the last is held to 7:1 text and a field pair that differs in
  lightness). More optional palettes are a tokens-only change (`src/styles/globals.css`; the contrast test measures every
  pair), for example a paper-and-ink theme or a palette tuned for a particular colour-vision difference.
- **Icons.** The app already uses [Lucide](https://lucide.dev) (`lucide-react`, ISC licence, free for any use,
  tree-shaken so only the icons used are shipped). Alternatives under permissive licences, if a different feel is wanted:
  Tabler Icons (MIT), Phosphor (MIT), Heroicons (MIT), Material Symbols (Apache-2.0). Keep one set per surface so the
  strokes agree, and keep every icon decorative (`aria-hidden`) next to a text label or an `aria-label`.
- **Own assets (a side project).** Instrument thumbnails, a logo, per-course illustrations and a favicon set could be
  made by other models and kept in their own small repository or folder with a stated licence, so the main app stays
  light. Needs a brief: palette from the tokens, a fixed size and aspect ratio, a licence the project can ship under
  (CC0 or CC BY), and SVG preferred over bitmaps so they cost a few hundred bytes and follow the theme.
- The bundle has about 2 kB of headroom (`scripts/check-bundle.mjs`); anything heavier must be lazy-loaded.

## 3. Running as a community, not a clone-and-leave

A repository people copy once and never return to dies. What keeps a project alive is a reason to come back and a
way to say something.

- Make the three doors obvious: ask (Discussions), report (issues), contribute (pull requests, `export:module`).
- Welcome the first contribution: label small, well-described issues `good first issue`; answer within days, not weeks.
- Show the work people share: a "Show and tell" thread, and a short list of community instruments on the About page.
- Say what is wanted: a standing list of missing instruments and courses, kept as issues.
- A small cadence (a release note, a monthly Discussions post) costs little and shows the project is alive.
- Decide how reviews work when the author is a model: review by a different model family is already the rule
  (Art. 1.4); a human faculty reader would be better still.

## If the community never comes

Two things the project has made are worth sharing on their own, and are the fallback value:

- **How the swarm is orchestrated.** One builder at a time, one batch per pull request, a shared plan
  (`docs/ROADMAP.md`), models from different families with fixed roles (Art. 10), review by a different family,
  checks that are mutation-tested so they fail when the thing they guard is wrong, and a constitution the agents
  read first. A short write-up of what worked, what failed and what it cost would help anyone running several
  models on one codebase.
- **The reusable skills.** `.agents/skills/` (new instrument, new course, deepen a module, design system, faculty
  review, UI review) and the check patterns in the tests (closed forms with independent constants, mutation lists,
  smoke tests on the built site) carry over to any similar project. Worth extracting into a separate, licence-clear
  repository with an example each.

## How to use this file

Pick a topic, open a Discussion or an issue linking here, and say what you will do. A topic that has a name and a
date next to it is being worked on; one without is free to take.
