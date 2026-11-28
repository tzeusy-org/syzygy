# Dossier docs and code 2.48

## Patterns

- `syzygy-5dhm-119/R-DOCS-AND-CODE-.*-RAW\.md`

## What was under review

[Observed] The MODIFIED REQ-polaris-generation-034 version 2.48 over the v2.44 rough-edge markers, in `openspec/changes/dossier-docs-and-code/` (recognizer `doc-reference` v1, the render's `docsAndCode` member and `reference/docs-and-code.html`; bead syzygy-5dhm.119, pursuit move R24 slice 1), its implementation, evidence scripts, reconciler wiring and adoption row A-342 as first written, bound by the commit in the raw's head. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-5dhm-119/R-DOCS-AND-CODE-1-RAW.md:3`) with seven findings.

- F1 (Important; false Observed document-only at a symbolic link, a submodule's ancestor or name, or a directory only secret paths hold): a path at or under a symbolic link is Unknown `symbolic-link`; a submodule's ancestors are directories, and a span whose tail reaches a submodule is Unknown `submodule`; a row naming a directory only secret-matching paths hold is left out and counted. Mutation run 1 then found the same false absence for a bare name only a secret-matching path holds; it is left out too. The requirement states each, a new scenario and fixtures pin them, and each predicate has a mutant.
- F2 (Important; names held only in strings read as document-only): where no code text holds a name, the whole text of each lexed file is searched, and a hit resolves with `searched` `comment-or-string`, worded so on the page; code text is preferred. Stated, pinned and mutated.
- F3 (Important; cited revert trial and mutation record absent): the revert-trial transcript and both code mutation records are committed under `docs/evidence/syzygy-5dhm-119/`.
- F4 (HTML comments and indented code read as references): disclosed in the requirement, the page note and design.md; the fence rule stays the PWB-REQ-006 recognizer's.
- F5 (the outer destination of a link around an image dropped uncounted): counted in `linksNotChecked`, stated and pinned.
- F6 (an identifier resolves by its last name alone): recorded, not repaired; the requirement publishes it and each row names the file and line it matched.
- F7 (the 390-pixel fit not measured): recorded in design.md as inferred from the markup.

[Observed] The spec was rebuilt by its script for F1, F2, F4, F5 and the run-1 secret-tail repair, so the adopted digest differs from the reviewed one; no review has read the repaired bytes.
