# Agentuto

**Use it. Extend it privately. Share it if you're proud of it.**

A small library of physics and mathematics instruments that run in your browser, record real data, and ask you
to predict before you measure. Seventeen sandboxes across mechanics, electromagnetism, waves, thermodynamics,
quantum mechanics and circuits; every engine runs headless and is checked against a closed-form result. Local-first:
no account, no backend, no tracking. The [demo site](https://danielw-sudo.github.io/agentuto/) is a demonstration,
not a service.

| | What you do | Where it stands |
|---|---|---|
| **Use it** | Open the demo or run it on your computer; measure, keep an Inquiry Log, export CSV | Shipped. [User guide](docs/USER_GUIDE.md) |
| **Extend it privately** | Add instruments and courses of your own, by hand or with an AI helper; they stay on your machine, marked "Local, unreviewed" | Shipped. [Guide](docs/LOCAL_MODULES.md) |
| **Share it** | Keep a fork (MIT) or send a module to the project by pull request: `npm run export:module` prepares it | Shipped. [Guide](docs/LOCAL_MODULES.md#if-you-want-to-share-it) · [CONTRIBUTING](CONTRIBUTING.md) |

Agentuto provides the software, the docs and the checks. It does not provide or support any AI service, and it
takes no responsibility for the models, accounts or institutional rules of the people who use it.

MIT · React 19 + TypeScript + Vite + Three.js / Canvas2D · topic alignment with MIT OCW 8.01–8.044 and
18.03, and with AP/IB syllabi (alignment only — see the disclaimer at the end).

---

## What it does

- **Continuous parameter spaces**, not preset animations: field vectors, damping, wavelength, barrier
  width, restitution — whatever the physics allows.
- **Virtual instruments**: draggable caliper, photogate with transit timing, dual-trace oscilloscope,
  live telemetry sparklines.
- **Lab notebook**: least-squares (`y = mx + b`) and exponential (`y = A e^{Bx}`) regression over recorded
  telemetry, with R² and a scatter plot.
- **Open data**: RFC-4180 CSV export with metadata headers, ready for Excel, Sheets, Pandas or Logger Pro.
- **Optional Socratic tutor** on your own Gemini key. It is instructed not to hand out answers; it asks
  about your telemetry instead. Every simulation, instrument and export works with it switched off.

## Quickstart

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 43 checks: engines against analytical results, plus the app's own rules
npm run build        # tsc -b && vite build
npm run check:bundle # payload budget
```

`npm run verify` runs the last three in sequence. Node ≥ 20, npm ≥ 10.

**No GPU needed.** Twelve of the seventeen sandboxes draw to a 2D canvas and run on the CPU. The five
Three.js ones need WebGL; when a machine cannot provide it, the app opens on a 2D sandbox, badges the 3D
entries `needs WebGL`, and explains the limitation instead of showing an empty viewport. Nothing else —
sliders, telemetry, instruments, notebook, regression, CSV export — depends on the GPU. See
[`docs/USER_GUIDE.md` §6](docs/USER_GUIDE.md) for the two lists and what you will see.

## The seventeen sandboxes

| Sandbox | What you can measure | Mode |
|---|---|---|
| `lorentz-force` | helical orbits, velocity selector `v = E/B`, cycloidal drift | 3D |
| `harmonic-oscillator` | phase portrait, damping regimes, resonance curve | 2D |
| `lorenz-attractor` | twin trajectories, divergence, bifurcation | 3D |
| `faraday-induction` | induced EMF, Lenz braking, Joule heat | 3D |
| `maxwell-boltzmann` | hard-sphere gas, `PV = NkT`, speed distribution | 2D |
| `quantum-tunneling` | TDSE barrier transmission, evanescent decay | 2D |
| `wave-optics` | double slit, diffraction gratings, intensity profile | 2D |
| `kepler-orbits` | conic sections, angular momentum, `T² ∝ a³` | 3D |
| `projectile-drag` | quadratic drag vs vacuum ghost curve, terminal velocity | 2D |
| `lcr-circuit` | AC resonance, phasor diagram, dual-trace scope | 2D |
| `standing-waves` | normal modes, nodes, `v = √(T/μ)` | 2D |
| `doppler-shift` | wavefront compression, Mach cone angle | 2D |
| `photoelectric-effect` | threshold frequency, stopping potential, `I–V` curve | 2D |
| `carnot-cycle` | `P–V` and `T–S` diagrams, efficiency bound | 2D |
| `gauss-flux` | numerical surface flux, dipole cancellation | 3D |
| `conservation-momentum` | elastic and inelastic collisions, centre of mass | 2D |
| `rc-rl-circuits` | time constants `τ = RC`, `τ = L/R`, 63.2 % rise | 2D |

Five of these are Three.js scenes and need WebGL; the other twelve draw to a 2D canvas and run on a
machine with no GPU at all. When WebGL is unavailable the app opens on a 2D sandbox, marks the 3D ones
in the catalogue, and says what is missing instead of showing an empty viewport.

Governing equations, schemas and benchmark numbers live in [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) §8 and in
each sandbox's `*Config.ts`.

## How it is built

- **Headless engines.** Pure TypeScript in `src/core` and `src/simulations` — zero DOM, zero Three.js, zero
  React — so the physics can be integrated and asserted in CI. RK4, Cayley Crank–Nicolson, fixed 200 Hz
  step with delta-time clamping.
- **Procedural graphics.** Meshes and fields are generated from primitives; no 3D asset downloads.
- **Telemetry.** Ring buffer → sparklines → RFC-4180 CSV, with units carried from the config.
- **Knowledge graph and playlists.** Concept graph with prerequisite and analogy edges (in-memory today;
  SQLite is planned) feeding a structured JSON study roadmap.
- **Optional AI.** Client-side Gemini REST calls with your key in `localStorage`; nothing routes through a
  server of ours.

## Gates

Every commit to `main` has to pass all three, and CI runs them on Node 20 and 22:

- `npm test` — 51 checks: 25 engine, analytic and no-GPU verifications, one structural-contract pass,
  6 for the Inquiry Log core, 7 for the Inquiry Log panel, 1 for page addresses, 1 for courses, 1 for design tokens, 1 for search, 1 for the activity grid, 1 for the theme choice, 1 for independent closed forms of all 17 instruments, 1 for the community links, 1 for milestones and sound, 1 for private modules, 1 for the module checker and 1 for the share path.
- `npm run build` — TypeScript and production build, zero errors.
- `npm run check:module -- examples/local-module` — the module checker run on the shipped example, so the tool cannot rot.
- `npm run smoke` — a browser smoke test on the built site: opens every instrument from a cold link in headless Chrome
  (CPU only), checks that it draws and runs, then the home, course, About and Instruments pages, search and a phone-sized
  screen. CI runs it, and the Pages deploy runs it before publishing, so a broken instrument does not reach the demo. It
  needs Chrome, Chromium or Edge installed (set `CHROME_PATH` if it cannot find it) and a fresh `npm run build`.
- `npm run check:bundle` — payload budget, as the script prints it: first load 105.5 kB gzip (budget
  107.4), largest chunk 121.3 kB (budget 180.7), everything 356.4 kB (budget 356.4). Sandboxes are fetched
  when opened, so the catalogue does not wait for any of them.

## Docs

- [User guide](docs/USER_GUIDE.md) — running it, driving each sandbox, the instruments and the notebook.
- [Contributor guide](CONTRIBUTING.md) — the three-file sandbox pattern and the pull-request checklist.
- [Architecture](docs/ARCHITECTURE.md) — interfaces, loops, schemas, benchmarks, bundle budget.
- [Your own instruments](docs/LOCAL_MODULES.md) — private modules in `local/`, the `npm run check:module` checker, and a prompt for an AI helper.
- [Roadmap](docs/ROADMAP.md) — the shared plan, and what is not built yet.
- [Agents](AGENTS.md) · [Constitution](CONSTITUTION.md) — how the agents working on this repo are
  organised, and the rules that outrank them.
- [Devlog](docs/devlog.md) — dated record of what shipped.

## Contributors

Written by AI agents, working with the repository owner:

* Gemini 3.8 Flash
* Gemini 4 Argon
* Claude Opus 5.5
* DeepSeek V4 Flash

Work overlaps in practice; the roles in [`AGENTS.md`](AGENTS.md) §0 are a working default, not a hard
border.

## AI Features & Disclaimer

**AI is optional.** All simulations, instruments, the lab notebook and CSV export work fully without any AI. Optional AI features connect to a third-party provider using your own account and API key, and your use is governed by that provider's terms, including age and regional requirements, which vary by provider and location. Use only services you are allowed to use. If you need permission from a parent, teacher or institution to use an AI service, get it first, and follow the rules that apply to you: many schools, colleges and employers restrict generative AI.

Agentuto is an independent open-source project. It is not affiliated with or endorsed by MIT, the College Board (AP), the International Baccalaureate, Google or Anthropic; course labels describe topic alignment only. Simulations are educational models: verify important results independently.

## License

[MIT](LICENSE) — free to use, fork, modify and integrate, in education or commercially.
