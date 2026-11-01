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
- Tell me one closed-form result you can check the engine against, work it out by hand, and compare it with what the engine reports at one moment in time. Tell me the two numbers.
- When you are done, run "npm run dev", open the address it prints, open the instrument, and tell me what you saw. If anything fails, stop and explain it in plain words before changing anything else.
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

## What you will see

- A **Local, unreviewed** badge on the instrument, its course card, the sandbox header, the Instruments page and in
  search results.
- On the home page, a short note saying how many instruments and courses were loaded, and, for any that were not,
  the file and the reason in one sentence. A broken module never stops the app or the other modules.
- A generic telemetry card listing every number your engine reports, with the units you declared.

## Checking your work

Agentuto checks the *form* of your module when it loads (the table above). It cannot check that your physics is
right. Before you rely on it:

- Work out one result by hand and compare it with the engine at a known time, as in the prompt above.
- Check the units on every slider and channel.
- Treat the instrument as a draft until someone with the right background has read it.

## What leaves your computer

Nothing, unless you use the optional AI tutor. If you open the tutor on one of your own instruments, its title,
equation, parameter values and a summary of its telemetry go to the AI provider you configured, as for any
instrument. Playlist generation never includes your private instruments.

## If you want to share it

- **Keep it for yourself or your own fork.** Agentuto is MIT-licensed; a fork needs nothing from anyone.
- **Propose it upstream** by pull request ([CONTRIBUTING](../CONTRIBUTING.md)): it must be your own work, under the
  MIT licence, with no third-party material except under a compatible licence and with attribution. It is then
  reviewed (Constitution Art. 12.5) before it is listed as part of Agentuto. Materials you may keep privately but
  may not share stay in `local/`.

## If something does not appear

| You see | It means |
|---|---|
| `id must match the folder name` | The `id` in `module.ts` differs from the folder it is in. |
| `... is not a key of defaultParams` | A slider names a parameter the engine would never receive. |
| `telemetryUnits must name every channel` | Declare every number the engine reports, with its unit. |
| `it raised an error while loading (...)` | The file has a mistake that stops it running; the message says which. Your AI helper can read the browser console, where the same list is printed. |
| nothing at all | `local/` must be at the top of the project, next to `package.json`, and each module's file must be named `module.ts`. Reload the page after adding a folder (the dev server notices it); if there is still nothing, restart `npm run dev`. |
