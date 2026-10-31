---
name: design-system
description: Visual and interaction rules for Agentuto — design tokens, fixed colour meanings for physical quantities, maths-first typography, plot conventions, HUD layout and accessibility. Use for any UI, renderer or styling change.
---

# Design system: "calm lab notebook"

> The concrete palette and type scale are **pending the owner's choice** between 2–3 mockups. Until then,
> follow the rules and roles below, and don't invent new colours.

## Principles
- The simulation is the content; chrome stays quiet. Calm surfaces, one accent, colour reserved for meaning.
- Maths-first: KaTeX for every formula, tabular numerals for live values, units always shown.
- Motion only when it carries meaning. Respect `prefers-reduced-motion`.
- Light and dark themes (light is for printing and lab reports).

## Tokens (target: one source, e.g. `src/ui/tokens.ts` + CSS variables)
Shared by Tailwind UI, Canvas2D renderers and Three.js materials. **No raw hex/rgba literals or ad-hoc font
sizes in renderers or components** (Constitution Art. 7). Baseline on 2026-10-30: 320 hex literals (49
distinct), 75 `rgba()`, fonts at 9–12 px across at least four font stacks. All of that should migrate.

### Semantic colour roles (same meaning in every sandbox)
| Role | Used for |
|---|---|
| `qty.electricField` | **E** vectors and field lines |
| `qty.magneticField` | **B** vectors and field lines |
| `qty.velocity` | **v** |
| `qty.force` | **F** (net or named force) |
| `qty.acceleration` | **a** |
| `energy.kinetic` / `energy.potential` / `energy.thermal` | energy bars, plots |
| `charge.positive` / `charge.negative` | charges, current direction |
| `trace.primary` / `trace.secondary` / `trace.reference` | measured curve, comparison curve, analytical/ghost curve |
| `ui.accent`, `ui.text`, `ui.textMuted`, `ui.surface`, `ui.border`, `state.recording`, `state.warning` | interface |

### Type scale
Body ≥ 14 px, labels ≥ 12 px, and nothing smaller anywhere (axis ticks included). One UI sans-serif and one
monospace for numbers. KaTeX for maths.

## Plots and diagrams
- Axes always labelled with quantity and unit, e.g. `T (K)`; sensible tick density; gridlines use
  `ui.border`.
- Measured data uses `trace.primary`; analytical/reference curves are dashed `trace.reference`.
- Vectors: arrow length ∝ magnitude (state the scale), arrowheads sized in screen pixels.

## Layout
- HUD panels must not hide the plots, apparatus or captions a learner needs. Renderers receive the free
  content rectangle (target: the layout provides safe-area insets) and fit content to it.
- Phone widths (≥ 360 px): panels become a bottom sheet or tabs; the simulation stays visible. No
  horizontal scroll.
- Controls start with the basic parameters; advanced ones live in a collapsible section.

## Accessibility
WCAG AA contrast, visible keyboard focus, every control reachable by keyboard, `aria-label` on icon-only
buttons, and touch targets ≥ 40 px.

## Resources
Claude Design and Google Stitch (design skills, systems and samples) are the primary sources for mockups. A
proposed change to the look starts as a mockup the owner approves, not as code.

## Done when
`ui-review` passes at phone, tablet and desktop widths, and no new raw colour or font-size literals were added.
