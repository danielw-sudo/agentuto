# Your own instruments and courses (private modules)

Agentuto can load instruments and courses of your own from a folder called `local/`. They appear next to the
built-in ones, marked **Local, unreviewed**, and they stay on your computer: `local/` is never committed to git
and never part of the public site (Constitution Art. 12.4).

You need Agentuto running on your own computer ([user guide §1.1](USER_GUIDE.md)). The website cannot read your
`local/` folder.

Nobody has reviewed what you put there, and Agentuto does not vouch for it. The physics is only as good as the
person or AI that wrote it, so check it yourself (see "Checking your work" below).

## The shortest path: ask your AI helper

If you have an AI coding agent you are allowed to use, open it in your `agentuto` folder and paste this,
replacing the sentence in brackets with what you want. Agentuto does not provide or support any AI service.

```text
I want to add a private instrument to Agentuto, in the folder "local" inside this project. [Describe the experiment in one or two sentences: what is being simulated, which quantities the learner can change, and which quantity they should measure.]

Rules. All of them are mandatory.
- Write only inside the local folder: local/<id>/ for the instrument and local/courses.ts for a course. Do not create, change or delete anything else in the project, and do not touch git: no commits, no pushes, no branches.
- Start from the folder examples/local-module: copy it to local/<id>/ and change it. Keep the three files (module.ts, an engine, a renderer) and keep the import paths as they are.
- Do not install anything, do not use sudo or administrator rights, and do not read or print keys or .env files.
- The engine must be plain TypeScript with no DOM, no React and no Three.js. Use a fixed-step method such as RK4.
- Every number the engine reports must be declared in telemetryUnits in module.ts, with its unit ("dimensionless" if it has none).
- Work out one closed-form result by hand (not by running the engine) and put it in the manifest as `benchmark`: { time, expected }, as in the example. Show me the calculation.
- Run "npm run check:module -- local/<id>" and fix everything it marks with a cross. Do not weaken the benchmark to make it pass; if the engine and the hand calculation disagree, tell me which one you think is wrong and why.
- When it passes, run "npm run dev", open the address it prints, open the instrument, and tell me what you saw. If anything fails, stop and explain it in plain words before changing anything else.
- Say clearly that this instrument is unreviewed.
```

## By hand

1. Copy the folder `examples/local-module/` to `local/<id>/`, for example `local/pendulum/`. The folder name is the
   instrument's id: lower-case letters, digits and hyphens, starting with a letter.
2. In `local/<id>/module.ts`, set `id` to the folder name and fill in the rest of the manifest.
3. Change the engine and the renderer.
4. Run `npm run dev` and open the instrument from the course list, the Instruments page or the search box.

The example is a ball in free fall. Its numbers are checked against the closed form `y = y₀ + v₀t − ½gt²` every
time the project's tests run, so it is a safe model to copy.

### What `module.ts` must say

| Field | What it is |
|---|---|
| `id` | The folder name. Cannot be the id of a built-in instrument. |
| `title`, `description` | What it is called and what it does, in plain words. |
| `discipline`, `curriculum` | A subject and a source or topic label. Use "aligned with", never an affiliation. |
| `governingODE`, `formattedODE` | The governing equation as plain text, and the same for display. |
| `mode` | `"2D"` (a canvas, runs on any computer) or `"3D"` (needs WebGL). |
| `defaultParams` | The starting value of every parameter the engine takes. |
| `paramDescriptors` | One slider per parameter: `id`, `label`, `unit`, `min`, `max`, `step`, `defaultValue`. |
| `telemetryUnits` | Every channel the engine reports, apart from `t`, with its unit. |
| `load` | A function that fetches the engine and the renderer, so they cost nothing until opened. |

The app reads everything it shows about your instrument from this one object: the sliders, the telemetry units,
the Inquiry Log, the CSV export, the search. If something is missing, you will see a sentence saying what.

## A course of your own

Create `local/courses.ts`. It lists courses in the same form as the built-in ones, and a course may use your
instruments and the built-in ones:

```ts
export default [
  {
    id: 'mine',
    title: 'My own course',
    lead: 'Free fall, then a charge in a field.',
    modules: [
      { sandboxId: 'free-fall', measure: 'how long it takes to land from rest.' },
      { sandboxId: 'lorentz-force', measure: 'the cyclotron radius.' },
    ],
  },
];
```

A course code cannot be one the built-in courses already use.

## The checker

```bash
npm run check:module                       # every folder in local/
npm run check:module -- local/free-fall    # one folder
```

It runs your engine without a browser and prints one line per check, then a verdict. A cross fails (exit code 1); an
exclamation mark is a warning.

| Check | What it asks |
|---|---|
| Manifest | Every required field present and in range (the table above). |
| Engine loads | The engine is created without a browser. An engine that touches `window` or `document` fails here: keep all drawing in the renderer. |
| Engine contract | `init`, `reset`, `dispose`, `step`, `getState`, `setParameters`, `getParameters`, `getTelemetrySnapshot` all exist. |
| Telemetry channels | Every number the engine reports is declared in `telemetryUnits` with a unit, and every declared channel is reported. |
| Clock | `t` advances by exactly the step it is given. |
| Finite numbers | Nothing becomes NaN or infinite over 2000 steps at the defaults and 1000 steps with each slider at both ends. |
| Repeatable | Two identical runs give identical numbers (no `Math.random()` or clock inside the engine unless seeded). |
| Sliders reach the engine | `getParameters()` returns what was set, and moving each slider changes what is reported (a slider that changes nothing is a warning). |
| Benchmark | Your worked result is reproduced (see below). No benchmark is a warning. |
| Renderer | It has `mount`, `render`, `resize` and `unmount`. Drawing itself needs a browser and is not run. |

### The benchmark is the one that finds wrong physics

Every other check can pass for an engine that integrates the wrong equation. The benchmark can not, if it is honest:

```ts
// after 2 s from the defaults: 20 + 5·2 − ½·9.81·2² = 10.38 m, and 5 − 9.81·2 = −14.62 m/s
benchmark: { time: 2, expected: { height: 10.38, velocity: -14.62 } },
```

Work it out **by hand, from the equation**, never by reading the number off the engine: a benchmark copied from the
engine only proves the engine agrees with itself. `time` must be a whole number of 5 ms steps; `params` may set
other parameter values for the run; `tolerance` (relative, default 1e-6) may be loosened if the engine is a
numerical method with a known error. In the project's own tests, an engine with gravity wrong by 0.1% passes every
other check and is caught here.

Passing means the module is well formed and agrees with the result you worked out. It does not mean the physics is
right in cases you did not test.

## What you will see

- A **Local, unreviewed** badge on the instrument, its course card, the sandbox header, the Instruments page and in
  search results.
- On the home page, a short note saying how many instruments and courses were loaded, and, for any that were not,
  the file and the reason in one sentence. A broken module never stops the app or the other modules.
- A generic telemetry card listing every number your engine reports, with the units you declared.

## Checking your work

When it loads, Agentuto checks only the *form* of your module (the table above); the checker goes further and runs
the engine. Neither can check that your physics is right in general. Before you rely on it:

- Run `npm run check:module` and, above all, give the manifest a hand-worked `benchmark`.
- Work out a second result by hand at a different time or with different parameters, and compare it with what you see.
- Check the units on every slider and channel.
- Treat the instrument as a draft until someone with the right background has read it.

## What leaves your computer

Nothing, unless you use the optional AI tutor. If you open the tutor on one of your own instruments, its title,
equation, parameter values and a summary of its telemetry go to the AI provider you configured, as for any
instrument. Playlist generation never includes your private instruments.

## If you want to share it

- **Keep it for yourself, or in your own fork.** Agentuto is MIT-licensed; a fork needs nothing from anyone.
- **Propose it to the project by pull request.** It must be your own work, under the MIT licence, with no third-party
  material except under a compatible licence and with attribution. Materials you may keep privately but may not share
  stay in `local/`. It is then reviewed by a model family other than the one that wrote it (Constitution Art. 12.5)
  before it is listed as part of Agentuto.

To make the pull request, you need three things the project asks of every instrument. A private module can skip them;
a shared one cannot:

1. **A hand-worked `benchmark`** that `npm run check:module` holds the engine to (see above).
2. **A `guide`** in the manifest: three lab-protocol steps, at least one thing to explore, at least one question
   for the optional tutor. The example has one to copy.
3. **An honest `curriculum` line** naming the one course it is aligned with, for example `MIT 8.01 Classical Mechanics`.
   Courses describe topic alignment only, never affiliation.

Then, from the project folder:

```bash
npm run export:module -- local/<id> --course 8.01 --measure "how long a dropped ball takes to land." --dry-run
npm run export:module -- local/<id> --course 8.01 --measure "how long a dropped ball takes to land."
```

The first line only shows what would change. The second copies your module into `src/simulations/physics/<id>/`
(pointing its imports at the project), registers it, adds it to the course with your "you measure" line, and runs
`npm test`; if the tests fail it puts everything back. It refuses a module that has not passed the checker or is missing
the three things above, and says which. The id `free-fall` belongs to the shipped example; give your module an id of
its own.

It only writes files. It does not touch git, so nothing is committed or pushed until you do it. Afterwards:

1. `git switch -c feat/<id>`
2. `npm run verify && npm run smoke`
3. Delete or move `local/<id>/`: while both exist, the local copy is refused because its id is taken.
4. Commit, push, and open the pull request. The template walks you through the checklist.

Commits carry an email address; [CONTRIBUTING](../CONTRIBUTING.md) explains how to keep yours private.

If you would like your AI helper to prepare the module for sharing, this prompt keeps it from doing more than that:

```text
I want to share my private module local/<id> with the Agentuto project. Rules, all mandatory:
- Do not touch git, do not push, do not open a pull request. Do not change anything outside local/<id>/ except by running the export command below when I say so.
- Make sure module.ts has a hand-worked benchmark (show me the calculation), a guide (three protocol steps, something to explore, a tutor question) and a curriculum line that honestly names exactly one course code.
- Run "npm run check:module -- local/<id>" until nothing is marked with a cross.
- Then run "npm run export:module -- local/<id> --course <code> --measure \"<a sentence>\" --dry-run" and show me the output. Wait for me to say go before running it without --dry-run.
- If it refuses, explain the reason in plain words and fix only that.
```

## If something does not appear

| You see | It means |
|---|---|
| `id must match the folder name` | The `id` in `module.ts` differs from the folder it is in. |
| `... is not a key of defaultParams` | A slider names a parameter the engine would never receive. |
| `telemetryUnits must name every channel` | Declare every number the engine reports, with its unit. |
| `it raised an error while loading (...)` | The file has a mistake that stops it running; the message says which. Your AI helper can read the browser console, where the same list is printed. |
| nothing at all | `local/` must be at the top of the project, next to `package.json`, and each module's file must be named `module.ts`. Reload the page after adding a folder (the dev server notices it); if there is still nothing, restart `npm run dev`. |
