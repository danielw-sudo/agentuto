---
name: deepen-module
description: Make an existing Agentuto topic teach better — layered depth (intuition, quantitative, derivation, edge cases), predict-observe-explain prompts, measurement tasks and misconceptions — without adding features. Use when improving a sandbox's guide section, presets or tutor prompts.
---

# Deepen a module

Advanced STEM is hard. Depth comes from **structure**, not more sliders. (Constitution Art. 2)

## 1. Four levels per module
1. **Intuition:** what happens qualitatively when you change one parameter? (No equations.)
2. **Quantitative:** measure a relationship and fit it in the Lab Notebook (linear or exponential).
3. **Derivation:** connect the measurement to the governing equation. Where does the slope come from?
4. **Edge cases:** limits, special cases, where the model breaks (e.g. walls make the system
   non-isolated, small-angle limits, 2D vs 3D forms).

## 2. Predict, observe, explain (POE)
For each key experiment, write:
- **Predict:** a question the learner answers *before* running ("Will the best angle with drag be above or
  below 45°?").
- **Observe:** the exact setting to run and what to record.
- **Explain:** a prompt that makes the learner reconcile the prediction with the result.

## 3. Measurements, not readouts
Point learners to quantities they measure themselves (clock, caliper, photogate, CSV). Never use a displayed
value derived from the law under study as evidence for it (e.g. a displayed Kepler period).

## 4. Misconceptions
List 2–4 common misconceptions for the topic, each paired with the experiment that confronts it. Examples:
"heavier objects fall faster", "current is used up in a resistor", "at resonance the amplitude peak is
exactly at ω₀" (it's slightly below when damped).

## 5. Tutor alignment
Quick prompts and Socratic hints should follow the POE steps and reference measurable quantities. The
tutor is optional, so every module must also work without it.

## 6. Verify
Every numeric statement is measured (`faculty-review`). Keep text concise, use KaTeX for maths, and keep
the reading level appropriate to the material.
