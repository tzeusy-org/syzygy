# REQ-polaris-generation-034 choice floor semantic delta

## Predecessor

[Observed] A-334, REQ-polaris-generation-034 v2.36 (the source-example advice) at `8e64522613a9f76eb2c9e37896954b90f808afe6`, `openspec/changes/polaris-source-example-advice/proposed/polaris-generation/spec.md`, SHA-256 `e2688ca4162bd10065fbd87dcf6134ab8263a8039dbd3de62b4eb2de85771177`, 263 scenario headings. It is the effective REQ-034 on `origin/main` at `98c077705`, the last change to that requirement there. This amendment was first built as 2.33 over the question-kind floor 2.32 (A-315); the figure plan 2.33 (A-65), the screened derived base 2.35 (A-333) and the source-example advice 2.36 (A-334) landed first, so it is rebuilt over 2.36.

## Amended in place

- The title and the banner paragraph name version 2.37, its predecessor and its tag.
- The event-response form's Observable, Oracle and Falsifier lines each gain one sentence for the choice floor; their predecessor bytes are kept as each line's prefix.

## Added

- One paragraph immediately after the worth-knowing count advice paragraph: check's `readerAdvice.choiceFloor` for a v13, v14 or v15 draft, rule `choice-floor` version 1, what is on record, how an item is attributed to a Pole, the threshold of three and the literal detail.
- Two scenarios appended after the last scenario, which follows the event-response form in the predecessor: a Pole below the floor advised and one at three not; Inferred items counted once per Pole, a draft with no Poles, and an earlier schema. The proposed requirement has 265 scenarios; the 263 predecessor scenarios are byte-identical and keep their order.

## Carried and reversed

[Observed] `docs/evidence/syzygy-5dhm-43/choice_floor_build_spec.py` builds the proposed text from the predecessor's bytes; removing its additions and restoring the title and banner recovers the predecessor exactly. The warrants are the predecessor's. No finding, brief, schema, rendered byte or gate changes. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
