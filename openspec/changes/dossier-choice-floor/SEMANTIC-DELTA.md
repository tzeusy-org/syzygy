# REQ-polaris-generation-034 choice floor semantic delta

## Predecessor

[Observed] A-315, REQ-polaris-generation-034 v2.32 at `0e0b281d192737a8e8415b24be326355c464dd97`, `openspec/changes/dossier-question-kind-floor/proposed/polaris-generation/spec.md`, SHA-256 `4439371414c716ba52493066bfe9908029c8378e06594454cf8e343939590b32`, 220 scenario headings. It is the effective REQ-034 on `origin/main` at `e852d0c9a` (PR #1008), the last change to that requirement there.

## Amended in place

- The title and the banner paragraph name version 2.33, its predecessor and its tag.
- The event-response form's Observable, Oracle and Falsifier lines each gain one sentence for the choice floor; their predecessor bytes are kept as each line's prefix.

## Added

- One paragraph immediately after the worth-knowing count advice paragraph: check's `readerAdvice.choiceFloor` for a v13 draft, rule `choice-floor` version 1, what is on record, how an item is attributed to a Pole, the threshold of three and the literal detail.
- Two scenarios immediately after the last scenario: a Pole below the floor advised and one at three not; Inferred items counted once per Pole, a draft with no Poles, and an earlier schema. The proposed requirement has 222 scenarios; the 220 predecessor scenarios are byte-identical.

## Carried and reversed

[Observed] `docs/evidence/syzygy-5dhm-43/choice_floor_build_spec.py` builds the proposed text from the predecessor's bytes; removing its additions and restoring the title and banner recovers the predecessor exactly. The warrants are the predecessor's. No finding, brief, schema, rendered byte or gate changes. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
