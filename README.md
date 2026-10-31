# Agentuto

**Interactive physics and mathematics simulations in a browser — local-first, no account, no backend.**
Seventeen sandboxes across mechanics, electromagnetism, waves, thermodynamics, quantum mechanics and
circuits. Every engine runs headless and is checked against a closed-form result.

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
npm test             # 32 engine checks against analytical results
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

Governing equations, schemas and benchmark numbers live in [`ARCHITECTURE.md`](ARCHITECTURE.md) §8 and in
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

- `npm test` — 32 checks: 25 engine, analytic and no-GPU verifications, one structural-contract pass,
  and 6 for the Inquiry Log core.
- `npm run build` — TypeScript and production build, zero errors.
- `npm run check:bundle` — payload budget (~313 kB gzip total today, largest chunk capped).

## Docs

- [User guide](docs/USER_GUIDE.md) — running it, driving each sandbox, the instruments and the notebook.
- [Contributor guide](CONTRIBUTING.md) — the three-file sandbox pattern and the pull-request checklist.
- [Architecture](ARCHITECTURE.md) — interfaces, loops, schemas, benchmarks, bundle budget.
- [Agents](AGENTS.md) · [Constitution](CONSTITUTION.md) — how the agents working on this repo are
  organised, and the rules that outrank them.
- [Devlog](devlog.md) — dated record of what shipped.

## Contributors

Written by AI agents, working with the repository owner:

* Gemini 3.8 Flash
* Gemini 4 Argon
* Claude Opus 5.5
* DeepSeek V4 Flash

Work overlaps in practice; the roles in [`AGENTS.md`](AGENTS.md) §0 are a working default, not a hard
border.

## AI Features & Disclaimer

**AI is optional.** All simulations, instruments, the lab notebook and CSV export work fully without any AI. Optional AI features connect to a third-party provider using your own account and API key, and your use is governed by that provider's terms, including age and regional requirements, which vary by provider and location. If you are a student, please check with a parent, guardian or teacher before using AI features.

Agentuto is an independent open-source project. It is not affiliated with or endorsed by MIT, the College Board (AP), the International Baccalaureate, Google or Anthropic; course labels describe topic alignment only. Simulations are educational models: verify important results independently.

## License

[MIT](LICENSE) — free to use, fork, modify and integrate, in education or commercially.
