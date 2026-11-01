# Agentuto roadmap

> **Status: plan, nothing here has shipped.** Proposed 2026-10-31 by Claude with the repository owner. Items
> move to `docs/ARCHITECTURE.md` §7 only when they are merged and their gates have run on `main` (Constitution
> Art. 4.1). The owner may reorder or strike anything. `CONSTITUTION.md` wins on any conflict.

Read this before picking up work. It is the shared plan for every agent on this project, whatever model
or tool it runs on.

---

## 1. What Agentuto is

> **Use it, extend it privately, share it if you're proud of it.**

A small library of verified physics and mathematics instruments that run offline, produce real data, and
that your own AI can extend privately. The GitHub Pages site is a demo, not a service: no accounts, no
backend, no analytics, no support promise (Art. 8.1).

Three rungs, each optional:

| Rung | What the person does | What the project provides |
|---|---|---|
| **Use** | Open the site or run it locally; measure, keep the Inquiry Log, export CSV | Courses, sandboxes, instruments. No account, no AI needed |
| **Extend privately** | Add a module of their own to a gitignored `local/` folder, with any AI they choose | A stable module format, skills, a pass/fail module checker |
| **Share** | Keep it in a fork (MIT, nothing needed from us) or open a PR upstream | An export command, a contributor checklist, review |

Trust tiers, shown in the UI: **core** (reviewed and checked against an analytic result), **community**
(merged by PR after review), **local** (never reviewed, labelled as such).

What the project does *not* take responsibility for: the user's models, accounts, school or employer rules,
or the correctness of anything under `local/`.

## 2. Working agreement for agents

- **One builder at a time.** The owner runs a single building session. Other agents review, verify or
  research; they do not build in parallel on the same files.
- **One batch, one PR, nothing new queued.** A batch is done when it is merged, its gates have been
  measured on the merged `main`, and it left no new open threads. Findings go in the hand-off report, not
  into a bigger batch.
- **Branch from `origin/main`**, always fetched first. Squash merge. Never force-push `main`.
- **Gates before commit:** `npm test`, `npm run build`, `npm run check:bundle`. A new check is not a gate
  until it has been mutation-tested: break the behaviour, watch it fail, revert.
- **Never leave a number in a doc that a check can contradict.** Grep the old number when a check is added.
- **Review comes from a different model family than the author** (Art. 1.4, 10.8). `AGENTS.md` §0 lists
  who fills each role. DeepSeek (`meeow-ai`) works through PRs; the owner's own sessions may push to a
  branch and open a PR so CI runs on every change.
- **Hand off** with `temp/CODEBASE_AUDIT_PASS_N.md` (what changed, how verified, open items, escalations).
  `temp/` is local, so a VPS or another machine cannot see it: put what the next agent must know in the PR
  description as well.
- **Frontier models need goals, not scripts.** Each batch below states the outcome and how it is checked.
  How to get there is the builder's call.

## 3. Batches, in order

### R0 — Words before code (docs only)
Outcome: the concept is written down and the entry prompt is safe.
- Constitution amendments, proposed in the PR text for the owner to merge: scope (use / contribute / fork,
  no liability for users' models or accounts), qualification (existing accounts are the gate, no identity
  checks), a local-content article (`local/`, unreviewed, never in the public build), courses are data
  (Art. 6.3) including local ones, and the calendar link is a convenience, never an integration.
- **Rules about generative AI.** Schools, colleges and employers often restrict it. Docs say, without
  naming an age or school level: *use only services you are allowed to use; if you need a parent's, teacher's
  or institution's permission, get it first; follow the rules that apply to you.* This is a notice, not
  verification (Art. 3.3).
- One hardened setup prompt for every CLI and OS: writes only into `local/`; no `sudo`, global installs or
  `curl | sh`; never pushes, commits or force-pulls; stops and explains on error; keeps keys out of its output.
- README leads with the positioning sentence. No "free tier" claims (we cannot verify or promise them).
- Check: `npm test` unchanged, links resolve, no number contradicts a check.

### R1 — Tidy the repository
Outcome: a visitor sees what matters. Prose moved under `docs/` (`ARCHITECTURE.md`, `devlog.md`);
`README.md`, `LICENSE`, `CONTRIBUTING.md`, `AGENTS.md` and `CONSTITUTION.md` stay at the root because
GitHub and agents look for them there. Link audit across docs, skills and CI.
- Check: build, CI, Pages deploy and every relative link.

### R2 — Platform
Three PRs, one at a time, on a clean `main`.
- **R2a Routing and lazy loading.** Hash routes (Pages has no server fallback), one URL per course and
  sandbox, sandboxes loaded on demand. Outcome: bundle headroom returns. Check: `check:bundle` shows real
  headroom; every sandbox still loads. *Built:* the largest chunk fell from 185.0 to 141.6 and a first
  visit from ~320 to 159.9 (script units). The total budget had to rise (322.3 to 356.4) because
  separately compressed chunks cost ~17 kB more; the new first-load budget is the number that now guards
  the visitor. Courses get their own URLs in R4.
  *Then (R4b):* the home page, course pages and About page are lazy except home; first visit is now 102.9.
  *Then (R4c):* site-wide search in the page header, built from the manifest and course data (first visit 104.5).
- **R2b `local/` packs.** The registry loads whatever is in the gitignored `local/` folder, in the same
  format as upstream modules, labelled "local, unreviewed". The Pages build never reads it.
  Check: a test fails if anything under `local/` is tracked; a sample private module appears locally and not
  in `dist/`.
- **R2c Module checker.** `npm run check:module local/<name>` validates the manifest, declared units and a
  numeric test, so a weak model gets a clear pass/fail. Check: mutation-test each rule.

### R3 — Safety net
Outcome: a silent break cannot reach the demo. A browser smoke test, CPU-only, loads every sandbox and runs
in CI (this is Kaizen 5b, moved earlier). Consider deploying Pages from tagged releases instead of every push.
Check: break one sandbox on purpose and watch CI go red.

### R4 — Shell and design
Outcome: a calm landing page that lists courses; each course has its own page; search covers courses,
sandboxes, equations and docs; header, footer and home are uncrowded; long legal text lives on an About page.
- Mockups first in Claude Design (landing, course page, sandbox shell, light and dark); the owner decides
  taste. Then tokens (Art. 7), then port.
- Courses become data (id, title, source and alignment, ordered modules), not a string on each sandbox.
- Search index is built from the manifest at build time; no new runtime dependency without a stated reason.
- Check: `ui-review` skill in a real browser at phone, tablet and desktop widths; text ≥ 14 px / labels ≥ 12 px.

### R5 — Sharing path
Outcome: moving a module from `local/` to a PR is easy and safe. `npm run export:module`; a contributor
checklist (own work, MIT licence, no third-party material, module check passes); PR and issue templates;
a one-line note in `CONTRIBUTING.md` about GitHub's `noreply` commit email for privacy.

### R6 — Depth
In this order: Inquiry Log streak and heatmap (Kaizen 3b), independent closed-form recomputation for all 17
sandboxes (5a, Art. 1.5), micro-feedback (batch 4), then the owner's decision on the five engine initial
conditions that have no slider, and deriving the CSV units line from the manifest.

## 4. Decisions that are the owner's

1. Positioning sentence and the three rungs (proposed above).
2. Constitution amendments in R0.
3. Whether the five engine initial conditions become sliders (R6).
4. Whether Pages deploys from `main` or from tags (R3).
5. Whether to freeze the AI tutor and playlist agent (keep working, add nothing) and drop the SQLite and
   Tauri plans from the docs, since they will not ship soon.

## 5. Out of scope

Accounts, cloud sync, Google OAuth or any calendar integration, analytics, a backend, content moderation,
identity verification, support for users' models, and new sandboxes until R2 is merged.

## 6. Success without analytics

GitHub already shows stars, forks, clones, issues and merged PRs. Once a quarter, time one person pasting the
setup prompt into a free CLI and getting a running app. That time is the onboarding metric.
