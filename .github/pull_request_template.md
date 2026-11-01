## What this changes and why

<!-- One or two sentences. For a new instrument: what does the learner measure, and in which course? -->

## Checklist

- [ ] `npm run verify` passes, and `npm run smoke` if I changed anything a visitor sees (CI runs both; this is so I find out first)
- [ ] Docs that quote a number (README, ARCHITECTURE) match what the suite and the bundle check print now
- [ ] This is my own work, under the MIT licence, with no third-party material except under a compatible licence and with attribution, and nothing in it is private to someone else

**If this adds an instrument** (for example from `npm run export:module`):

- [ ] `npm run check:module -- <folder>` passes
- [ ] The manifest's `benchmark` was worked out **by hand from the equation**, not read off the engine (show the working below)
- [ ] The manifest's `curriculum` says honestly which topics it is aligned with, and `guide` has a lab protocol, something to explore and a tutor prompt
- [ ] I know it will be reviewed by a model family other than the one that wrote it, and may be asked for changes before it is listed

## Hand-worked result (instruments)

<!-- e.g. "after 2 s from the defaults: 20 + 5·2 − ½·9.81·2² = 10.38 m, and 5 − 9.81·2 = −14.62 m/s" -->

## Who or what wrote this

<!-- A person, an AI tool (name it), or both. It is credited with a Co-authored-by line in the commit (AGENTS.md §5). -->

## Privacy

<!-- Commits carry an email address. If you would rather not publish yours, use your GitHub noreply address: CONTRIBUTING.md, "Keeping your email address private". -->
