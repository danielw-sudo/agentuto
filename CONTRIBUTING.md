# Contributing to Agentuto
**Developer & Authoring Guide for Interactive Science Sandboxes**

Thank you for your interest in contributing to **Agentuto**! Whether you are a physics educator, mathematics researcher, or frontend engineer, we welcome new simulation engines, UI improvements, bug fixes, and documentation.

---

## 1. Core Architectural Principles

When writing or reviewing code for Agentuto, adhere strictly to these architectural pillars:

### 1.1 The Headless Decoupling Rule (Non-Negotiable)
Physics engines in `src/simulations/physics/<concept>/` must be **100% pure TypeScript**:
* **ZERO** dependencies on the DOM (`window`, `document`, `HTMLElement`).
* **ZERO** dependencies on Three.js, Canvas2D, WebGL, or React.
* All mathematical states must be plain serializable JavaScript objects.
* This allows the physics engines to run headlessly inside unit tests (`npm test`), Node.js verification scripts, and Web Workers.

### 1.2 Fixed-Timestep Accumulator Loop
Never step physics inside variable `requestAnimationFrame` deltas directly. All engines step at a deterministic fixed rate:
$$\Delta t = 0.005\text{ s} \quad (200\text{ Hz})$$
The viewport renderer receives an interpolation factor $\alpha \in [0, 1)$ for butter-smooth visual rendering on high-refresh displays (60Hz–240Hz).

### 1.3 Strict Socratic Pedagogy
The user interface must **never** spoon-feed calculated answers. All features must provide instruments of discovery (rulers, photogates, telemetry logs, curve regressions, and open CSV exports).

---

## 2. The 3-File Sandbox Pattern

Every interactive sandbox in Agentuto lives in its own directory under `src/simulations/physics/<concept-id>/` and consists of 3 canonical files:

```text
src/simulations/physics/my-concept/
├── MyConceptConfig.ts    # Parameter types, slider bounds, and mathematical metadata
├── MyConceptEngine.ts    # Pure numerical ODE solver & telemetry snapshot generator
├── MyConceptRenderer2D.ts# Canvas2D (or 3D Three.js) visual presentation layer
└── index.ts              # Clean re-export barrel
```

---

## 3. Step-by-Step Guide: Adding a New Sandbox

Follow these 4 steps to add a new sandbox (e.g., `standing-waves` or `photoelectric-effect`):

### Step 1: Create the Config (`[Name]Config.ts`)
Define your parameter interface and slider descriptors implementing `ParameterDescriptor<number>`:

```typescript
// src/simulations/physics/my-concept/MyConceptConfig.ts
import { ParameterDescriptor } from '../../../core/types/simulation';

export interface MyConceptParams extends Record<string, number> {
  mass: number;
  length: number;
}

export const MY_CONCEPT_DEFAULT_PARAMS: MyConceptParams = {
  mass: 1.0,
  length: 2.0,
};

export const MY_CONCEPT_METADATA = {
  id: 'my-concept',
  title: 'My Science Concept',
  discipline: 'Physics',
  curriculum: 'MIT 8.01 Classical Mechanics',
  governingODE: '\\frac{d^2x}{dt^2} + \\omega^2 x = 0',
  formattedODE: 'ẍ + ω² x = 0', // Clean Unicode for the top HUD bar
  description: 'Exploration of physical principles.',
};

export const MY_CONCEPT_PARAM_DESCRIPTORS: ParameterDescriptor<number>[] = [
  {
    id: 'mass',
    label: 'Mass (m)',
    min: 0.1,
    max: 10.0,
    step: 0.1,
    defaultValue: 1.0,
    unit: 'kg',
    description: 'Inertial mass of the oscillating body.',
  },
];
```

### Step 2: Implement the Engine (`[Name]Engine.ts`)
Implement the `SimulationEngine<TParams, TState>` interface:

```typescript
// src/simulations/physics/my-concept/MyConceptEngine.ts
import { SimulationEngine, SimulationState, TelemetryPoint } from '../../../core/types/simulation';
import { MyConceptParams, MY_CONCEPT_DEFAULT_PARAMS } from './MyConceptConfig';

export interface MyConceptState extends SimulationState {
  time: number;
  position: number;
  velocity: number;
}

export class MyConceptEngine implements SimulationEngine<MyConceptParams, MyConceptState> {
  private params: MyConceptParams = { ...MY_CONCEPT_DEFAULT_PARAMS };
  private time: number = 0;
  private x: number = 0;
  private v: number = 0;

  init(params: MyConceptParams): void {
    this.reset(params);
  }

  reset(params?: MyConceptParams): void {
    if (params) this.params = { ...params };
    this.time = 0;
    this.x = 0;
    this.v = 0;
  }

  dispose(): void {}

  step(dt: number): void {
    // Implement Runge-Kutta 4th Order or Velocity Verlet
    this.time += dt;
  }

  getState(): MyConceptState {
    return { time: this.time, position: this.x, velocity: this.v };
  }

  setParameters(params: Partial<MyConceptParams>): void {
    this.params = { ...this.params, ...params } as MyConceptParams;
  }

  getParameters(): MyConceptParams {
    return { ...this.params };
  }

  getTelemetrySnapshot(): TelemetryPoint {
    return { t: this.time, position: this.x, velocity: this.v };
  }
}
```

### Step 3: Implement the Renderer (`[Name]Renderer.ts`)
Implement `ViewportRenderer<TState>` using either Canvas2D or Three.js:

* **Canvas2D (`ViewportRenderer<MyConceptState>`):** Always support high-DPI scaling via `setTransform(dpr, 0, 0, dpr, 0, 0)`.
* **Three.js (`ViewportRenderer<MyConceptState>`):** Always null out mesh, light, and geometry references in `unmount()` to prevent memory leaks during sandbox switching.

### Step 4: Register & Benchmark

The quickest route is not to edit the registry by hand. Write the instrument as a private module (`docs/LOCAL_MODULES.md`,
starting from `examples/local-module`), get it through `npm run check:module`, and run `npm run export:module` (section 5), which
does the registration below for you. To do it by hand, an instrument needs the following, and the tests enforce each:

1. **A manifest** (data plus a `load()` that fetches the engine and renderer) registered in `src/simulations/index.ts`, with
   `telemetryUnits` for every channel the engine reports. A test holds the declaration against a real engine run, in both directions.
2. **A place in a course** in `src/courses/courses.ts`, with a "you measure" line. The course code must be named by the manifest's
   `curriculum` text and the reverse; a test holds the two together.
3. **A guide** (`labProtocol`, `whatToExplore`, `quickPrompts`): in the manifest, or in `src/simulations/sandboxGuides.ts`.
4. **An analytical benchmark**: a worked-by-hand `benchmark` in the manifest, checked by `npm run check:module`, and for a
   built-in instrument a check against a closed form in `src/core/test/core.test.ts` (energy conservation, an orbital period,
   a harmonic frequency to better than $10^{-4}$) that does not reuse the engine's own constants (Constitution Art. 1.5).

Optional: a concept node in `src/knowledge/seedData.ts`, curated presets in `RoadmapDeck.tsx`, and a hand-built card in
`LiveTelemetryCard.tsx` (without one the instrument gets a generic card that lists what its engine reports, with units).

---

## 4. Local Development Setup

```bash
# 1. Clone your fork
git clone https://github.com/danielw-sudo/agentuto.git
cd agentuto

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev

# 4. Run the core physics test suite
npm test

# 5. Verify the production build
npm run build

# 6. Check the payload against the bundle budget
npm run check:bundle
```

---

## 5. Sharing a private module

If you built an instrument in `local/` (`docs/LOCAL_MODULES.md`) and want it in the project, `npm run export:module` does the
mechanical part: it copies the module into `src/simulations/physics/<id>/`, registers it, adds it to one course, runs the
tests, and undoes itself if they fail. It will not run on a module that has not passed `npm run check:module`, has no
hand-worked `benchmark` or no `guide`, or whose `curriculum` line does not honestly name its course. Then you make the
branch, run `npm run verify` and `npm run smoke`, and open the pull request; the template has the checklist.

A shared instrument is yours, under the MIT licence, with no third-party material except under a compatible licence and
with attribution (Constitution Art. 11.2 and 12.5). It is reviewed by a model family other than the one that wrote it
before it is listed as part of Agentuto, and may be sent back for changes.

### Keeping your email address private

Every commit carries an email address, and a public repository publishes it. GitHub gives each account a private
address that is credited to you all the same:

1. On GitHub, open Settings, then Emails. Tick **Keep my email addresses private**, and **Block command line pushes that
   expose my email**. Copy the address shown, which looks like `12345+yourname@users.noreply.github.com`.
2. In the project folder, set it for commits you make there: `git config user.email "12345+yourname@users.noreply.github.com"`.

The commit trailer for an AI helper that wrote part of the change is in `AGENTS.md` §5.

## 6. Pull Request Checklist

Before submitting a Pull Request, make sure your branch satisfies:

* [ ] `npm test` passes with zero errors across all core verification tests.
* [ ] `npm run build` succeeds with zero TypeScript type errors.
* [ ] `npm run check:bundle` passes — the payload stays inside the Art. 8 budget.
* [ ] `npm run smoke` passes if you changed anything a visitor sees (it needs Chrome, Chromium or Edge, and a fresh `npm run build`); CI runs it either way.
* [ ] If the PR proposes an instrument that began as a private module (`docs/LOCAL_MODULES.md`): `npm run check:module -- <folder>` passes with a hand-worked `benchmark`, it is your own work under the MIT licence, and it contains no third-party material except under a compatible licence with attribution.
* [ ] Any new animation or transition respects `prefers-reduced-motion` (the global guard in `src/styles/globals.css` covers Tailwind's `animate-*` / `transition-*` utilities; hand-written CSS keyframes need their own media query).
* [ ] The physics engine contains zero DOM/Three.js/React imports (100% headless).
* [ ] `formattedODE` in your config uses clean Unicode math (not raw LaTeX backslashes).
* [ ] The renderer cleans up all event listeners, geometries, materials, and canvas contexts in `unmount()`.
* [ ] The PR description references the governing differential equations and physical benchmarks.
