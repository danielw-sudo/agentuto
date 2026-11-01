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
1. **Register in Simulation Catalog:** Add your sandbox to `src/simulations/index.ts`.
2. **Add to Knowledge Graph:** Add your concept node and relations to `src/knowledge/seedData.ts`.
3. **Add Telemetry Card & Presets:** Add UI telemetry mappings in `LiveTelemetryCard.tsx` and curated presets in `RoadmapDeck.tsx`.
4. **Write Analytical Verification Test:** Add an analytical benchmark in `src/core/test/core.test.ts` (e.g., energy conservation, orbital period match, or harmonic frequency error $< 10^{-4}$).

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

## 5. Pull Request Checklist

Before submitting a Pull Request, make sure your branch satisfies:

* [ ] `npm test` passes with zero errors across all core verification tests.
* [ ] `npm run build` succeeds with zero TypeScript type errors.
* [ ] `npm run check:bundle` passes — the payload stays inside the Art. 8 budget.
* [ ] If the PR proposes an instrument that began as a private module (`docs/LOCAL_MODULES.md`): `npm run check:module -- <folder>` passes with a hand-worked `benchmark`, it is your own work under the MIT licence, and it contains no third-party material except under a compatible licence with attribution.
* [ ] Any new animation or transition respects `prefers-reduced-motion` (the global guard in `src/styles/globals.css` covers Tailwind's `animate-*` / `transition-*` utilities; hand-written CSS keyframes need their own media query).
* [ ] The physics engine contains zero DOM/Three.js/React imports (100% headless).
* [ ] `formattedODE` in your config uses clean Unicode math (not raw LaTeX backslashes).
* [ ] The renderer cleans up all event listeners, geometries, materials, and canvas contexts in `unmount()`.
* [ ] The PR description references the governing differential equations and physical benchmarks.
