# REQ-polaris-generation-034 rough-edge markers semantic delta

## Predecessor

[Observed] REQ-polaris-generation-034 v2.43, the migration bounds (syzygy-3efd.87, A-272), at `0430fcf8b5554bbc275ca901e086f998b2aac0e6`, `openspec/changes/dossier-migration-bounds/proposed/polaris-generation/spec.md`, SHA-256 `bbc1ab4794a9748de88350b2c7cc9ffbeec5dd6d74231739860789aa724acf02`, 298 scenario headings. It is the effective REQ-034 on `origin/main`. Version 2.41 is held by the session-usage change to REQ-033 (syzygy-5dhm.26). This change was first built and reviewed as 2.43 over the v2.42 test-name recognizers; the migration bounds took 2.43 on main first, so it was rebuilt by its script as 2.44 over them, its additions unchanged.

## Amended in place

- The title and the banner paragraph name version 2.44, its predecessor and its tag.
- The event-response form's Observable, Oracle and Falsifier lines each gain one sentence for the rough-edge markers; their predecessor bytes are kept as each line's prefix.

## Added

- Three paragraphs immediately after the test-names page paragraph: recognizer `rough-edge-marker` version 1, its candidate extensions by language, the lexer it reads through, every pattern it matches as a published regular expression and where each is matched, and what a marker and an issue reference state; the render's `roughEdges` member, its dispositions, value checks, unit mapping by rule `top-level-unit`, listing limits and constant Observed label; and the reference page `reference/rough-edges.html`, its per-unit table, its "Deprecation markers" section (what may be going away), its `Not established.` statements for Unknown files and for what each issue reference names, and the machine view's `roughEdges` member.
- Seven scenarios immediately after the last scenario: markers read in comments and never in strings; issue-reference look-alikes left out; files left out, set apart or Unknown; marker lines the value checks refuse; the page rendered; the member Unknown; and no page without the member. The proposed requirement has 305 scenarios; the 298 predecessor scenarios are byte-identical.

## Carried and reversed

[Observed] `docs/evidence/syzygy-5dhm-46/rough_edges_build_spec.py` builds the proposed text from the predecessor's bytes; `docs/evidence/syzygy-5dhm-46/rough_edges_inverse.py` removes its additions, restores the title and banner and recovers the predecessor exactly. The warrants are the predecessor's. No finding, brief, schema, gate or provider-mode byte changes; an operator-agent render that holds the member gains one page, its item on `contents.html`, its link in the reading order on every page, and one machine member. The test-name lexer gains an output, its comment spans, and now ends a template literal at the first backtick outside its substitutions (R-ROUGH-EDGES-1 F1, stated in the added recognizer paragraph): a JavaScript or TypeScript test file holding a template nested in a substitution no longer has the nested template's text read as code or as a comment, so a test name read only through that misreading leaves, and one the misreading hid returns. No other test name moves. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
