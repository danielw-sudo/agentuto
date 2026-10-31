# Agentuto shared skills

> **Status:** in force with `CONSTITUTION.md` v1.0 (ratified 2026-10-31).

Workspace skills shared by every agent on this project. Google Antigravity loads `.agents/skills/<name>/SKILL.md`
natively. Claude Code and other agents: read the matching `SKILL.md` before starting a task of that kind
(`AGENTS.md` points here).

| Skill | Use it when |
|---|---|
| [`new-sandbox`](new-sandbox/SKILL.md) | adding a simulation |
| [`new-course`](new-course/SKILL.md) | adding a course or module built from sandboxes |
| [`deepen-module`](deepen-module/SKILL.md) | making an existing topic teach better (levels, predictions, misconceptions) |
| [`design-system`](design-system/SKILL.md) | any UI or renderer change: tokens, colour meanings, type, layout |
| [`faculty-review`](faculty-review/SKILL.md) | checking physics/maths correctness of engines, docs, presets, prompts |
| [`ui-review`](ui-review/SKILL.md) | checking layout, readability and accessibility in a real browser |

Rules that apply to all of them live in [`CONSTITUTION.md`](../../CONSTITUTION.md). Where a skill describes
the **target architecture** (manifest v2, shared kit, design tokens, course data), it says so; until those
exist, follow the "today" notes.
