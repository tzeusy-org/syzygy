# Dossier choice floor 2.37

## Patterns

- `syzygy-5dhm-43/R-CHOICE-FLOOR-.*-RAW\.md`

## What was under review

[Observed] The MODIFIED REQ-polaris-generation-034 version 2.33 in `openspec/changes/dossier-choice-floor/` (check's `readerAdvice.choiceFloor`; bead syzygy-5dhm.43), its implementation and adoption row A-321, bound by the commit in the raw's head. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-5dhm-43/R-CHOICE-FLOOR-1-RAW.md:3`) with one blocking finding (F1) and five non-blocking (F2 to F6). All six were repaired in the adoption row, the spec, `design.md` (section "Review (R-CHOICE-FLOOR-1)" there gives each disposition), the implementation and its tests; none was overruled and no confirmation round was run (one non-gating review under D10), so the adopted spec digest differs from the reviewed one (`55f55146dc0e4112fc8ae09ffdb8bf0f2f5018b2744cdf768a38dacf14f69918`); no review has read the repaired bytes.

[Observed] The change was then rebuilt as version 2.37 over the source-example advice 2.36 (spec commit `7a55940f1e683f99de40d1a53a8c81e0372cc36f`), because the figure plan took 2.33 and versions 2.34 to 2.36 landed first, and its row was renumbered A-336 because an open branch already holds A-321.

[Observed] Review 2 read the 2.37 rebuild and records `REVISE` (`syzygy-5dhm-43/R-CHOICE-FLOOR-2-RAW.md:3`). It held the scenario byte-identity, the chain order and the wiring. Its findings landed as follows: F1 (the row's whole-change revert could not run) — the row now reverts the merge commit that lands pull request #1010 with `-m 1`, and the spec alone by reverting `7a55940f1`; F2 (a retired tag refused by the reconciler) was a stale local tag, absent from the remote, so the hosted jobs were re-run; F3 — the reconcile mutation script now runs a green baseline and refuses an expected string already on it (`choice-floor-reconcile-mutation-2026-11-28.json`, 10 of 10 killed); F4 — comments and test titles name version 2.37 and the worth-knowing gate (schema v13 today); F5 — the row names both reviews; F6 — the pull request lands with a merge commit, so the tag target stays reachable.
