# REQ-polaris-generation-034 test-name recognizers semantic delta

## Predecessor

[Observed] REQ-polaris-generation-034 v2.37, the choice floor (syzygy-5dhm.43), at `7a55940f1e683f99de40d1a53a8c81e0372cc36f`, `openspec/changes/dossier-choice-floor/proposed/polaris-generation/spec.md`, SHA-256 `02f7a314e827682f08e69e4d47a03479ff82c8896ecbddd99315e5f4e55bc380`, 265 scenario headings. It succeeds v2.36, the source-example advice (A-334), the effective REQ-034 on `origin/main`.

## Amended in place

- The title and the banner paragraph name version 2.38, its predecessor and its tag.
- The event-response form's Observable, Oracle and Falsifier lines each gain one sentence for the test-name recognizers; their predecessor bytes are kept as each line's prefix.

## Added

- Three paragraphs immediately after the `computedMaps` paragraph: the four recognizers (`pytest-test-name`, `js-test-call`, `go-test-function`, `junit-test-method`, each version 1), their path rules, the lexical blanking of comments and strings, and the forms each takes; the render's `testNames` member, its dispositions, value checks, unit mapping by rule `top-level-unit`, listing limits and constant Inferred label; and the reference page `reference/test-names.html`, its per-unit table, its `Not established.` sentence for Unknown files, and the machine view's `testNames` member.
- Six scenarios immediately after the last scenario: names read from code and never from comments or strings; files left out, set apart or Unknown; names the value checks refuse; the page rendered; the member Unknown; and no page without the member. The proposed requirement has 271 scenarios; the 265 predecessor scenarios are byte-identical.

## Carried and reversed

[Observed] `docs/evidence/syzygy-5dhm-45/test_names_build_spec.py` builds the proposed text from the predecessor's bytes; `docs/evidence/syzygy-5dhm-45/test_names_inverse.py` removes its additions, restores the title and banner and recovers the predecessor exactly. The warrants are the predecessor's. No finding, brief, schema, gate or provider-mode byte changes; an operator-agent render that holds the member gains one page, its item on `contents.html`, its link in the reading order on every page, and one machine member. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
