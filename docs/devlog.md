# Agentuto Devlog

## [2026-10-31] — INC-001: unrelated third-party credit, removed

**Impact:** no code, high owner cost — three pull requests of churn and a stop-the-line interruption.
**Cause:** the repository's first commit (`4c01cea`, the initial import) shipped an Acknowledgements
section crediting a project we have no relationship with as "inspiration". Agents wrote it during the
import; nobody asked whether the credit was wanted. A courtesy note is not a licence obligation, so it
should have needed the owner's word before it existed.
**Fix:** `README.md` section removed; the identical sentence in `ARCHITECTURE.md` §2.1 replaced by the
two design decisions it was describing; the dated devlog entry now reads "Card layout". PR #3.
**Rule, once:** acknowledgements name code or assets we actually incorporated, with the licence named
(Constitution Art. 11.2). A project we merely looked at gets no credit, and no agent adds courtesy text
about a third party unless the owner asks for it.
**Also:** the contributor list is names only — work overlaps, so a role description per agent was noise.

---

## [2026-10-31] — Landing Page Compaction, Autonomous Agent Attribution, Course Equivalence & Google Calendar Scheduler

**Status:** Completed & Verified  
**Author:** Gemini 3.8 Flash (Autonomous Coder, Antigravity IDE)  
**Co-Reviewers:** Gemini 4 Argon, Claude Opus 5.5  

---

### 1. Landing Page Redesign (Compact 3-Column Layout)
* **Card layout:** Replaced the heavy, 600px-tall cards in `LabIndexView.tsx` with a responsive **3-column card grid** (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
* **Card Anatomy:**
  * Top badges: Catalog index (`#01..#17`), Mode (`3D` / `2D`), active status indicator.
  * Title: 1-line bold header.
  * Equation Pill: Single-line monospace formula bar.
  * Truncated summary: 2-line clamped description.
  * Course Equivalence Pill: Real-time university alignment (e.g. `UTSG PHY151`, `MIT 8.01`, `AP Physics C`).
  * Action Buttons: Fast 1-click `Open` launch + `Manual` link.
* **Result:** Increased experiment density by ~3x; learners can easily browse 6–9 experiments per viewport instead of 1.5.

---

### 2. Scholarly Footer & Autonomous AI Agent Credits
* Added a comprehensive academic footer to `LabIndexView.tsx` with:
  * **Academic Mission & Independence:** MIT open-source license statement and non-affiliation disclaimer.
  * **Autonomous AI Agent Contributor Credits:**
    * **Gemini 3.8 Flash** — Autonomous Coder & Implementation Agent
    * **Gemini 4 Argon** — First-Pass Reviewer & Structural Builder
    * **Claude Opus 5.5** — Specialist Reviewer (Faculty Validation, UI/UX & Governance)
  * **Direct Feedback Links:** Links to GitHub Discussions, Issue Tracker, and Repository.

---

### 3. Multi-University Course Equivalence Registry & GitHub Discussions Crowdsourcing
* Created `src/knowledge/courseEquivalence.ts` mapping each of the 17 sandboxes to:
  * **MIT** (8.01, 8.02, 8.03, 8.04, 8.044, 18.03)
  * **UTSG (University of Toronto St. George)** (PHY151, PHY152, PHY252, PHY254, PHY256, MAT244)
  * **Secondary Curricula** (AP Physics 1/2/C, IB Physics SL/HL)
* Created `.github/ISSUE_TEMPLATE/` with:
  * `physics_discrepancy.yml`: Formal faculty discrepancy reporting with textbook citations.
  * `course_equivalence.yml`: Community crowdsourcing for university and high-school syllabus mappings.
* Added in-app link pointing to the GitHub Discussions crowdsourcing worksheet.

---

### 4. Local-First Study Planner & Google Calendar Scheduler (Solution A)
* Built `src/ui/components/StudySchedulerModal.tsx`:
  * **Zero OAuth / Zero API Keys:** Uses Google Calendar Web Intent templates to open 1-click calendar events directly in the user's browser with the experiment title, URL, and syllabus objectives pre-filled.
  * **100% Local-First & Private:** Checkpoints, target dates, and completion status are stored in `localStorage`. Zero server tracking.
  * Accessible from the top header bar (`Planner` button).

---

### Verification
* `npm test`: 24/24 core engine contract suites passing.
* `npm run build`: Zero errors, production bundle compiled cleanly in 3.35s.
