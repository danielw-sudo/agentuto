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

*Built (R0):* `CONSTITUTION.md` v1.2 is **proposed** in its pull request and takes effect only when the owner merges it
(Art. 12 on scope, audiences, no identity checks, local content and sharing; the permission notice in Art. 3.5; links
are conveniences in Art. 8.3). The permission notice is in the README, user guide, About page and the in-app notices.
The setup prompt in the user guide is hardened and works on Windows, macOS and Linux. It still says *do not edit any
file inside the project*: setting up and running Agentuto never needs to. Adding a private module is a separate prompt
(R2b, in `docs/LOCAL_MODULES.md`) whose rule is *write only inside `local/`*. The README leads with the positioning sentence and marks "extend it privately" as planned.

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
  *Then (R4d):* the sandbox screen is docked (header with course link and search, panels beside the apparatus, transport row below), on tokens, no text under 12 px.
- **R2b `local/` packs.** The registry loads whatever is in the gitignored `local/` folder, in the same
  format as upstream modules, labelled "local, unreviewed". The Pages build never reads it.
  Check: a test fails if anything under `local/` is tracked; a sample private module appears locally and not
  in `dist/`.
- **R2c Module checker.** `npm run check:module local/<name>` validates the manifest, declared units and a
  numeric test, so a weak model gets a clear pass/fail. Check: mutation-test each rule.

*Built (R2b):* `local/<id>/module.ts` and `local/courses.ts` load into the same registry and course list, marked *Local,
unreviewed* everywhere; refused modules are listed with a reason on the home page; `examples/local-module/` is a tested
starting point; `docs/LOCAL_MODULES.md` has the guide and a hardened prompt; a CI step and a test keep `local/` out of
the repository and the public build. 

*Built (R2c):* `npm run check:module` runs a private module's engine in Node and reports, in sentences, form, contract,
declared-versus-reported channels, finite numbers across every slider, repeatability, sliders that do nothing, and a
hand-worked `benchmark` the engine must reproduce. `npm run verify` runs it on the shipped example. It establishes that
a module is well formed and agrees with the result its author worked out; it cannot establish that the physics is right.

### R3 — Safety net
Outcome: a silent break cannot reach the demo. A browser smoke test, CPU-only, loads every sandbox and runs
in CI (this is Kaizen 5b, moved earlier). Consider deploying Pages from tagged releases instead of every push.
Check: break one sandbox on purpose and watch CI go red.

*Built (R3):* `npm run smoke` opens all 17 instruments from cold links in headless Chrome (software WebGL, no graphics card),
the site pages, search and a phone screen, and fails on a blank drawing, a clock that does not run, a script or network
error. CI runs it (Node 22) and the Pages workflow runs it before uploading, under the `/agentuto/` sub-path. The deploy is
still on every push to `main`; moving it to tagged releases is the owner's decision (below).

### R4 — Shell and design
Outcome: a calm landing page that lists courses; each course has its own page; search covers courses,
sandboxes, equations and docs; header, footer and home are uncrowded; long legal text lives on an About page.
- Mockups first in Claude Design (landing, course page, sandbox shell, light and dark); the owner decides
  taste. Then tokens (Art. 7), then port.
- Courses become data (id, title, source and alignment, ordered modules), not a string on each sandbox.
- Search index is built from the manifest at build time; no new runtime dependency without a stated reason.
- Check: `ui-review` skill in a real browser at phone, tablet and desktop widths; text ≥ 14 px / labels ≥ 12 px.

*Built (UI clean-up, between R3 and R5):* the Instruments page and the User guide became site pages (shared header, search, footer;
light and dark), every drawer, modal and virtual instrument moved onto the tokens, the sandbox header is one row of icons on
a phone, and the tab names the instrument. The in-guide jump links no longer change the address.

### R5 — Sharing path
Outcome: moving a module from `local/` to a PR is easy and safe. `npm run export:module`; a contributor
checklist (own work, MIT licence, no third-party material, module check passes); PR and issue templates;
a one-line note in `CONTRIBUTING.md` about GitHub's `noreply` commit email for privacy.

*Built (R5):* `npm run export:module` prepares a private module for a pull request (checker first; a hand-worked benchmark, a
guide and an honest curriculum line required; copies, registers, adds to a course, runs the tests, undoes itself on failure);
the pull-request template and three issue templates are in `.github/`; CONTRIBUTING explains the process and how to keep an
email address private. An instrument was exported for real into a working tree: the whole suite (46 checks), the build, the
bundle budget and the 35-check smoke test accepted it, then it was reverted.

### R6 — Depth

**Built — micro-feedback.** Nine milestones earned by behaviour (never by correctness) and an optional soft chime that is off by default, in the Inquiry Log drawer; see ARCHITECTURE §6.6b. The total bundle is now at its budget with no headroom, so the next feature needs either lazy loading or a budget decision (owner).

**Built — independent closed forms (Art. 1.5).** One case per built-in instrument in `src/core/test/closedForm.test.ts` (see ARCHITECTURE §6.7a), mutation-tested with 25 deliberate engine errors, all caught. Fixed what it found: Lorentz kinetic-energy unit (J to µJ), the Doppler receiver-speed sign on the ahead/behind channels, and first-order RC/RL heat. Left for the owner: decisions 6 and 7 below.

**Built — theme toggle.** An icon button at the top right (Auto, Light, Dark), remembered in this browser, applied before first paint (see ARCHITECTURE §6.6).

**Built — community links.** Discuss, report and propose are linked from every page and from inside each instrument, from one tested source (ARCHITECTURE §6.6a). Longer-term topics the owner raised (courses and correctness, look and feel, running as a community, and what is worth sharing if no community forms) are in [`OPEN_TOPICS.md`](OPEN_TOPICS.md).
In this order: ~~Inquiry Log streak and heatmap (Kaizen 3b)~~ (built), ~~independent closed-form recomputation for all 17
sandboxes (5a, Art. 1.5)~~ (built), ~~micro-feedback (batch 4)~~ (built), then the owner's decision on the five engine initial
conditions that have no slider, and deriving the CSV units line from the manifest.

**Built — streak and heatmap.** The home page shows "Your inquiry log" once the learner has a first entry: current and longest streak, entry count, and a 26-week calendar (Monday to Sunday columns, today last, UTC days, four shades). It reads only the browser's own storage, sits in a lazy chunk so the first load is unchanged (104.0 kB), and draws nothing for a new visitor. The grid is a pure function (`src/ui/journal/activityModel.ts`) checked against hand-counted dates, mutation-tested six ways; the smoke test seeds an entry and reads the card (35 checks). It reuses the existing UTC series, so no streak rule changed.

## 4. Decisions that are the owner's

1. Positioning sentence and the three rungs (proposed above).
2. Constitution amendments in R0.
3. Whether the five engine initial conditions become sliders (R6).
4. Whether Pages deploys from `main` or from tags (R3).
5. Whether to freeze the AI tutor and playlist agent (keep working, add nothing) and drop the SQLite and
   Tauri plans from the docs, since they will not ship soon.
6. Three instruments run in scaled units that a learner is not told about, and their labels read as SI. Faraday uses an
   effective permeability of 1e-3 T·m/A where the real value is 4π×10⁻⁷, so flux, EMF and force are about 800 times the
   real ones (the engine says so in a code comment only); the tunnelling instrument is in units where ħ = m = 1 but is
   labelled eV and nm (a real electron at 5 eV has k = 11.5 nm⁻¹, not 3.16); the gas instrument has k_B = 1 and is labelled
   K, Pa and J. Options: say so in each instrument's guide and relabel the units as reduced, or move to real constants
   (this changes how fast things happen and what the sliders mean, so it needs a faculty review).
7. The tunnelling grid has 240 points over 20 length units, so the barrier is drawn in whole cells of 0.084 and the
   transmission is within about 4 % of the exact packet-averaged value only after that rounding is allowed for; a barrier
   width set to 1.00 is really 1.004, and one set to 0.8 is 0.837, which changes T by about 25 %. A finer grid costs CPU.

## 5. Out of scope

Accounts, cloud sync, Google OAuth or any calendar integration, analytics, a backend, content moderation,
identity verification, support for users' models, and new sandboxes until R2 is merged.

## 6. Success without analytics

GitHub already shows stars, forks, clones, issues and merged PRs. Once a quarter, time one person pasting the
setup prompt into a free CLI and getting a running app. That time is the onboarding metric.
