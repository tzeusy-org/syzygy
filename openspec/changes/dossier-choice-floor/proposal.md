# Advise a Pole with fewer than three choices or trade-offs on record

## Why

[Observed] Pursuit move R8 (`docs/pursuits/2026-11-21b-vision-pursuit.md`) found that the newest stored Redis draft's understanding record holds one choice, one trade-off and one limit for the whole project, and that nothing in `check` tells an author so. "Why this and not the obvious alternative" is the insight a newcomer most wants; a draft that records almost none gives the renderer almost none to show.

## Change

[Inferred] Amend REQ-polaris-generation-034 in full. For a v13, v14 or v15 draft, `check`'s `readerAdvice` gains `choiceFloor`: for each Pole, the Inferred items of the understanding record's `choices` and `tradeOffs` that cite a file the Pole's sections cite; a Pole with fewer than three is one advisory. A draft with no Poles is one group counting every such item. It is advice only: no finding, no outcome, nothing in the check record or reading ledger, no brief, schema or rendered byte. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
