# Polaris dossier S3 start gates

## Patterns

- `R-POLARIS-DOSSIER-S3-GATES-.*\.md`

## What was under review

Post-merge review of the S3 start gates and step guard, `packages/polaris-dossier/src/{init,reverify,preflight,gate-sources,governed}.ts` (PR #375, merged), and its repair (PR #379); implementation, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-POLARIS-DOSSIER-S3-GATES-1-RAW.md:3`) over `8df5be2a`: one blocking finding (the step guard never decided again whether the subject is governed, so a moved pin or a downgraded run record escaped the per-project statement), two revise findings (label and consent record shown from the run record; no machine reason codes) and ten notes. Repaired under `syzygy-qkea.23` with notes 4, 5, 7 (symlink and gitlink fixtures, case folding), 10 and 11; note 6 is `syzygy-qkea.21`. Round 2 `REVISE` (`R-POLARIS-DOSSIER-S3-GATES-2-RAW.md:3`) over `ec0a676b`: round-1 findings 1–3 confirmed repaired; one revise finding (6: the provider, and so the statement it selects, is read from the run record while the disclosure said it was decided again), repaired in PR #379 by an honest disclosure and a refusal when the tool or provider differs from the brief record's, with notes 10 and 12; the lead verifies the repair in place of a third round. Note 9 (over-refusal on a silent-to-no-drawer change) is left failing closed; note 8's invisible-character gaps go to `syzygy-qkea.23`'s follow-up
