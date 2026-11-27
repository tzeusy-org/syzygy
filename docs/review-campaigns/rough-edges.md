# Dossier rough-edge markers 2.44

## Patterns

- `syzygy-5dhm-46/R-ROUGH-EDGES-.*-RAW\.md`

## What was under review

[Observed] The MODIFIED REQ-polaris-generation-034, then numbered version 2.43 over the v2.42 test-name recognizers (rebuilt as 2.44 over the v2.43 migration bounds after review, its additions unchanged), in `openspec/changes/dossier-rough-edges/` (recognizer `rough-edge-marker` v1, the render's `roughEdges` member and `reference/rough-edges.html`; bead syzygy-5dhm.46), its implementation, evidence scripts and reconciler wiring, bound by the commit in the raw's head. The adoption row A-338 was written after the review. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-5dhm-46/R-ROUGH-EDGES-1-RAW.md:3`) with eleven findings.

- F1 (Important; a template nested in a substitution split the outer one, so its text was read as a comment): the lexer ends a template literal at the first backtick outside its substitutions, each substitution ending at its balancing brace with strings, templates and comments inside skipped whole; the requirement states it, and fixtures pin both of the review's probe lines for markers and one for test names. The repair reaches the test-name recognizers, as the semantic delta says.
- F2 (the cause given for 10 `unparsed` files was not measured): re-derived after F1, 4 files are `unparsed`; design.md now states the cause Unknown.
- F3 (no mutation record; the read and listing limits unpinned): fixtures cross the 1000-file, 2000-marker and 250-unit limits, and the rule-6 runs are retained: run 1 killed 34 of 40 (`docs/evidence/syzygy-5dhm-46/rough-edges-mutants-run1-2026-11-28.json`), fixtures were added for five survivors, and run 2 killed 39 of 40 (`docs/evidence/syzygy-5dhm-46/rough-edges-mutants-2026-11-28.json`); the reconciler wiring run killed 11 of 11 (`docs/evidence/syzygy-5dhm-46/rough-edges-reconcile-mutation-2026-11-28.json`). [Inferred] The one survivor, `lexer-block-close-in-content`, is equivalent: it keeps a block comment's closing `*/` in its content, and neither `*` nor `/` completes or refuses any published pattern at a content's end.
- F4 (JSX text holding `//` is read as a comment): stated in the requirement and pinned by a fixture.
- F5 (the "What is going away" heading claimed more than a row shows): the section is now `Deprecation markers`, with a sentence that each row is a line writing a deprecation form, never a claim that anything is deprecated, and that a Python line may handle or silence a warning.
- F6 (path anchors such as `docs/x#12` read as references): named in the requirement and design.md, and pinned by a fixture.
- F7 (page order and dispositions untested): the requirement now places the page as the last item after Sources, after the maps and the test-names page where published; fixtures pin both arms, `path-not-citable` and `too-large`. Recorded, not repaired: the per-quote secret check is unreachable by a fixture while the whole-body screen excludes first.
- F8 (render cost): recorded in design.md (29 and 14 seconds over two runs). Not repaired: `renderRun` always builds a derived structure, so there is no render to skip; batching reads is a later change.
- F9 (a byte-order mark stayed in line 1's quote): it is dropped, stated in the requirement and pinned.
- F10 (no "never a total" sentence when files are left out for a secret path and none is Unknown): the floor sentence counts both.
- F11 (the evidence scripts check less than their names suggest): the publication check now binds each pattern's kind and the code's order, and a kind mutant fails it. Recorded, not repaired: the selftest's row-shape mutants are killed by the predecessor's unavailability, as the v2.42 cases are; making the predecessor effective in the selftest scratch is a change to the shared selftest projection.

[Observed] The spec was rebuilt by its script for F1, F4 to F7, F9 and F10, so the adopted digest differs from the reviewed one; no review has read the repaired bytes.
