# Review 2 — implementation of PWB-REQ-002 class-granular extraction (PR #568)
Reviewed commit: a61e18d1b80ba45cda653af02c0de93861093ef9
Subject: PR #568 head `agent/syzygy-dov.15.2`, based on `origin/main` b77bae09; narrow round 2 over the round-1 findings F1 and F2
Verdict: REVISE

Reviewer: beads PR-review worker for `syzygy-lf6l` round 2 (fresh context), GitHub login Tzeusy.
Bar: the signed text of tag `pwb-class-granular-extraction-amendment-v1.0`
(`contracts/candidates/pwb-class-granular-extraction-amendment/SEMANTIC-DELTA.md`,
Hunk 2 and the Oracle/Falsifier of Hunk 9, and the Hunk 10 scenario "An
unenumerated heading is surfaced, not skipped"). Scope: the round-1 raw
`R-PWB-CLASS-GRANULAR-EXTRACTION-IMPL-1-RAW.md` F1 and F2, the repair commits
`d1ac9bd0`, `078075c1`, `a61e18d1`, and whether the count is pinned. The
round-1 notes F3 and F4 stay follow-ups and are not re-judged.

## Checks run at the reviewed commit

- [Observed] `npm run typecheck` exit 0.
- [Observed] `npx vitest run packages/three-surface-poc-core apps/three-surface-poc/src/polaris-project-shape.test.ts`:
  38 files passed, 2 skipped; 1319 tests passed, 2 skipped.
- [Observed] Round-2 rule-6 record
  `docs/evidence/pwb-class-granular-extraction-rule6-2026-11-02-round2.json`:
  4 mutants, all `killed`, each with `old`/`new` fragments, at `d1ac9bd0`.
  Not re-run by this review.
- [Observed] Three miscount mutants run by this review (below), restored
  after each run; `git status` clean afterwards.

## Round-1 findings

### F1 — closed

[Observed] The class aggregate denominator now carries
`unenumerated: { reason: 'unenumerated-heading', headings: N }` beside the
closed `reasons` (`project-shape-coverage.ts`, `unenumeratedCount` summed over
the class's sources). Polaris `denominatorText` renders it as
"denominator Unknown (missing-declaration, unenumerated-heading: 1)"; the
source row renders "(unenumerated-heading: 1)" after the closed reason and the
class-outcomes line adds "Source item denominator Unknown —
unenumerated-heading (1)". Both asserted in `polaris-project-shape.test.ts`;
the machine-answer field asserted in `project-shape-class-granular.test.ts`.
The reason word is present on the class and source denominators in the
machine answer and in Polaris. Mutants 1, 3 and 4 of the round-2 record kill
its removal.

### F2 — closed

[Observed] `extractCatalogEntries` now calls `unenumeratedHeadingsOf`
unconditionally; with no row heading found, `holders` is empty and the area is
the whole file, matching Hunk 2's "(or the whole file, when the level is 1 or
no such heading holds them)". The independent oracle `oracleUnenumerated` was
extended to the same case (`holders.size === 0`), and the new test "falls back
to the whole file when none of the nine headings is found" pins it (two
level-3 headings found, a level-4 one ignored). Mutant 2 of the round-2 record
kills the reverted guard.

## New finding

### R2-F1 — REVISE: the count of unenumerated headings is not pinned; a count fixed at 1 survives

Hunk 9 Oracle: "an independent scan of each enclosing section finds every
unenumerated heading, the count per source and class equals the count the
answer gives, and each one is surfaced". Falsifier: "an unenumerated heading
is skipped or mints an item or is miscounted". Hunk 2: the denominator renders
Unknown "with the reason `unenumerated-heading` and the count of such
headings".

[Observed] Every fixture that reaches the coverage, model or Polaris layers
has exactly one unenumerated heading, so each count assertion is `1`. The
whole-file test has two headings but asserts only the extractor's list, not a
count. Three mutants, each run by this review against
`project-shape-class-granular.test.ts` and `polaris-project-shape.test.ts`
(55 tests), all survived:

| Mutant | File | `old` | `new` | Outcome |
|---|---|---|---|---|
| aggregate count capped | `project-shape-coverage.ts` | `headings: unenumeratedCount } })` | `headings: Math.min(1, unenumeratedCount) } })` | survived (55 passed) |
| source count capped | `project-shape-coverage.ts` | `unenumeratedHeadings: headings.length }` (3 sites) | `unenumeratedHeadings: Math.min(1, headings.length) }` | survived (55 passed) |
| class-outcome count fixed | `project-shape-coverage.ts` | `...(unenumerated === 0 ? {} : { unenumeratedHeadings: unenumerated }),` | `...(unenumerated === 0 ? {} : { unenumeratedHeadings: 1 }),` | survived (55 passed) |

[Inferred] The code counts correctly today (`.length` and a sum), so no
rendered count is known to be wrong. The defect is evidence: the signed
Oracle names count equality and the Falsifier names "miscounted", and no test
can fail on a miscount, so that limb has no falsifying fixture (AGENTS.md
rule 6). Decision asked by the lead: the signed text does require the count N
to be pinned, not only its presence.

Required: a fixture with two or more unenumerated headings (in one source,
and summed across two sources of one class for the aggregate), asserting N at
the per-source class outcome, the source's own denominator, the class
aggregate, and the Polaris strings, against the independent oracle's count;
record the three mutants above (or equivalents) killed in a rule-6 record.

## Shared-model scope

[Observed] The round-2 change adds one optional field
(`ClassCoverage.denominator.unenumerated`) to the project shape and touches no
other surface's truth store.

VERDICT: REVISE
