# AGENTUTO AGENTS ARCHITECTURE
**Status:** Working Draft (v0.1)  
**Target:** Google Gemini AI Tutor, Structured Playlist Agent, and Antigravity IDE Bridge  

> **All agents:** the shared plan is [`docs/ROADMAP.md`](docs/ROADMAP.md); read it before picking up work.
> The rules in [`CONSTITUTION.md`](CONSTITUTION.md) override this file. Before a task, read the
> matching shared skill in [`.agents/skills/`](.agents/skills/README.md) (new-sandbox, new-course,
> deepen-module, design-system, faculty-review, ui-review). Antigravity loads them natively; other agents
> read the `SKILL.md` directly.

**Where effort goes (all agents, Constitution Art. 1.6–1.7, 6.4, 8.4, 10.9).** This is a small project. Faculty
comes first: instruments, courses, guides and labs that are correct where a learner meets them.
* Anchor each check on a published worked problem with its answer, and cite it. A model's own closed form
  comes second.
* Link open lectures, readings and videos instead of rewriting them. Copy only under a compatible licence.
* Act on a finding only if a learner would meet it. Record smaller ones once as known limits, and do not
  reopen them or an owner's decision without new evidence.
* No new tooling, themes or site features unless a learner, a contributor or the owner asks for them.
* In review, keep to the brief's scope. Style and structure preferences are not findings, and working code
  is not rebuilt to taste.
* Community work (triage, replies) is the owner's operational work, not a coding task.

---

## 0. Role Assignments (Constitution Art. 10)

| Role | Assigned to |
|---|---|
| Coder (default builder) | Gemini 3.8 Flash (Antigravity IDE). Gemini 4 Argon and Claude Opus 5.5 in Antigravity help when asked. |
| First-pass reviewer | Gemini 4 Argon (Antigravity IDE) |
| Specialist reviewer (faculty, second-pass code, UI/UX, escalation) and merger of reviewed branches (§5a) | Claude Opus 5.5 (Claude Code) |
| Verification & learner-experience reviewer (independent numeric re-checks, CI gate integrity, user-side review; Constitution Art. 10.7) | Meta Muse. It reads pushed `main` and may clone and test it on its own small Linux box. It files issues and comments in Discussions only: no commits, no pull requests. |
| Fallback (any role, when the agents above are unavailable) | DeepSeek V4 Flash (Hermes, VPS; GitHub `meeow-ai`), when the owner calls on it |

The owner updates this table when models change.

* **Family is the model's, not the tool's.** Opus 5.5 in Antigravity is the Claude family. So a change it builds is
  reviewed by Gemini. When both families write parts of one change, each part is reviewed by the other family
  (Art. 1.4, 10.8).
* **Muse's reports are inputs.** Like any review, re-run an issue or comment before acting on it, and rank it
  as Act, Record or Not a finding (`faculty-review`).

### 0a. Model routing inside Claude Code

When the owner has a Claude Code session do the work, the session runs on Opus 5.5 and routes it as below. The owner asks for this standing delegation here, so a session does not need to be told again. The definitions are in `.claude/agents/`.

| Work | Who does it |
|---|---|
| Plan, write the brief, talk to the owner, merge reviewed branches (§5a) | The Opus main session |
| A change beyond a few lines, from a written brief on a named branch | `coder` (Sonnet 5.5) |
| Long gate runs and long logs | `runner` (Haiku 5.5) |
| A wide code search | `Explore` (Haiku 5.5) |
| Reading a finished diff before a pull request opens | `reviewer` (Opus 5.5) |

How much of this a change needs depends on what it can break. The standard does not change with the size: expected values come first, every new check is shown to fail, and a report is re-run before it is acted on.

| Change | Route |
|---|---|
| A few lines, docs, agent config | Main session alone, then CI |
| Tests, checks, UI code | Main session writes the expected values, `coder` builds, one `reviewer` pass |
| Physics output | The same, plus a scan across the slider grid first and a reviewer from another family |
| A new instrument | Everything above, as `new-sandbox` sets out |

* An edit of a few lines stays in the main session: a subagent starts cold, and it draws on the same usage.
* For physics, the main session writes the closed-form check before `coder` writes the engine, so the code and its check do not come from the same run (Art. 1.5).
* Sonnet, Haiku and Opus are one model family. `reviewer` is an internal check and does not meet Art. 1.4 or 10.8; a change to physics output still needs a reviewer from another family before it counts as reviewed.
* Forks run on the main session's model, so use a named subagent for work meant for Sonnet or Haiku.
* Two writers never touch the same files at once.
* `npm run smoke` serves on a fixed port, so only one gate run at a time, across every session on this machine.
* `coder` runs the gates before it reports and CI runs them again, so run them locally again only if the commit changes after that.
* The main session searches the code and makes one-line look-ups itself.
* Show each new check failing with one or two mutants aimed at what it claims; a long list set in advance adds little. `reviewer` then tries to break the checks.
* A second `reviewer` round is for physics. Otherwise the main session fixes the findings and tests those fixes itself.

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
You are the Agentuto Socratic Tutor, a rigorous and encouraging mentor in {{discipline}}. The material covers AP/IB through undergraduate level; match the depth of the learner's questions.
You are pair-learning with a learner who is currently interacting with an active simulation.

Current Simulation Context:
- Concept: {{concept_title}}
- Governing Equations: {{governing_ode}}
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
The agent queries the Knowledge Graph for related concepts (via `prerequisite` and `analogous_to` edges) and generates an executable JSON playlist conforming to the `responseSchema` defined in `src/ai/playlistGenerator.ts`. The graph is in-memory (`src/knowledge/KnowledgeGraphClient.ts`, seeded from `seedData.ts`). The graph, tutor and playlist are frozen (owner, 2026-11-04): they keep working and nothing new is added; a SQLite graph is no longer planned (see `docs/ARCHITECTURE.md` §5).

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

### 5a. Branches and merging (owner, 2026-11-08)

Claude and Gemini work in the one checkout, one agent at a time, on local branches. The owner stays in the loop:
the owner assigns the task, a model from the other family reviews it, and nothing reaches GitHub until the owner
says so.

1. **Build.** Start from current `main` on `claude/<task>` or `gemini/<task>`. Commit locally. Never push the branch.
2. **Review.** A session from the other family reads `git diff main...<branch>`, re-runs what it reports, and ranks
   findings as Act, Record or Not a finding (`faculty-review`). The builder fixes them on the same branch; the
   reviewer may fix a few lines of documentation itself.
3. **Gates.** Run them on the branch before merging, since CI now runs only after the push: `npm test` and
   `npm run build` always; `npm run check:bundle` and `npm run smoke` as well when code changes.
4. **Merge.** `git switch main`, `git merge --squash <branch>`, one commit (`main` takes linear history only). Its
   body says what changed, who built it, who reviewed it, each finding and how it was checked, and what was not
   checked. It ends with both agents' trailers. This commit is the review record.
5. **Push and clean up.** Only when the owner approves that change: `git push origin main`, then
   `git branch -D <branch>`. Check that CI and the Pages deploy pass on the pushed commit; Pages deploys in
   parallel with CI, so if CI fails, fix it on `main` at once.

Changes to `CONSTITUTION.md` still go through a pull request, since merging that pull request is its ratification
("Ratification and amendments"). Contributors outside the project also use pull requests. Never force-push, and never use a bare
`git stash`.
* **Hand-off:** After an audit or fix pass, add `temp/CODEBASE_AUDIT_PASS_N.md` (what changed, how it was verified, open items). `temp/` is gitignored, so these reports are local only.
