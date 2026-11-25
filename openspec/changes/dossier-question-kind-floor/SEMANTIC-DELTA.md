# REQ-polaris-generation-034 question-kind floor semantic delta

## Predecessor

[Observed] A-306, REQ-polaris-generation-034 v2.29 at `ec0fc11fe8e83bb04b9ff169c3e321267c2baf91`, `openspec/changes/dossier-brief-terminology/proposed/polaris-generation/spec.md`, SHA-256 `64944deafb9ae449323a0b0308929bd0d5fa071f8f4e048a06c4157bfa5aa60c`, 215 scenario headings.

## Amended in place

- The title and the banner paragraph name version 2.32, its predecessor and its tag.
- The event-response form's Observable, Oracle and Falsifier lines each gain one sentence for the question-kind floor; their predecessor bytes are kept as each line's prefix.

## Added

- Three paragraphs immediately after the `inventoryOmissions` paragraph: the inert v13 member `questionKinds` and its findings; check's `questionKindAdvice`, rules `major-unit` and `question-kind-floor` version 1, and its Unknown form; and brief v21 with its exact paragraph.
- Five scenarios immediately after the last scenario: a unit with no change block advised, a unit answering all six not advised, nothing declared Unknown, declarations in an earlier schema, and brief v21. The proposed requirement has 220 scenarios; the 215 predecessor scenarios are byte-identical.

## Carried and reversed

[Observed] `docs/evidence/syzygy-5dhm-135/question_kind_build_spec.py` builds the proposed text from the predecessor's bytes; removing its additions and restoring the title and banner recovers the predecessor exactly. The warrants are the predecessor's. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
