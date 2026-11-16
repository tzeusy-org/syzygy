# Review 3 — implementation of PWB-REQ-002 class-granular extraction (PR #568)
Reviewed commit: c658d4540330c819c59217ae20c6b8fc7bd0ceaa
Subject: PR #568 head `agent/syzygy-dov.15.2`, based on `origin/main` b77bae09; narrow round 3, test-only, over the round-2 finding R2-F1
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: beads PR-review worker for `syzygy-lf6l` round 3 (fresh context), GitHub login Tzeusy.
Bar: Hunk 9's Oracle ("the count per source and class equals the count the answer gives") and Falsifier ("miscounted") of the signed text of tag `pwb-class-granular-extraction-amendment-v1.0`, as quoted in the open thread https://github.com/tzeusy-org/syzygy/pull/568#discussion_r4439641888 (R2-F1). Scope: the diff `1953c0e3..c658d454` (commits `3a752ff1`, `c658d454`) only. F1, F2 and the closed decisions are not reopened.

## Verification performed

[Observed] Diff scope. `git diff --stat 1953c0e3 HEAD -- apps packages` lists two files, both tests: `apps/three-surface-poc/src/polaris-project-shape.test.ts` (+9) and `packages/three-surface-poc-core/src/project-shape-class-granular.test.ts` (+84). The only other changed path is the evidence record `docs/evidence/pwb-class-granular-extraction-rule6-2026-11-02-round3.json` (+354). No production file changed; `project-shape-coverage.ts` still hashes to the value the record names (`f7995e6b…`), as do both test files (`d44a44f7…`, `389335f5…`) and the runner (`2bc35be5…`).

[Observed] The pinned counts. The new fixtures hold more than one unenumerated heading per source with a different number per source: three headings in one source through the full pipeline (class aggregate `{ reason: 'unenumerated-heading', headings: 3 }`, source denominator `unenumeratedHeadings: 3`, catalog-entry class outcome `unenumeratedHeadings: 3`, and the Polaris strings `data-polaris-unenumerated="3"`, `catalog-entry: Unknown — unenumerated-heading (3 unenumerated heading(s))`, `denominator Unknown (missing-declaration, unenumerated-heading: 3)`, `Source item denominator Unknown — unenumerated-heading (3).`); and three sources of one class built directly through `buildProjectShapeCoverage` (read with 2, partial with 3, unknown-whole with 4), asserting each source denominator, each class outcome, `[2, 3, 4]` heading lengths and a class aggregate of 9 with the nine heading texts in order. Every expected number is a literal typed in the test; `oracleUnenumerated` (an independent heading scan already in the file) is used only to confirm the fixtures hold the counts the literals say.

[Observed] The three named survivors, re-run by me with `scripts/rule6_mutation_runner.py` on a spec of my own (the `old`/`new` fragments copied from the record, run on a clean tree at `c658d454`, `npm ci` first). Unmutated baseline: `project-shape-class-granular.test.ts` 36 of 36 pass. Then, each killed by at least one failed assertion (not an errored run):
- `headings: Math.min(1, unenumeratedCount)` at the class aggregate: killed, 2 failed.
- `unenumeratedHeadings: Math.min(1, headings.length)` at each of the three source-denominator sites: whole 1 failed, partial 1 failed, extracted 2 failed.
- `unenumeratedHeadings: 1` in the class outcome: read 2 failed, unknown 1 failed.
Also killed on my run: the aggregate not summing (`0 * sum`), the aggregate dropping the word, and all six Polaris mutants (`polaris-project-shape.test.ts`, 1 failed each, including the four count-string mutants). That is 8 of 8 mutants in `project-shape-coverage.ts` and 6 of 6 in `polaris.ts`. The working tree was clean after each run.

[Observed] Gates at `c658d454`: `npm run typecheck` exit 0; the two touched test files, 61 of 61 pass; `python3 scripts/check_governance.py` 32 OK, 21 WARN, 0 FAIL. `origin/main` (b77bae09) is an ancestor of the head, so no rebase was needed.

[Observed] Coverage of the record: it lists 15 mutants; I re-ran 14 (8 in `project-shape-coverage.ts`, 6 in `polaris.ts`). The fifteenth, `whole-file-fallback-skipped-when-no-catalog-heading` in `project-shape-extraction.ts`, is a round-2 mutant on a surface this round's diff does not touch; I did not re-run it and rely on the record for it.

## Findings

R2-F1: closed. The count is now pinned as a number, not a flag, at the class outcome, the source denominator, the class aggregate and the Polaris strings, per source and summed over the sources of one class, and the three named mutants are killed on a re-run. No revise finding.

Notes (none blocks):
- N1. The PR body's net test delta is stale. It reads `Tests: +30 (29 new file, 1 Polaris) ~4 extended` and a rule-6 line naming 24 mutants at `ce439b10`; rounds 2 and 3 added tests (round 3 alone added six `it` blocks to the granular file, which now holds 26 `it(` declarations, and nine assertion lines to the Polaris test) and two further rule-6 records (`…-round2.json`, `…-round3.json`). The test-growth gate wants the body to state the current net delta; update the body before or at merge (not a code change).
- N2. The coverage-direct fixture builds its input with an `as unknown as CoverageSourceInput` cast and a zero object id. Acceptable for a fixture that cannot enter through the manifest (the manifest names one catalog source), and the comment says why; a future change to `CoverageSourceInput` will not be caught by the compiler here. No action required.
