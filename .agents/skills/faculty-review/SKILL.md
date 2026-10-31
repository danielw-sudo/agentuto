---
name: faculty-review
description: Check the physics and mathematics of an Agentuto sandbox (engine, docs, presets, slider hints, tutor prompts) for correctness, with every finding backed by a numeric run or a cited source. Use before marking a sandbox complete and when reviewing claims in docs.
---

# Faculty review

Goal: every equation, number and explanation a learner sees is correct, and correct *under the stated
conditions* (Constitution Art. 1–2).

## Inputs to read
- Engine `src/simulations/physics/<id>/*Engine.ts` and config `*Config.ts` (defaults, slider ranges, hints).
- Its section in `docs/USER_GUIDE.md`, its presets in `src/ui/components/RoadmapDeck.tsx`, its quick
  prompts in `src/app/App.tsx`, and its concept nodes in `src/knowledge/seedData.ts`.
- Its checks in `src/core/test/core.test.ts`.

## Checklist
1. **Equations:** the governing equation matches the code. Check sign conventions, factors of 2 and π,
   dimensionality (2D vs 3D forms), and classical vs relativistic regime.
2. **Units:** every parameter and telemetry channel has SI units (or stated scaled units) and the code
   uses them consistently. Dimensionless quantities are not shown with fake units.
3. **Limiting cases:** zero damping, zero field, vacuum, equal masses, small angles, and so on reduce to
   the textbook results.
4. **Conservation laws:** energy, momentum, angular momentum, probability and charge are conserved where
   they should be, and *not* where external forces act (walls, drives, resistors). Say which.
5. **Numerics:** the integrator suits the problem (energy drift on long orbits, stiffness, time step
   relative to the fastest timescale). Read the conservation errors over the longest run a learner is
   likely to do.
6. **Claims:** for every quantitative or "always/exactly/never" statement in docs, presets, hints and
   prompts, run the engine under the stated conditions and **record the number**. If it only holds in
   special cases, rewrite it to name them.
7. **Circularity:** a displayed value computed from the law under study (e.g. a period from Kepler III)
   must not be the evidence for that law. Learners should measure instead.
8. **Pedagogy:** the explanation is accurate at its level and avoids common misconceptions (see the
   `deepen-module` skill).

## How to measure (today)
Write a throwaway script **outside the repo** (scratch dir), import the engine directly, and run it with
`npx tsx`:

```ts
import { ProjectileEngine, PROJECTILE_DEFAULT_PARAMS } from '<repo>/src/simulations/physics/projectile-drag/index';
const e = new ProjectileEngine(); e.init({ ...PROJECTILE_DEFAULT_PARAMS, launchAngle: 41 });
for (let i = 0; i < 200000 && !(e.getState() as any).isLanded; i++) e.step(0.005);
console.log((e.getState() as any).impactDistance);
```

For behaviour in the UI, use `window.__AGENTUTO_SIM__` under `npm run dev` (dev builds only).

## Output
- Fix incorrect **documentation** directly (commit message lists each claim and how it was checked).
- Code-level corrections (engine, presets, hints, prompts) go to the coder as items: file, the wrong
  statement, the measured truth, a suggested fix, and how to verify.
- A durable result becomes a test in `core.test.ts`.

Worked example (2026-10-31): the guide claimed the optimal launch angle with drag is "35–39°". The measured
optimum is 41° at default settings, 35° at 80 m/s and 25° for a light, fast projectile, so the claim was
rewritten as condition-dependent.
