---
name: ui-review
description: Review Agentuto's interface in a real browser — layout at phone/tablet/desktop widths, HUD occlusion, typography, contrast, keyboard and touch — and report findings with screenshots and measurements. Use after any UI or renderer change and before marking UI work done.
---

# UI review

## Setup
`npm run dev`, then open `http://localhost:5173`. Switch sandboxes with the selector, or with
`window.__AGENTUTO_SIM__` in dev.

## Viewport matrix
Check each changed sandbox (and at least one 2D and one 3D sandbox) at:
- 375×812 (phone), 768×1024 (tablet), 1280×800 and 1440×900 (desktop).

## Checklist
1. **Occlusion:** are plots, apparatus, axis labels and captions visible with all panels open? Note
   anything hidden behind the header, control deck, telemetry card or bottom dock.
2. **Phone layout:** no overlapping panels, no clipped controls, no horizontal scroll, and the simulation
   is visible.
3. **Typography:** collect computed font sizes of visible text (script below); flag anything below 12 px.
4. **Contrast:** check text against its actual background. Translucent panels make automated checks
   unreliable, so verify suspicious pairs by eye in a screenshot.
5. **Content fit:** helper text matches the sandbox (no copy pasted from another sandbox), units are
   sensible, and no dimensionless "units".
6. **Keyboard and touch:** Tab through controls (visible focus), sliders work with arrow keys, touch
   targets ≥ 40 px, icon buttons have `aria-label`.
7. **Console:** no errors or warnings while switching sandboxes and exporting a CSV.

```js
// font-size census of visible text
const els=[...document.querySelectorAll('body *')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
els.reduce((m,e)=>{const s=getComputedStyle(e).fontSize;m[s]=(m[s]||0)+1;return m},{});
```

## Output
Findings ordered by impact, each with the viewport, a screenshot or measurement, the cause (file) if
known, and a suggested fix in the `design-system` vocabulary. Taste decisions go to the owner as options.

Baseline (2026-10-31): at 375 px the control deck and telemetry card overlap and the simulation is fully
hidden; at 1440×900 the Carnot P–V axes and apparatus sit behind HUD panels; 46 of 47 visible text
elements are 10–12 px; the "Empirical Lab Protocol" box shows the same oscillator-specific text in every
sandbox.
