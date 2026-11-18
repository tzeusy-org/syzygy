# Declared audience in dossier briefs

## Patterns

- `R-DOSSIER-DECLARED-AUDIENCE-.*-RAW\.md`

## What was under review

[Observed, 2026-11-14] Released implementation slice `syzygy-fnry.17`, PR #818: the operator-declared audience in the authoring brief and rendered-design criteria, the criteria-bearing packet identity, and the missing-audience supervisor refusal. This implementation review binds no normative artifact.

## Last verdict of record, and where the findings landed

[Observed, 2026-11-14] Round 1 **CONFIRM** (`R-DOSSIER-DECLARED-AUDIENCE-1-RAW.md:2`) reviews source/evidence commit `05216cb11ae7ff6f5f57f72cb7ecbdf766bc23aa`. No outstanding source or test correction was evidenced. Resolved R1 records the initially omitted risk-floor declaration; the PR and delivery packet now declare medium risk, CC-BAR-5 floors 2/3 and CC-REV-1 class 6, independently confirmed by the reviewer. Criterion 7's post-retention campaign check and fresh landing runtime/check evidence remain separate obligations; this raw grants no merge permission. The wider `syzygy-fnry` outcome remains partial and the PR #817 round-3 owner gate remains held.


[Observed, 2026-11-17] Changed-subject guardian integration review **REVISE**, audience content **CONFIRM**, at `80e409087f49dc413b3a57ebbfb9f83466ef82d8` (`R-DOSSIER-DECLARED-AUDIENCE-GUARDIAN-1-RAW.md:2`). The required gate failed a real-tree census test timeout; later stages did not run. That failed attempt remains failed; no infrastructure exception was established.

[Observed, 2026-11-17] Diagnostic review confirms real-tree tier misplacement and a shared budget across independent placement scenarios (`R-DOSSIER-DECLARED-AUDIENCE-CENSUS-DIAGNOSTIC-1-RAW.md:2`). Committed correction review **CONFIRM** at `2020c29bb05cce19cf7cff8f1fd640448f632475` (`R-DOSSIER-DECLARED-AUDIENCE-CENSUS-CORRECTION-1-RAW.md:2`) preserves the real default loader, both placements and expected memberships, and the 5000 ms limit. It moves the file to integration and gives each placement its own case; net +1 case and unchanged logical coverage. The correction raw explicitly leaves terminal full verification and landing checks pending; it grants no merge permission. These three raws are retained verbatim. The original seven acceptance obligations and the wider outcome remain separate.


[Observed, 2026-11-18] Correction to the diagnostic summary above: the exact line is **Diagnostic verdict: CONFIRM test-tier misplacement; timeout cause remains Unknown** (`R-DOSSIER-DECLARED-AUDIENCE-CENSUS-DIAGNOSTIC-1-RAW.md:2`). The controlled budget probe does not establish the cause of the historical timeout. The earlier failed attempts remain failed.

[Observed, 2026-11-18] The previously retained final-retention review at `b19a0545c307d67ed44c23f437123a8c25db6815` records **Content verdict: CONFIRM** and **Final verification/readiness: NOT ESTABLISHED** (`R-DOSSIER-DECLARED-AUDIENCE-RETENTION-1-RAW.md:2`, line 3). It establishes content retention, not landing readiness.

[Observed, 2026-11-18] Two earlier reviews at `c206d7bbb68aebc22b4bbe6f72f8e8f0cfc6e597` are now retained verbatim: **Verdict: CONFIRM** for the two-file retention delta (`R-DOSSIER-DECLARED-AUDIENCE-RETENTION-C206-1-RAW.md:2`), and **Verdict: REVISE** for the failed verification event (`R-DOSSIER-DECLARED-AUDIENCE-VERIFICATION-C206-1-RAW.md:2`). Their scopes and distinct verdicts remain unchanged.

[Observed, 2026-11-18] Canonical whole-PR review at `e8c5c70cfdf4b5eeea7553cd6e58e243da95a2dc` records **Verdict: REVISE** (`R-DOSSIER-DECLARED-AUDIENCE-WHOLE-1-RAW.md:2`). R1 identifies main's independent use of brief v7 and requires a distinct v8 for the audience template. The same correction changes the two literal version expectations; it adds no test case. The review's ten-mutant record is retained verbatim in `docs/evidence/syzygy-fnry-17-canonical-review-mutations-2026-11-17.json`; it applies to that reviewed head. The two supervisor-refusal mutants failed by timeout. New-subject verification, independent correction review and the landing gates remain required; this entry grants no merge permission.


[Observed, 2026-11-18] The fresh correction review at `c6b3d48d7246ef7f69c47b3cbca0b4c05d52bfcd` records **Verdict: CONFIRM** and **Final verification/readiness: NOT ESTABLISHED** (`R-DOSSIER-DECLARED-AUDIENCE-V8-1-RAW.md:2`, line 3). It confirms the v8 correction and N1 retention repair, with 240 scoped cases passing and no required correction identified. This raw is retained verbatim. It verifies historical mutation retention and content equivalence, not a new mutation run. Complete final-retained-subject verification, current independent receipt and actual landing predicates remain required; no merge or wider-outcome closure is granted.
