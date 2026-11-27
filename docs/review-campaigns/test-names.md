# Dossier test-name recognizers 2.42

## Patterns

- `syzygy-5dhm-45/R-TEST-NAMES-.*-RAW\.md`

## What was under review

[Observed] The MODIFIED REQ-polaris-generation-034 version 2.38 (renumbered 2.42 after review) in `openspec/changes/dossier-test-names/` (four lexical test-name recognizers, the render's `testNames` member and `reference/test-names.html`; bead syzygy-5dhm.45), its implementation, its reconciler wiring and adoption row A-337, bound by the commit in the raw's head. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-5dhm-45/R-TEST-NAMES-1-RAW.md:3`) with five findings. F1 (High; astral characters in a comment or string moved every later offset, dropping JavaScript names and misplacing lines): the lexer blanks by UTF-16 code unit, with one test per recognizer and a rule-6 check that restoring the `u` flag fails two of them. F2 (the row's spec-commit revert did not apply and left a stale route): the row now says that reverting its spec commit undoes only the last amendment, and gives the merge-commit withdrawal, tried in a scratch clone (`docs/evidence/syzygy-5dhm-45/revert-trial-2026-11-28.txt`). F3 (the tag does not exist yet): it is created at the row's commit after the merge. F4: pytest names and the JavaScript callee guard read identifiers beyond ASCII, and the spec now states that a line break inside a string that cannot hold one is the `unterminated` fault. F5: the spec says the Unknown section holds its heading and the `Not established.` sentence, and the row's prose names every suite kind, annotation and the `top-level-unit` rule. The spec was rebuilt by its script for F4 and F5, so the adopted digest differs from the reviewed one; no review has read the repaired bytes.

[Observed] After the review, migration parity (syzygy-3efd.85), import facts (syzygy-3efd.60) and figure walks (syzygy-3efd.32) landed as REQ-034 v2.38, v2.39 and v2.40 first, so this change was rebuilt by its scripts as v2.42 over figure walks: the same additions, a new predecessor and a new subject digest.
