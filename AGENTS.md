# AGENTUTO AGENTS ARCHITECTURE
**Status:** Working Draft (v0.1)  
**Target:** Google Gemini AI Tutor, Structured Playlist Agent, and Antigravity IDE Bridge  

> **All agents:** the shared plan is [`docs/ROADMAP.md`](docs/ROADMAP.md); read it before picking up work.
> The rules in [`CONSTITUTION.md`](CONSTITUTION.md) override this file. Before a task, read the
> matching shared skill in [`.agents/skills/`](.agents/skills/README.md) (new-sandbox, new-course,
> deepen-module, design-system, faculty-review, ui-review). Antigravity loads them natively; other agents
> read the `SKILL.md` directly.

---

## 0. Role Assignments (Constitution Art. 10)

| Role | Assigned to |
|---|---|
| Coder | Gemini 3.8 Flash (Antigravity IDE) |
| First-pass reviewer | Gemini 4 Argon (Antigravity IDE) |
| Specialist reviewer (faculty, second-pass code, UI/UX, escalation) | Claude Opus 5.5 (Claude Code) |
| Verification & learner-experience reviewer (independent numeric re-checks, CI gate integrity, user-side review; Constitution Art. 10.7) | DeepSeek V4 Flash (Hermes, VPS; GitHub `meeow-ai`) |

The owner updates this table when models change.

---

## 1. Overview of Agents

Agentuto employs a **dual-bridge agent framework** designed for two distinct audiences:
1. **The In-App Socratic Tutor Agent (optional):** Client-side learning companion running in the browser, off unless the user adds their own Google Gemini API key. Every simulation must work fully without it. Docs and UI must not define or target a particular user (age, school level); describe course content by source and nature only, and keep the "AI Features & Disclaimer" (README) intact.
2. **The Antigravity IDE Developer Agent:** An orchestration and authoring agent running inside the Antigravity IDE to inspect localhost simulations, generate new engine modules, and test mathematical models.

---

## 2. In-App Socratic Tutor Agent

### 2.1 Persona & Principles
* **Role:** A supportive, mathematically rigorous physics and calculus mentor.
* **Strict Pedagogy:** **Never reveal final answers or compute values for the student.**
* **Methodology:** Use Socratic questioning, point out anomalies in the learner's telemetry, and guide them to identify physical laws independently.

### 2.2 Telemetry-Aware System Prompt Pattern
```markdown
You are the Agentuto Socratic Tutor, a rigorous and encouraging physics and mathematics mentor. The material covers AP/IB through undergraduate level; match the depth of the learner's questions.
You are pair-learning with a learner who is currently interacting with an active simulation.

Current Simulation Context:
- Concept: {{concept_title}}
- Governing Differential Equation: {{governing_ode}}
- Active User Parameters: {{active_parameters}}
- Telemetry Summary: {{telemetry_summary}}

Pedagogical Rules:
1. Do not calculate the final numerical answer for the student.
2. If the student asks "What is the answer?", prompt them to look at specific telemetry variables or exported CSV columns.
3. Refer directly to the physical parameters they selected (e.g., "I notice you set mass to 2.5 kg...").
4. Keep explanations concise, conceptually deep, and math-grounded using KaTeX notation.
```

---

## 3. Dynamic Playlist Generator Agent

Users can ask for customized learning trajectories tailored to a topic they find difficult (e.g., *"I keep mixing up underdamped and critically damped systems"*).

### 3.1 Mechanism
The agent queries the Knowledge Graph for related concepts (via `prerequisite` and `analogous_to` edges) and generates an executable JSON playlist conforming to the `responseSchema` defined in `src/ai/playlistGenerator.ts`. The graph is currently in-memory (`src/knowledge/KnowledgeGraphClient.ts`, seeded from `seedData.ts`); SQLite is planned (see `ARCHITECTURE.md` §5).

### 3.3 Model
Both the tutor and playlist agent use `DEFAULT_MODEL` from `src/ai/geminiClient.ts` (currently `gemini-3.8-flash`). Verify against https://ai.google.dev/gemini-api/docs/deprecations before changing it.

### 3.2 Execution
The WebUI receives the JSON playlist and mounts an interactive "Roadmap Deck" in the sidebar, allowing the student to step through each curated sandbox with suggested parameter settings.

---

## 4. Antigravity IDE Developer Agent

For developers and educators building or refining simulations locally:

### 4.1 Localhost Bridge (`window.__AGENTUTO_SIM__`)
When running in development (`npm run dev`), the simulation mounts a global debugging and orchestration interface. It is guarded by `import.meta.env.DEV` in `src/app/App.tsx`, so production builds (`npm run build`, `vite preview`, deployed site) do not expose it. The live object also exposes `getActiveId()`:
```typescript
declare global {
  interface Window {
    __AGENTUTO_SIM__?: {
      getEngine(): SimulationEngine;
      getRenderer(): ViewportRenderer<any>;
      getRecorder(): TelemetryRecorder;
      injectParameters(params: Record<string, number>): void;
      triggerExportCSV(): string;
    };
  }
}
```

### 4.2 Developer Agent Tasks
* **Automated Mathematical Validation:** The Antigravity agent can trigger runs, capture CSV telemetry, and run Python verification scripts to confirm that numerical integration matches analytical solutions within $0.1\%$ error.
* **New Sandbox Scaffolding:** An agent can take a target physics equation (e.g., Biot-Savart circular loop) and generate the 3 required source files:
  * `[Concept]Engine.ts` (ODEs and fixed-step integrator)
  * `[Concept]Renderer3D.ts` (Procedural Three.js meshes)
  * `[Concept]Config.ts` (Slider ranges, units, and metadata)

---

## 5. Commit Conventions (all agents)

* **Message:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`), one line summary, then a short body of what changed and why. Sandbox work keeps the `(Batch N)` suffix.
* **Co-author trailer:** End each commit with the trailer for the agent that wrote it. GitHub only credits a co-author whose email is linked to a GitHub account, so use exactly:
  * Gemini (Antigravity): `Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>` (links to https://github.com/gemini-code-assist)
  * Claude (Claude Code): `Co-Authored-By: Claude <noreply@anthropic.com>` (model name may follow `Claude`)
  * DeepSeek (Hermes on a VPS): authored under its own `meeow-ai` account, `Co-Authored-By: DeepSeek V4 Flash <247033299+meeow-ai@users.noreply.github.com>`. That address is linked to a real account, so the credit does show up — and it is DeepSeek's own account, not another party's identity (Constitution Art. 11.3).
* Do **not** use `Gemini <gemini@google.com>`: that address is not a GitHub account, so the credit never shows up (Batches 19–24 used it). Also not the `gemini-code-assist[bot]` app identity: use the `gemini-code-assist` user account above.
* **Before committing:** `npm test` and `npm run build` must pass.
* **Hand-off:** After an audit or fix pass, add `temp/CODEBASE_AUDIT_PASS_N.md` (what changed, how it was verified, open items). `temp/` is gitignored, so these reports are local only.
