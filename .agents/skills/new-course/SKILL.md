---
name: new-course
description: Add a course or module to Agentuto by composing existing sandboxes, presets and concept-graph entries, adding new sandboxes only when nothing existing fits. Use when expanding to a new subject (e.g. differential equations, circuits, chemistry kinetics, population biology).
---

# New course or module

A course is **content over shared sandboxes**: an ordered set of modules, each pointing to concepts,
sandboxes, presets, predictions and measurements. (Constitution Art. 6.3)

## 1. Define the source and nature
- Name the course and its topic alignment (e.g. "aligned with MIT OpenCourseWare 18.03 topics", "AP/IB
  Physics syllabus topics"). Describe content, never a target user. No affiliation claims.
- List the modules (5–12) and, for each, the concept, the governing mathematics and the prerequisites.

## 2. Map modules to sandboxes (reuse first)
For each module, find an existing sandbox with the same mathematical form:

| Mathematical form | Existing sandbox | Also covers |
|---|---|---|
| First-order linear relaxation | `rc-rl-circuits` | Newton cooling, radioactive decay, drug clearance |
| Damped/driven 2nd-order oscillator | `harmonic-oscillator`, `lcr-circuit` | pendulum (small angle), seismometer |
| Nonlinear 3D flow / chaos | `lorenz-attractor` | other autonomous ODE systems |
| Central force / orbits | `kepler-orbits` | scattering, Rutherford (with a sign change) |
| Wave equation / superposition | `standing-waves`, `wave-optics`, `doppler-shift` | acoustics, beats |
| Statistical ensemble | `maxwell-boltzmann` | diffusion, random walks |

Only when no row fits, follow the `new-sandbox` skill.

## 3. Write the content (today vs target)
- **Today:** concept nodes and edges in `src/knowledge/seedData.ts` (`level`, `sandbox_id`,
  `prerequisite` / `analogous_to` edges), presets in `src/ui/components/RoadmapDeck.tsx`, and a user-guide
  section.
- **Target:** a course data file under `content/` (course → modules → concept, sandbox, presets,
  predictions, measurements, misconceptions), rendered by a generic course view. Propose this format in your
  pass report before building it.

## 4. Deepen each module
Apply the `deepen-module` skill: levels, a prediction before each run, what to measure, misconceptions.

## 5. Verify
- `faculty-review` on every claim and preset.
- Each preset loads in `npm run dev` and produces what its description says. Record the numbers.
- `npm test` and `npm run build` pass.
