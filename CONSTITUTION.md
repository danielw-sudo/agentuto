# Agentuto Constitution

> **Status:** v1.1 — **proposed** 2026-10-31 by DeepSeek (Hermes) at the repository owner's instruction. It
> becomes v1.1, ratified, when the owner merges the pull request carrying this text. v1.0 was ratified by
> the repository owner on 2026-10-31.

This document holds the few rules that must stay true however the project grows. `AGENTS.md` says *how*
agents work day to day; the skills in `.agents/skills/` say *how to do* specific tasks. When they conflict,
this document wins. Only the repository owner amends it. Agents may propose amendments in their hand-off
reports but never edit it on their own.

**Transition.** Some articles (the manifest in Art. 5, the shared kit in Art. 6, tokens and the readability
floor in Art. 7) describe a target the code does not meet yet. Existing gaps are tracked debt, listed in the
hand-off reports, and do not block unrelated work. New and changed code must comply.

---

## Article 1: Faculty first
1. Correct science and mathematics take priority over features, speed and looks.
2. Every sandbox states its governing equations with units and sign conventions, cites at least one
   reference (e.g. MIT OpenCourseWare notes or a standard textbook), and ships with an automated check
   against an analytical or known result.
3. Every quantitative claim in docs, presets, hints or tutor prompts must be **measured**: reproduced by a
   test or a recorded run of the engine, with the conditions stated. Claims that only hold in special cases
   must name those cases.
4. A new or substantially changed sandbox gets an independent faculty review by a reviewer from a different
   model family than its author before it is listed as complete.
5. **A check must fail when the physics is wrong.** Where a closed-form result exists, the verification
   evaluates that closed form independently rather than reusing the engine's own constants, helpers or
   integration path. A test that recomputes the implementation from the same inputs, by the same route,
   confirms the arithmetic but proves nothing about the physics.

## Article 2: Pedagogy
1. Agentuto is an instrument for inquiry. Learners set parameters, predict, observe, measure and explain.
2. Displayed values that are *computed from* the law under study must not be presented as evidence for that
   law. Learners verify laws from measured quantities.
3. The optional tutor is instructed not to hand out final answers. Docs describe this as an instruction to
   the model, never as a guarantee.

## Article 3: AI is optional; the audience is not defined
1. Every simulation, instrument, notebook and export works fully without AI.
2. Optional AI features use the user's own provider account and key, under that provider's terms. No key,
   prompt or telemetry goes anywhere except to the provider the user configured.
3. Docs and UI describe courses by **source and nature** (topic alignment) and never define, identify or target
   a particular user. The "AI Features & Disclaimer" text (README, user guide §5, and the in-app key
   dialog) stays in place.
4. Course labels say "aligned with" and never imply affiliation with or endorsement by any institution.

## Article 4: Truthful documentation
1. Docs describe what has shipped. Plans live only in clearly marked roadmap sections.
2. Removing a feature means removing its documentation in the same change.

## Article 5: One source of truth
1. Each sandbox is defined once, in its manifest (metadata, parameters, telemetry channels with units,
   presets, supported instruments, benchmark). Everything else (control deck, playlist schema, tutor
   context, CSV units, telemetry card, knowledge-graph links) is **derived** from it.
2. Hand-maintained lists that duplicate the manifest are defects.

## Article 6: Reuse before writing
1. Numerics live in `src/core` (integrators, units, linear algebra). Visual primitives live in the shared kit
   (plots, axes, vectors, fields, canvas and scene setup). Sandboxes compose them.
2. A new shared primitive is extracted when a pattern already appears in at least two sandboxes, not
   speculatively.
3. Courses are content (data) over shared sandboxes. A new course adds a new sandbox only when no existing one
   can express the experiment.

## Article 7: Design system
1. Colours, type, spacing and motion come only from design tokens. Raw colour literals and ad-hoc font sizes
   in sandbox or UI code are defects.
2. Physical quantities keep **one colour meaning across all sandboxes** (e.g. E field, B field, velocity,
   force, kinetic and potential energy).
3. Readability floor: body text ≥ 14 px, labels ≥ 12 px, WCAG AA contrast, KaTeX for mathematics.
4. The simulation is the content. HUD panels must not hide the plots, apparatus or captions a learner needs,
   from phone to desktop widths. Motion respects `prefers-reduced-motion`.

## Article 8: Simple and light
1. No backend, accounts or analytics. Static hosting must remain possible.
2. Every new runtime dependency needs a stated reason. Bundle-size budgets are checked in CI once defined.

## Article 9: Verification gates
1. Before any commit to `main`: `npm test` and `npm run build` pass.
2. CI must run the engine checks, the build and (once it exists) a browser smoke test that loads every
   sandbox. Red CI blocks merging, enforced by GitHub branch protection on `main` (set by the owner).
3. A gate claim is verified by someone other than the author of the change. A hand-off report that says a
   gate passed names the command, the commit it ran on and what it printed; a claim that cannot be
   reproduced is a defect under Art. 1.3.

## Article 10: Roles and hand-off
1. **Owner:** sets direction, approves, and alone amends this constitution.
2. **Coder:** writes features and fixes.
3. **First-pass reviewer:** reviews the coder's changes before they land.
4. **Specialist reviewer:** faculty knowledge review, second-pass code review, UI/UX review, and the
   escalation path when an item resists the coder. Must be from a different model family than the coder
   (Art. 1.4).
5. Which agent or model fills each role is recorded in `AGENTS.md` §0, not here, so a model change needs no
   amendment.
6. Agents hand off through `temp/CODEBASE_AUDIT_PASS_N.md` (what changed, how it was verified, open
   items, and an "Escalate to Claude" list). Agents don't loop on a failing item; they escalate it.
7. **Verification and learner-experience reviewer:** checks that published numerical claims reproduce,
   that the CI gates are honest, and that a feature works for a learner using the product alone — the user
   side, as distinct from the developer side of the same change. Does not author sandbox engines. Recorded
   in `AGENTS.md` §0 like every other role (cl. 5).
8. **No self-review.** Review comes from a model family different from the author's (Art. 1.4). This holds
   for the specialist reviewer's own changes: the owner designates a reviewer from another family for them.

## Article 11: Credit and provenance
1. Commits carry co-author trailers for the agents that wrote them (`AGENTS.md` §5).
2. Prior art is acknowledged. Code or assets from other projects are used only under a compatible licence and
   with attribution; unlicensed material is never copied.
3. **Provenance without an account.** An agent that has its own GitHub account commits under that account,
   so the contribution is attributable on its own name. An agent that has none is credited in `README.md`
   and `AGENTS.md` with a link to its model's canonical public repository and a truthful co-author trailer,
   and says plainly in its hand-off that GitHub will not list it in the contributor graph. Borrowing another
   party's account or address to appear in that graph is prohibited — which is why Batches 19–24 are
   unattributed.

---

## Ratification and amendments
- **Ratified:** 2026-10-31 by the repository owner (v1.0).
- **Proposed:** 2026-10-31 by DeepSeek (Hermes) at the owner's instruction (v1.1). Merging the pull request
  that carries this text is the ratification; no other step is required.

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-10-31 | Draft by Claude for owner review. |
| v1.0 | 2026-10-31 | Ratified by the owner after revisions (roles not models, transition clause, branch protection). |
| v1.1 | 2026-10-31 | Proposed by DeepSeek: check independence (Art. 1.5), verified gate claims (Art. 9.3), verification & learner-experience role and no self-review (Art. 10.7–8), provenance without an account (Art. 11.3). |
