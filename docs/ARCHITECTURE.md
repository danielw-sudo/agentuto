# AGENTUTO ARCHITECTURE SPECIFICATION
**Version:** 0.10.0-waves-extension  
**Scope:** Open-source, local-first interactive science sandbox covering AP/IB through undergraduate-level STEM topics  
**Primary Tech Stack:** Vite + React + TypeScript + Tailwind CSS + Three.js / Canvas2D  
**Knowledge Graph:** In-memory (`src/knowledge/`); SQLite (WASM / OPFS / Cloudflare D1) is planned, see §5  
**Optional AI Tutor:** Google Gemini API, bring-your-own-key (off unless the user adds a key); Antigravity IDE bridge for development  

---

## 1. Executive Summary & Vision

### 1.1 The Paradigm Shift
Many digital science education tools follow a **prescriptive, step-by-step tutorial model** tied to specific textbook chapters. That suits guided lessons; Agentuto explores the complementary approach of open-ended experimentation.

**Agentuto** inverts this relationship:
* **From "Follow Instructions" to "Independent Sandbox Exploration":** Learners are dropped into open, continuous parameter spaces (e.g., arbitrary magnetic field vectors, variable air drag coefficients, non-ideal resistance).
* **From "Calculate Answer" to "Empirical Data Collection":** The platform does not hand out calculated answers. Instead, it serves as a virtual experimental apparatus. Learners collect streaming telemetry and trigger **Raw Data Export (CSV)** to conduct their own error propagation, graphical analysis, and regression fitting in external tools (Excel, Google Sheets, Python/Pandas, Vernier Graphical Analysis, or Logger Pro), the same workflow as a lab report or investigation.
* **Curriculum-Agnostic & Global:** Fully English-first, categorized strictly by foundational scientific domains (Kinematics, Electromagnetism, Quantum/Atomic, Chemical Kinetics, Thermodynamics, Optics) rather than regional textbook page numbers.

### 1.2 Course Content & Usage Scope
* **Content:** Courses are described by their source and nature: topic alignment with AP/IB Physics syllabi and MIT OpenCourseWare physics and mathematics courses (8.01, 8.02, 8.03, 8.04, 8.044, 18.03). The project does not define, identify or target a particular user; labels describe topic alignment only, and Agentuto is not affiliated with or endorsed by these organizations.
* **Usability goal:** Running and using Agentuto should require no programming knowledge (see `docs/USER_GUIDE.md` §1.1).
* **AI is optional:** Every simulation, instrument and export works without AI. Optional AI features use the user's own provider account and key under that provider's terms (see README "AI Features & Disclaimer").
* **Contributors:** New sandboxes follow the modular 3-file pattern (`Engine.ts`, `Renderer.ts`, `Config.ts`); see [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## 2. Prior Art & Design Principles

### 2.1 Inspiration
The layout follows from two decisions made at the start: lightweight procedural graphics instead of downloaded 3D assets, and a full-bleed viewport with floating controls. Agentuto is an independent implementation; no third-party code or assets are included.

### 2.2 Principles adopted
* **Lightweight procedural graphics:** Coils, vectors, beams, field lines and apparatus are built from procedural Three.js / Canvas2D primitives (`CylinderGeometry`, `TubeGeometry`, `InstancedMesh`, `PointsMaterial`) rather than heavy 3D asset downloads.
* **Separation of concerns:** Physics engines are headless and independent of rendering and UI (see §3), so they can be tested against analytical solutions.
* **Open parameter spaces:** Continuous controls instead of fixed step sequences, so learners can explore edge cases.
* **Full-bleed viewport with a floating HUD:** The simulation fills the screen; controls float above it.

### 2.3 Interface building blocks
    1. **Dynamic Parameter Deck:** Continuous range sliders, numeric inputs, and toggleable environmental conditions (e.g., toggle gravity, toggle air resistance).
    2. **Telemetry Bar & Recorder:** Real-time mini-oscilloscope/ticker, sample rate selector, Start/Stop Recording button, and one-click **"Export Telemetry (.csv)"**.
    3. **Camera & Coordinate Gizmo:** Orthographic/Perspective toggles, axis grids, and virtual measurement tools (on-screen rulers, protractors, crosshairs).

---

## 3. Core Architecture: The Triad Decoupling

Agentuto enforces strict separation between numerical math, presentation, and user controls:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          1. REACT + TAILWIND UI                        │
│   (Floating HUD, Glassmorphic Sliders, CSV Export, Socratic AI Sidebar)│
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ Reactive State / Controller Events
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. SIMULATION CONTROLLER                        │
│   (Orchestrates Fixed Accumulator Loop, Telemetry Buffer, Render Sync) │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        3A. HEADLESS PHYSICS ENGINE   │  │    3B. VIEWPORT RENDERER     │
│  - Pure TypeScript (0 DOM / 0 WebGL) │  │  - Three.js (3D) OR          │
│  - Fixed Time-step Integrator        │  │  - Canvas2D / SVG (2D)       │
│  - State Vector & ODE Solvers        │  │  - Scene, Lighting, Shaders  │
│  - Telemetry Snapshot Generation     │  │  - Zero Business/Physics Math│
└──────────────────────────────────────┘  └──────────────────────────────┘
```

### 3.1 Core TypeScript Interfaces

```typescript
export interface SimulationState {
  time: number;
  [key: string]: number | number[] | boolean | string;
}

export interface TelemetryPoint {
  t: number;
  [key: string]: number;
}

export interface SimulationEngine<TParams = Record<string, number>, TState extends SimulationState = SimulationState> {
  init(params: TParams): void;
  reset(params?: TParams): void;
  dispose(): void;
  step(dt: number): void;
  getState(): TState;
  setParameters(params: Partial<TParams>): void;
  getParameters(): TParams;
  getTelemetrySnapshot(): TelemetryPoint;
}

export interface ViewportRenderer<TState extends SimulationState> {
  mount(container: HTMLElement | HTMLCanvasElement): void;
  render(state: TState, interpolationAlpha?: number): void;
  resize(width: number, height: number): void;
  unmount(): void;
}
```

A renderer is created through its registration and **may fail to exist**: a Three.js renderer builds its
WebGL context in its constructor, and a machine can refuse one. Renderer creation is therefore guarded and
`ViewportRenderer` is optional downstream — `App` asks `core/graphics/webgl.ts` once, falls back to a 2D
sandbox when the answer is no, and `ViewportContainer` renders an explanation instead of an empty canvas.
`core/graphics/sandboxChoice.ts` holds that decision as a pure function so the test suite can assert it
(Constitution Art. 1.5: a check that can fail is worth more than a claim).

---

## 4. Dual Loops: Physics Clock & Inquiry Loop

### 4.1 Technical Loop: Fixed-Timestep Accumulator
Decoupling physics from `requestAnimationFrame` prevents simulations from running 2.4x faster on 144Hz monitors than on 60Hz displays:

```text
Display Refresh (Variable, 60Hz - 144Hz)
               │
               ▼
      [requestAnimationFrame]
               │
               ├─► accumulator += frameDeltaTime
               │
               ▼
   ┌──────────────────────────────────────────────┐
   │ Loop: while (accumulator >= FIXED_DT)        │
   │   • Engine.step(FIXED_DT) (dt = 0.005s/200Hz)│
   │   • TelemetryRecorder.sample(engine.state)   │
   │   • accumulator -= FIXED_DT                  │
   └──────────────────────────────────────────────┘
               │
               ▼
   Calculate alpha = accumulator / FIXED_DT
               │
               ▼
   Renderer.render(currentState, alpha)
```

When the active sandbox changes, `useSimulationEngine` re-initialises the new engine and resets its `params` state to that sandbox's defaults, so the tutor context, CSV header and developer bridge always report the active sandbox's parameters. Pending roadmap presets are merged on top afterwards.

### 4.2 Pedagogical Inquiry Loop
1. **Hypothesize:** Consult the governing differential equation in the Knowledge Graph.
2. **Manipulate:** Adjust continuous parameters (mass, field vectors, damping).
3. **Run & Sample:** Observe real-time 3D/2D visual dynamics and stream telemetry into memory.
4. **Export Raw CSV:** Export clean RFC-4180 CSV data with scientific metadata headers.
5. **Socratic Reflect:** Discuss observed phenomena with the Gemini AI tutor without being spoon-fed final answers.

### 4.3 Inquiry Log (core, `src/core/journal/`)

The inquiry loop needs a durable record or it is a demonstration. Kaizen batch 2 ships the core only —
no UI — so the storage, validation and export rules are settled and checked before any panel draws them.

One entry records five things: `prediction` (stated before measuring), `parameters` (the conditions, so
the run is reproducible), `measurement` (channel, value, unit), `fit` (the learner's own fit over their
own measured series) and `explanation`. Two things it deliberately never records: any quantity computed
from the law under study (Art. 2.2 — a computed value is not evidence for the law) and anything about a
person (Art. 8.1).

Rules the code holds, each with a check behind it in `src/core/test/journal.test.ts`:

- **Read tolerant, write strict.** One storage key holds the whole log, so a corrupted entry is skipped
  rather than destroying its neighbours; a save that cannot complete throws `JournalStorageError`
  instead of pretending to have saved.
- **A failed save rolls the in-memory log back.** The one failure a learner would not forgive is a
  cheerful list of experiments that is not on disk.
- **CSV is RFC-4180.** Telemetry columns are numbers; journal rows are sentences. An unescaped comma or
  quote in a prediction corrupts the file, so fields are quoted when they need it and quotes are doubled.
- **`src/core` never imports `src/simulations`.** The journal takes a `JournalSandboxSchema` port;
  `catalogSchema.ts` is the single bridge, deriving parameter ranges from `paramDescriptors` and
  channel units from the sandbox's own declaration in the manifest (Art. 5.1).

**Channel units live in the manifest.** Each sandbox declares `telemetryUnits` (channel → unit) beside
its other metadata, and `npm test` holds that declaration against a real one-step engine run in both
directions: a channel the engine emits but nobody declared fails, and so does a declared channel the
engine never emits. `dimensionless` is written out rather than left empty, because an empty cell cannot
be told apart from a channel nobody got round to describing. A measurement's own unit is optional (the
owner's decision): when the manifest declares one, a reading in a different unit is refused rather than
silently mixed into the same column.

### 4.4 Inquiry Log panel (`src/ui/journal/`, `src/ui/components/InquiryLogDrawer.tsx`)

Kaizen batch 3a puts the log on screen. One `InquiryJournal` is created per session, so every sandbox
writes into the same record; the panel is a drawer rather than a modal, because an observation is
written while watching the apparatus, not from memory afterwards.

What the panel decides is separated from what it draws, so the rules are checked in Node:

- **`inquiryLogModel.ts` is pure.** Form text becomes an entry, a refusal finds its control, exports
  find their unit headers, storage is chosen — all without React, so `src/core/test/inquiryLogUi.test.ts`
  holds them.
- **Blank optional fields are absent, not empty.** `prediction.unit: ''` is refused by the journal, and
  an empty box is not a unit the learner failed to name. An unparseable number becomes `NaN` so the
  journal names the field, instead of the form having a second, disagreeing opinion about numbers.
- **Every unit on screen comes from the manifest.** The channel picker lists `schema.channels` and
  shows the unit declared beside each channel; nothing in `src/ui` spells a unit into its own code.
- **A refusal is shown where it happened.** `JournalValidationError.field` is mapped to the control
  that displays it, and an unknown path falls back to the top of the panel rather than disappearing.
- **The conditions recorded are the ones the learner could set.** Three sandboxes carry engine initial
  conditions with no slider (`lorentz-force initialSpeedY`, `faraday-induction coilRadius`/`initialZ`,
  `quantum-tunneling barrierPosition`/`initialX`); the snapshot is restricted to declared parameters,
  so a save cannot fail over a value no control on screen could change. `npm test` saves once from every
  sandbox in the manifest to keep that true.
- **Export states units it derived, never units it remembers.** The CSV's parameter-unit header comes
  from the manifest at export time, and an entry from a sandbox the manifest no longer describes is
  exported with no invented unit rather than throwing away the learner's older data.

The drawer also reports storage honestly: when the browser refuses local storage the journal falls back
to memory and the panel says the entries last only until the tab closes.

---

## 5. Knowledge Base & Curriculum Alignment

Agentuto's concept graph is aligned with topics from **MIT OpenCourseWare 18.03 (Differential Equations)** and **8.02 (Electricity & Magnetism)**, connecting AP/IB-level concepts with the underlying mathematics. Labels describe topic alignment only; Agentuto is not affiliated with or endorsed by MIT.

### SQLite Knowledge Graph Schema (Client-Side WASM / D1)
> **Status:** planned. The shipped graph is in-memory (`src/knowledge/KnowledgeGraphClient.ts` seeded from `seedData.ts`); the schema below is the target design.

```sql
CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    discipline TEXT NOT NULL,
    level TEXT NOT NULL,
    summary_markdown TEXT NOT NULL,
    governing_ode TEXT
);

CREATE TABLE IF NOT EXISTS concept_relations (
    source_concept_id TEXT NOT NULL,
    target_concept_id TEXT NOT NULL,
    relation_type TEXT NOT NULL, -- 'prerequisite' | 'generalization' | 'analogous_to'
    explanation TEXT,
    PRIMARY KEY (source_concept_id, target_concept_id, relation_type)
);

CREATE TABLE IF NOT EXISTS sandboxes (
    id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL,
    title TEXT NOT NULL,
    engine_type TEXT NOT NULL, -- '2D_CANVAS' | '3D_THREE'
    engine_module_path TEXT NOT NULL,
    default_parameters JSON NOT NULL,
    telemetry_schema JSON NOT NULL,
    FOREIGN KEY (concept_id) REFERENCES concepts(id)
);
```

---

## 6. Zero-Friction Deployment & Gemini AI Integration

### 6.1 Deployment Tiers
* **Local (current):** Run with `npm run dev` (see `docs/USER_GUIDE.md` §1.1).
* **GitHub Pages (configured):** `.github/workflows/pages.yml` builds `dist/` and publishes it once Repository → Settings → Pages → Source is set to **GitHub Actions**. The build runs with `VITE_BASE=/agentuto/` because a project page lives at a sub-path; every absolute URL in the shell (`index.html`, service-worker scope, manifest `start_url`) is base-aware so the same source also works at a domain root.
* **PWA:** The service worker and manifest let an installed build run offline. The worker derives its cache list from its own scope, so it works at `/` and at `/agentuto/`.
* **Other static hosts (configured, not deployed):** `vercel.json` and `public/_headers` support Vercel or Cloudflare Pages; all computation runs client-side.
* **Optional Tauri Binary (planned):** Native desktop installer (`.exe` / `.dmg`).

### 6.2 Dual-Bridge Google Gemini Agent (optional)
* **In-App Socratic Tutor:** Off unless the user adds their own key (stored only in `localStorage`). When used, the WebUI sends active parameters and telemetry extrema to the provider in the system prompt, guiding the learner Socratically. Use is governed by the provider's terms (see README "AI Features & Disclaimer").
* **Model:** Tutor and playlist generator share one constant, `DEFAULT_MODEL` in `src/ai/geminiClient.ts` (currently `gemini-3.8-flash`). A 404 from the API is reported as "model may have been retired". Check the [Gemini deprecations page](https://ai.google.dev/gemini-api/docs/deprecations) before changing it; `gemini-2.0-flash` was shut down on 2026-06-01.
* **Dynamic Playlists:** Gemini produces executable JSON study roadmaps using structured output (`response_schema`).
* **Antigravity IDE Bridge:** Global `window.__AGENTUTO_SIM__` allows developers and Antigravity agents to inspect states, run automated mathematical verification, and scaffold new sandboxes.

### 6.3 Bundle budget (Constitution Art. 8.2)

Art. 8 asks for a stated reason behind every runtime dependency and a bundle-size budget checked in CI. The budget is now defined and enforced by `scripts/check-bundle.mjs` (`npm run check:bundle`, run in CI after the build).

Sandboxes are loaded on demand (§6.4), so the budget has two meanings: what a visitor downloads to see the
catalogue (**first load**: the files `index.html` asks for) and the ceiling for opening everything.
Measured after the docked sandbox screen (2026-10-31), whole `dist/`, in the units the script prints:

| Measure | Measured | Budget |
|---|---|---|
| First load (entry, React, CSS) | 104.3 kB gzip | 107.4 kB |
| Largest single chunk (three.js) | 121.3 kB gzip | 180.7 kB |
| Total gzip (level 9) | 350.5 kB | 356.4 kB |
| Total raw | ~1.25 MB | 1.3 MB |

Before sandboxes were split out, a first visit downloaded the whole ~320 kB. The total budget rose from
322.3 kB to 356.4 kB (330,000 B to 365,000 B) because seventeen separately compressed chunks cost about
17 kB more than one: the price of the smaller first load.

Gzip is measured by that script (Node `zlib`), which is why its numbers differ slightly from the ones Vite prints; comparisons use one measurement or the other, never both. The budgets sit ~5% above baseline: ordinary feature work fits, a 20 kB regression does not slip through. Raising a budget is an owner decision and the PR states in one line why that weight is worth carrying.

### 6.4 Lazy sandboxes, addresses and offline

A manifest entry is plain data (title, parameters, units, mode) plus `load()`, which fetches the engine
and renderer. The catalogue, the journal and the playlist schema read only the data, so none of them
pulls a sandbox in. `src/app/routes.ts` gives every page an address (`#/`, `#/guide`, `#/sandbox/<id>`);
hash routes because the demo is a static site on a sub-path. The address bar is the single source of truth,
so the back button works and a sandbox can be linked to. `public/sw.js` fetches every built asset when it
installs (`precache.json`, written by the build), so an installed copy still works offline for sandboxes
its owner never opened.

### 6.5 Courses are data

`src/courses/courses.ts` lists six courses (8.01, 8.02, 8.03, 8.04, 8.044, 18.03), each an ordered set of sandboxes with a line on what the learner measures there; a sandbox may sit in more than one course. A course owns no engine or parameter. `npm test` holds the list against every sandbox's own `curriculum` string, so a sandbox that names a course and a course page that omits it cannot drift apart silently. The catalogue's filter chips are derived from the same data. The next pages (a course page, search) read it too.

### 6.6 Site pages and design tokens

The home page (a list of courses), a page per course (`#/course/<code>`) and an About page live in `src/ui/site/`; they read the course and manifest data and lie over the workspace, which is made inert while a page is open, so an experiment keeps running underneath. Only the home page is in the first download: the workspace, the instruments page, a course page and the About page each load on first use. Colour comes from tokens in `src/styles/globals.css` (light by default, dark on a dark OS preference or `data-theme="dark"`), mapped to Tailwind utilities (`bg-paper`, `text-muted`, `border-line`); fonts are system stacks, so nothing is fetched at run time. `npm test` measures every text pair against WCAG AA in both themes. The sandbox screen (`DockLayout`) is a header, the apparatus in the middle and a panel on each side with the transport row underneath; nothing floats over the apparatus. From 1024 px the panels take their own columns, below that they are closed by default and open as drawers. It forces the dark palette for its subtree (`data-theme="dark"`, because the canvases are dark), and the shared panel style reads the tokens. The instruments page, the drawers and the inside of the telemetry cards still carry older colour classes; no text anywhere is below 12 px (the labels that were 9 to 11 px are 12 px).

### 6.7 Search

Every site page has a search box (press `/`). `src/search/siteSearch.ts` builds its index at first use from data the app already has: course titles and codes, each instrument's title, equation, the "you measure" lines, curriculum, description and guide text, and the fixed pages. A new sandbox or course is therefore searchable as soon as it is registered. Every word typed must match (AND) at the start of a word, so `8.03` does not find `18.03`; case and accents are ignored; a title or code outranks the same word in a description. The index is a separate chunk fetched on first focus, so the first visit does not pay for it. No dependency.

---

## 7. Workspace Structure & Phased Implementation

```text
agentuto/
├── docs/ARCHITECTURE.md             # Unified Master Specification
├── AGENTS.md                        # Antigravity & Tutor Agent Rules
├── .gitignore
├── index.html
├── package.json
├── vite.config.ts                 # Vite + @tailwindcss/vite; Tailwind v4 is configured in CSS (no tailwind.config.ts)
└── src/
    ├── app/                         # App shell, routing, HUD layout
    ├── core/                        # Headless math, integrators (RK4), telemetry recorder, CSV exporter, inquiry log
    ├── knowledge/                   # SQLite WASM client & MIT 18.03/8.02 seed graph
    ├── ai/                          # Gemini client, Socratic prompts, playlist schema
    ├── simulations/                 # 3-file sandboxes (Engine, Renderer, Config)
    ├── ui/                          # Glassmorphic panels, sliders, sparklines, time scrubbers
    └── styles/                      # Tailwind styles
```

### Phased Roadmap & Live Status
* [x] **Phase 1: Foundation Scaffolding:** Vite + React + TypeScript + Tailwind v4 + core simulation contracts + unit test suite. *(Completed)*
* [x] **Phase 2: First 3D Sandbox:** Extract Lorentz Force ($q(\vec{E} + \vec{v} \times \vec{B})$) with RK4 integrator & procedural Three.js renderer. *(Completed)*
* [x] **Phase 3: Floating HUD & Telemetry CSV Export:** Glassmorphic controls, live recording ring buffer, RFC-4180 CSV exporter, and `window.__AGENTUTO_SIM__` developer bridge. *(Completed)*
* [x] **Phase 4: In-App Gemini Socratic Tutor:** Direct client-side Gemini REST API (BYOK in localStorage), live telemetry context injection, Socratic system prompt, and slide-out chat drawer. *(Completed)*
* [x] **Phase 5: Hybrid 2D Motion Sandbox & Multi-Sim Catalog:** MIT 18.03 Damped/Driven Oscillator with dual-view physical spring & 2D Phase Portrait ($x$ vs. $\dot{x}$), plus dynamic catalog switcher. *(Completed)*
* [x] **Phase 6: Relational Knowledge Graph & Dynamic Playlist Agent:** MIT 18.03 & 8.02 seed nodes with cross-discipline analogy edges, structured JSON playlist generator, and interactive Roadmap Deck with lab presets. *(Completed)*
* [x] **Phase 7: Empirical Lab Apparatus & Live Oscilloscopes:** On-screen draggable Virtual Caliper, Virtual Photogate sensor with transit period calculation, and real-time streaming oscilloscope sparklines. *(Completed)*
* [x] **Phase 8: Offline PWA & Static Edge Deployment:** Service Worker offline cache, Web App Manifest, vector icons, Cloudflare Pages `_headers`, and `vercel.json`. *(Completed)* The service worker (`public/sw.js`) is network-first for page navigations and unhashed shell files (falling back to cache offline) and cache-first only for hashed `/assets/*`; bump `CACHE_NAME` whenever the caching strategy changes.
* [x] **Phase 9: Non-Linear Chaos & The Lorenz Attractor:** 3D chaotic strange attractor, twin trajectory Lyapunov exponent divergence ($\Delta r(t)$), and bifurcation parameter deck. *(Completed)*
* [x] **Phase 10: In-App Empirical Lab Notebook & Regression Curve Fitter:** Ordinary least-squares linear ($y = mx + b$) & exponential ($y = A e^{Bx}$) regression engine, $R^2$ goodness-of-fit calculation, dynamic variable axis selection from buffered telemetry, and high-DPI canvas scatter plot with regression curves. *(Completed)*
* [x] **Phase 11: 3D Faraday's Law & Lenz's Induction Sandbox:** Coupled electrodynamics of oscillating magnetic dipole through solenoid coil ($\mathcal{E} = -d\Phi/dt$, $F_{Lenz} = -(d\Phi/dz)^2 \cdot v / R$), procedural copper solenoid tube, two-pole bar magnet, and dynamic glowing Lenz current indicator ring. *(Completed)*
* [x] **Phase 12: 2D Maxwell-Boltzmann Kinetic Theory & Ideal Gas Sandbox:** Hard-sphere elastic particle collision engine, movable compression piston ($PV = N k_B T$), real-time wall momentum impulse pressure calculation, and live dual-viewport with real-time molecular speed histogram vs analytical Maxwell-Boltzmann distribution curve. *(Completed)*
* [x] **Phase 13: Quantum Wave Mechanics & Schrödinger Tunneling Sandbox:** Unitary Time-Dependent Schrödinger Equation solved via complex Crank-Nicolson Cayley scheme ($i\hbar \partial\psi/\partial t = -(\hbar^2/2m)\nabla^2\psi + V(x)\psi$), finite rectangular potential barrier tunneling ($E < V_0$), evanescent spatial decay ($T \propto e^{-2\kappa d}$), and live probability partition analytics ($T + R + P_{\text{bar}} \equiv 1.0$). *(Completed)*
* [x] **Phase 14: Wave Optics: Double-Slit Interference & Diffraction Sandbox:** Dual-aperture and multi-slit diffraction grating engine ($I(y) = I_0 \text{sinc}^2(\beta) [\sin(N\alpha)/(N\sin\alpha)]^2$), physical laser wavelength-to-sRGB mapping, 2D optical bench with propagating Huygens wavefront ripples, and live laser screen projection with photometric intensity profile. *(Completed)*
* [x] **Phase 15: Celestial Gravitation & Keplerian Planetary Orbits Sandbox:** Gravitational central force problem in 3D ($\mathbf{a} = -\frac{GM}{r^3}\mathbf{r}$), Runge-Kutta 4th order integrator conserving angular momentum $\mathbf{L} = \mathbf{r} \times \mathbf{v}$ and specific orbital energy $\varepsilon = \frac{1}{2}v^2 - \frac{GM}{r}$ within $10^{-13}$, Kepler's three laws ($T^2 \propto a^3$), vis-viva equation, perihelion/aphelion analytics, bound elliptical ($e < 1$) and unbound hyperbolic ($e > 1$) escape trajectories, procedural glowing stellar core with coronal halo, orbiting planet with dynamic velocity and gravitational force vectors, and concentric reference equipotential orbit rings. *(Completed)*
* [x] **Phase 16: Projectile Kinematics & Quadratic Air Drag Sandbox:** Coupled 2D projectile mechanics ($m\ddot{\mathbf{r}} = m\mathbf{g} - \frac{1}{2}C_d\rho A|\mathbf{v}|\mathbf{v}$), 4th-order Runge-Kutta ballistics solver, dynamic ground collision detection with interpolated landing distance, real-time superimposition of theoretical vacuum parabola ($C_d = 0$) ghost curve, instantaneous velocity and drag vector arrows, and terminal velocity asymptotic convergence verified against analytical $v_{\text{term}}\tanh(gt/v_{\text{term}})$ to machine precision. *(Completed)*
* [x] **Phase 17: LCR Electrical Oscillators, AC Resonance & Phasor Analysis Sandbox:** Driven second-order electrical circuit solver ($L\ddot{q} + R\dot{q} + q/C = V_0\cos\omega t$), animated circuit schematic with flowing drift electrons proportional to current $i(t)$, real-time rotating complex phasor diagram showing $\mathbf{V}_R$, $\mathbf{V}_L$, $\mathbf{V}_C$, and $\mathbf{V}_0$ vectors with phase angle $\phi = \arctan((X_L - X_C)/R)$, dual-trace oscilloscope graticule with live $V(t)$ and $I(t)$ traces, and exact analytical verification of resonant frequency $f_0 = 1/(2\pi\sqrt{LC})$, impedance $Z = R$ at resonance, and peak steady-state current. *(Completed)*
* [x] **Phase 18: Standing Waves, Harmonics & Normal Modes Sandbox:** 1D wave equation on clamped string ($\frac{\partial^2 y}{\partial t^2} = v^2 \frac{\partial^2 y}{\partial x^2}$), wave speed $v = \sqrt{T/\mu}$, harmonic frequencies $f_n = n v / (2L)$, discrete stationary nodes holding $y(x_{\text{node}}, t) \equiv 0$ to $10^{-17}\text{ m}$, counter-propagating traveling wave decomposition, stationary envelope bounds $\pm 2A\sin(kx)$, harmonic energy oscillation bar shifting between kinetic and elastic potential, and multi-mode Fourier superposition. *(Completed)*
* [x] **Phase 19: Doppler Shift, Wavefront Compression & Mach Cones Sandbox:** Moving acoustic/electromagnetic wave source ($f' = f_0 \frac{c \pm v_r}{c \mp v_s}$), circular wavefront emission ring history, subsonic compression/stretching, supersonic shock envelope with Mach cone angle $\mu = \arcsin(1/M)$, oblique detector transit with dynamic Doppler frequency shift $f'(t)$, and real-time frequency sparklines. *(Completed)*
* [x] **Phase 20: Photoelectric Effect & Photon Quantization Sandbox:** Einstein's photoelectric equation ($K_{\max} = hf - \Phi = eV_{\text{stop}}$), monochromatic laser photon beam with dynamic wavelength $\lambda \to \text{sRGB}$, retarding anode potential slider, photoelectric work functions ($\Phi$ for Cesium, Sodium, Zinc, Platinum), kinetic energy vs frequency linear diagram with Planck constant slope $h$, and $I-V$ saturation current curve. *(Completed)*
* [x] **Phase 21: Carnot Cycle & Second Law of Thermodynamics Sandbox:** Reversible 4-stage cycle (isothermal expansion, adiabatic expansion, isothermal compression, adiabatic compression), dual synchronized $P-V$ and $T-S$ thermodynamic indicator planes, Carnot efficiency limit $\eta = 1 - T_C/T_H$, enclosed net work area $W_{\text{net}} = \Delta T \Delta S$, and Clausius reversibility $\oint dQ/T \equiv 0$. *(Completed)*
* [x] **Phase 22: Gauss's Law & Electrostatic Flux Symmetry Sandbox:** 3D numerical surface flux integration ($\oint_{\mathcal{S}} \mathbf{E} \cdot d\mathbf{A} = Q_{\text{enc}}/\varepsilon_0$), point charges and dipole configuration, procedural Gaussian sphere and cylinder surfaces with dynamic color-mapped electric field normal vectors $\mathbf{E} \cdot \hat{\mathbf{n}}$, strict dipole flux cancellation, and radial expansion invariance. *(Completed)*
* [x] **Phase 23: Linear Momentum & Center-of-Mass Invariance Sandbox:** 2D colliding hard-sphere pucks with variable coefficient of restitution ($e = 0..1$), strict conservation of total linear momentum $\mathbf{P} = \sum m_i \mathbf{v}_i$, constant Center-of-Mass velocity $\mathbf{V}_{\text{cm}}$, Koenig's kinetic energy decomposition ($K_{\text{total}} = K_{\text{cm}} + K_{\text{internal}}$), off-axis glancing collisions, and 50% internal energy dissipation in completely inelastic collisions. *(Completed)*
* [x] **Phase 24: RC & RL Transient Relaxation Circuits Sandbox:** First-order linear differential equations ($R \frac{dq}{dt} + \frac{q}{C} = V(t)$ and $L \frac{di}{dt} + Ri = V(t)$), capacitive time constant $\tau = RC$, inductive time constant $\tau = L/R$, analytical 4th-order Runge-Kutta numerical integration, dual-trace oscilloscope graticule with simultaneous input and output traces, $63.2\%$ rise and $36.8\%$ decay thresholds, and empirical verification of the 50% capacitive energy storage theorem ($U_{\text{cap}} = \frac{1}{2}CV^2$ stored vs $\frac{1}{2}CV^2$ dissipated as heat). *(Completed)*

* [x] **Kaizen batch 3a: Inquiry Log panel (`src/ui/journal/`, `src/ui/components/InquiryLogDrawer.tsx`):** A drawer that records a prediction, the conditions the run was made under, a measurement in the unit the manifest declares for its channel, an optional learner's own fit and a conclusion; journal refusals shown under the control they name; RFC-4180 CSV with manifest-derived parameter-unit headers plus JSON export; storage that says so when it is session-only. 7 checks. *(Completed)*

* [x] **Kaizen batch 2: Inquiry Log core (`src/core/journal/`):** Versioned entry (prediction, parameter snapshot, measurement, fit R², explanation), a localStorage adapter that degrades instead of throwing and rolls back a failed save, RFC-4180 CSV + JSON export, UTC streak and heatmap series, 6 checks. Zero UI. *(Completed)*

---

## 8. Current Simulation Catalog (17 Canonical Sandboxes)

| ID | Title | Discipline | Mode | Core Physics & Governing ODE |
|---|---|---|---|---|
| `lorentz-force` | Lorentz Force in E & B Fields | Physics (MIT 8.02) | 3D | $m\mathbf{a} = q(\mathbf{E} + \mathbf{v} \times \mathbf{B})$ — Helical orbits, cyclotron resonance, velocity selector |
| `harmonic-oscillator` | Damped & Driven Harmonic Oscillator | Math/Physics (MIT 18.03) | 2D | $m\ddot{x} + b\dot{x} + kx = F_0\cos\omega t$ — Phase portrait $(x, \dot{x})$, resonance peak, under/critical/overdamping |
| `lorenz-attractor` | Non-Linear Dynamics & Chaos | Math (MIT 18.03) | 3D | $\dot{x}=\sigma(y-x),\; \dot{y}=x(\rho-z)-y,\; \dot{z}=xy-\beta z$ — Butterfly attractor, Lyapunov divergence |
| `faraday-induction` | Faraday's Law & Lenz's Induction | Physics (MIT 8.02) | 3D | $\mathcal{E} = -d\Phi/dt,\; F_{Lenz} = -I(d\Phi/dz)$ — Eddy current braking, Ohmic power dissipation |
| `maxwell-boltzmann` | Maxwell-Boltzmann Kinetic Theory | Physics (MIT 8.044) | 2D | $PV = Nk_BT,\; f(v) = \frac{mv}{k_BT}e^{-\frac{mv^2}{2k_BT}}$ — Hard-sphere collisions, wall pressure, speed distribution |
| `quantum-tunneling` | Quantum Wave Mechanics & Tunneling | Physics (MIT 8.04) | 2D | $i\hbar \frac{\partial\psi}{\partial t} = -\frac{\hbar^2}{2m}\frac{\partial^2\psi}{\partial x^2} + V(x)\psi$ — Crank-Nicolson unitary evolution, barrier tunneling, $T \propto e^{-2\kappa d}$ |
| `wave-optics` | Wave Optics: Interference & Diffraction | Physics (MIT 8.03) | 2D | $I(y) = I_0 \text{sinc}^2(\beta) \cos^2(\alpha)$ — Huygens wave ripples, wavelength-to-RGB laser, fringe spacing $\Delta y = \lambda L/d$ |
| `kepler-orbits` | Keplerian Orbits & Celestial Mechanics | Physics (MIT 8.01) | 3D | $\ddot{\mathbf{r}} = -\frac{GM}{r^3}\mathbf{r}$ — Angular momentum & vis-viva conservation, Kepler's 3 laws ($T^2 \propto a^3$), circular, elliptic, & hyperbolic escape |
| `projectile-drag` | Projectile Kinematics & Quadratic Air Drag | Physics (MIT 8.01) | 2D | $m\ddot{\mathbf{r}} = m\mathbf{g} - \frac{1}{2}C_d\rho A|\mathbf{v}|\mathbf{v}$ — Atmospheric drag, ghost vacuum parabola, optimal angle shift, terminal velocity |
| `lcr-circuit` | LCR Electrical Oscillators & AC Resonance | Physics (MIT 8.02) | 2D | $L\ddot{q} + R\dot{q} + \frac{q}{C} = V_0\cos\omega t$ — Phase lag $\phi$, complex phasor plane, dual-trace oscilloscope, impedance $Z$ |
| `standing-waves` | Standing Waves, Harmonics & Normal Modes | Physics (MIT 8.03) | 2D | $\frac{\partial^2 y}{\partial t^2} = v^2 \frac{\partial^2 y}{\partial x^2}$ — Wave speed $v = \sqrt{T/\mu}$, stationary nodes, traveling wave decomposition, energy oscillation |
| `doppler-shift` | Doppler Shift & Wavefront Compression | Physics (MIT 8.03) | 2D | $f' = f_0 \frac{c \pm v_r}{c \mp v_s}, \; \sin\mu = \frac{c}{v_s}$ — Wavefront compression/stretching, oblique detector pass, supersonic shock envelope & Mach cone angle |
| `photoelectric-effect` | Photoelectric Effect & Photon Quantization | Physics (MIT 8.04) | 2D | $K_{\max} = hf - \Phi = eV_{\text{stop}}, \; f_c = \frac{\Phi}{h}$ — Quantum energy threshold, stopping retarding voltage, saturation photocurrent $I-V$ curve |
| `carnot-cycle` | Carnot Cycle & The Second Law of Thermodynamics | Physics (MIT 8.044) | 2D | $\eta = 1 - \frac{T_C}{T_H}, \; \oint \frac{dQ_{\text{rev}}}{T} = 0$ — Theoretical maximum thermal efficiency, dual P-V and T-S indicator diagrams, Clausius reversibility |
| `gauss-flux` | Gauss's Law & Electrostatic Flux Symmetry | Physics (MIT 8.02) | 3D | $\oint_{\mathcal{S}} \mathbf{E} \cdot d\mathbf{A} = \frac{Q_{\text{enc}}}{\varepsilon_0}$ — 3D numerical surface flux integration, dipole cancellation, Gaussian sphere/cylinder/box, charge invariance |
| `conservation-momentum` | Linear Momentum & Center-of-Mass Invariance | Physics (MIT 8.01) | 2D | $\frac{d\mathbf{P}_{\text{total}}}{dt} = \mathbf{0}, \; \mathbf{V}_{\text{cm}} = \text{const}$ — 2D elastic/inelastic collisions, Center-of-Mass velocity invariance, Koenig kinetic energy decomposition |
| `rc-rl-circuits` | RC & RL Transient Relaxation Circuits | Physics (MIT 8.02 / 18.03) | 2D | $R\frac{dq}{dt} + \frac{q}{C} = \mathcal{E}, \; L\frac{di}{dt} + Ri = \mathcal{E}$ — First-order linear ODEs, time constants $\tau = RC$ & $\tau = L/R$, 63.2% rise mark, 50% energy theorem |

