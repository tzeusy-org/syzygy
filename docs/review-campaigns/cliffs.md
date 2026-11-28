# Dossier cliffs 2.52

## Patterns

- `syzygy-5dhm-116/R-CLIFFS-.*-RAW\.md`

## What was under review

[Observed] The MODIFIED REQ-polaris-generation-034 version 2.49 over the v2.48 docs and code (rebuilt by its script after the review as 2.50 over the v2.49 imports corroboration, as 2.51 over the v2.50 view levels, and as 2.52 over the v2.51 walk advice), in `openspec/changes/dossier-cliffs/` (recognizer `limit-default` v1, the render's `limitsAndDefaults` member and `reference/cliffs.html`; bead syzygy-5dhm.116, pursuit move R23 slice 1), its implementation, evidence scripts and reconciler wiring before its adoption row, bound by the commit in the raw's head. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-5dhm-116/R-CLIFFS-1-RAW.md:3`) with seven findings.

- F1 (Important; the render test's `conf` sweep fails on the cliffs page's word "configuration"): the sweep removes the word `configuration` as it removes the rule id `terraform-configuration`, and the cliffs page is checked separately for the directory as a path segment.
- F2 (Important; ini continuation lines read as entries, false Observed rows from tox.ini and setup.cfg): a line indented more deeply than the entry or key before it continues that key's value, as Python's configparser reads it; the entry is Unknown `value-not-literal` and the continuing lines are no entries. Stated in the requirement with the published `iniIndent`, pinned by tox, setup.cfg and gitconfig fixtures, and mutated.
- F3 (a yaml entry under an entry with a value, and a plain value holding `: `, read past): both are outside the grammar (the published `yamlPlainMapping`), stated, pinned and mutated.
- F4 (a keyword argument and a disabled macro read as definitions): recorded, not repaired; the page note, the requirement and design.md say a definition is read from its one line wherever it stands.
- F5 (R5 fails while the change is pending): the adoption commit adds the `openspec/README.md` row with the `AGENT-ADOPTIONS.md` row.
- F6 (no retained mutation, before/after or revert-trial record; 390 px not measured): the records are retained under `docs/evidence/syzygy-5dhm-116/`: mutation run 1 killed 61 of 77, run 2, after fixtures for its survivors and the review repairs' mutants, killed 83 of 85 with two equivalent survivors named in design.md, as did runs 3 to 5 after each merge of main; the before/after, the reconciler wiring mutants and the revert trial sit beside them. The 390 px fit is recorded in design.md as inferred from the markup.
- F7 (the page words the `default` pattern too narrowly): the note says "after any leading underscores", pinned by the page test.

[Observed] The spec was rebuilt by its script for F2, F3, F4 and F7, and again as 2.50 over the imports corroboration , 2.51 over the view levels and 2.52 over the walk advice, so the adopted digest differs from the reviewed one; no review has read the repaired or rebuilt bytes.
