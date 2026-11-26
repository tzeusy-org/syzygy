# Dossier Pole hue as identity

## Patterns

- `syzygy-5dhm-56/R-POLE-HUE-.*-RAW\.md`

## What was under review

[Observed] The change for bead syzygy-5dhm.56 (PR #1009) at commit `463c0f8f1662d5e2e7b35531e42ced1a8f0cdfea`. It covers the Pole hue rules and their propagation in `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`, the colour tests and the `poleHueInput` fixture, the rule-6 and before/after records under `docs/evidence/syzygy-5dhm-56/`, and the adoption row, which was then A-319 and is now A-320.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-5dhm-56/R-POLE-HUE-1-RAW.md:3`) with one blocking finding and three non-blocking ones. All four were repaired in commit `10998aebfb15a8341b12be305ed1cb5c46514a14`, which row A-320 names after the first code commit:

- F1: callout tones read evidence-state colours. They now take the region's accent, and the run notices are neutral.
- F2: the base sheets drew the decorative accent on local pages. On a local page those rules are now overridden.
- F3: Pole hues wrapped past six. A seventh Pole onward is now neutral.
- F4: the positional sweep covered only the rendered pages. A source-module sweep now runs beside it.

Each repaired predicate has a mutant that the tests kill (`docs/evidence/syzygy-5dhm-56/pole-hue-repair-mutants-2026-11-26.json`). No confirmation round was run (one non-gating review under D10), so no review has read the repaired bytes.
