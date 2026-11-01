---
name: new-sandbox
description: Add a new interactive simulation (sandbox) to Agentuto the standard way — reuse shared numerics and visual primitives, one manifest as the source of truth, an analytical benchmark test, docs and knowledge-graph entries. Use whenever creating a sandbox.
---

# New sandbox

> **Private module?** A learner's own instrument for their own machine goes in `local/<id>/`, not in `src/`, and
> is not reviewed. Follow `docs/LOCAL_MODULES.md`; this skill is for an instrument proposed to the project.

## 0. Before writing code
- **Can an existing sandbox express this experiment?** If yes, add presets or a course module instead
  (`new-course` skill). Many topics share one mathematical form: first-order relaxation (RC, cooling,
  decay), second-order oscillators (spring, LCR, pendulum), central forces, and wave equations.
- Write down: the governing equations with units, one analytical result you will test against, one cited
  reference, and the 2–4 measurements a learner should make.

## 1. Engine (`src/simulations/physics/<id>/<Name>Engine.ts`)
- Headless: no DOM, React or Three.js imports. Fixed-step `step(dt)`, `reset`, `getState`,
  `getTelemetrySnapshot`.
- Use `src/core/math/integrators.ts` (RK4 and friends) rather than a private copy. If the problem needs
  something else (symplectic integration for long orbits, an implicit method for stiff systems), add it to
  `core` with a test.
- Preallocate buffers. No allocation inside `step`.

## 2. Config / manifest (`<Name>Config.ts`)
- **Today:** metadata, default params and `ParameterDescriptor[]`, registered in
  `src/simulations/index.ts`. Also update the playlist `responseSchema` in `src/ai/playlistGenerator.ts`
  (until it is generated) and any per-sandbox branches in `App.tsx` / `LiveTelemetryCard.tsx`.
- **Target (manifest v2):** one manifest object holding metadata, params, telemetry channels with units,
  presets, supported instruments, the benchmark and references. Everything else is derived from it, with
  no edits to shared files.
- Slider ranges must stay physically meaningful. Dimensionless quantities get no fake units. Hints make
  no unconditional numeric claims (`faculty-review` skill).

## 3. Renderer (`<Name>Renderer2D.ts` / `Renderer3D.ts`)
- Follow the `design-system` skill: tokens only, semantic colours for physical quantities, labelled axes
  with units, readable type.
- **Target:** compose shared kit primitives (canvas/scene setup, plots, arrows, field lines) rather than
  re-implementing them.
- `unmount()` releases listeners, observers, geometries and materials.
- Keep the region the learner needs clear of the HUD panels at phone and desktop widths.

## 4. Verification
- Add a check to `src/core/test/core.test.ts` against the analytical result (state the tolerance), and a case to
  `src/core/test/closedForm.test.ts`: the textbook formula with its own constants, off-default parameters, the
  engine reached only through the registry (Art. 1.5). Mutation-test it: break the engine by a few per cent and
  see the case fail.
- Run the `faculty-review` checklist on the new sandbox.
- `npm test` and `npm run build` pass. Load the sandbox in `npm run dev`, switch to and from it, export
  a CSV, and check the console is clean.

## 5. Content
- `docs/USER_GUIDE.md` section: concept, what to explore, every claim measured or conditioned.
- Knowledge-graph concept node(s) with `sandbox_id` in `src/knowledge/seedData.ts`, plus
  prerequisite/analogy edges.
- 2–3 presets (`RoadmapDeck.tsx` today) and tutor quick prompts.
- Course labels say "aligned with" and must not define a target user (Constitution Art. 3).

## 6. Hand-off
Commit with the co-author trailer (`AGENTS.md` §5). In your pass report, record the benchmark result, the
reference, and anything left for review.
