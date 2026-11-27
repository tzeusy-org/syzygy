# Design

## What "on record" means

[Inferred] The move's binding text says "check advises a Pole with fewer than three choices or trade-offs on record". Its basis counts the understanding record ("1 choice, 1 trade-off and 1 limit for all of Redis"), so the record counted is the understanding record's `choices` and `tradeOffs`. Only items labelled Inferred count: an Unknown item records that a choice was looked for and not found, not a choice.

## Why a Pole's items are found by the files it cites

[Inferred] The understanding record is one list for the whole draft and names no Pole. An item belongs to a Pole when one of its citations shares a file with a citation anywhere inside the Pole's sections or the deep dives whose `sectionId` names one of them, files compared by path alone, the locality rule RS-17 already uses for an edge and its nodes. A deep dive belongs to its section's Pole, as the reading surface already shows it. An item may count for two Poles that cite the same file, so the floor can under-advise a Pole that only borrows a shared file; it never advises a Pole for an item that cites a file the Pole's sections or their deep dives cite. Figures are not walked: a file only a diagram of the Pole cites does not attribute. A draft with no Poles has no part to attribute to, so every item counts for it. Each section counts in the first Pole naming it, as the worth-knowing count does.

## Why three, and why advice

[Inferred] Three is the move's number. A floor stated as a count could read as a quota, so the detail ends "never record one its source does not show", and the advice sets no outcome: an author whose source shows two choices is free to record two. The review still judges whether each recorded item is supported.

## Which schemas

[Inferred] Version 2.33 (the figure plan) added draft schema v14 and version 2.35 schema v15, each carrying every member a v13 draft may carry, and each draws its worth-knowing advice as a v13 draft does. The choice floor reads only the understanding record, the Poles, the sections and the deep dives, which all three schemas share, so it applies to v13, v14 and v15 drafts alike. `check` parses only v13 drafts today; the floor gates on `hasWorthKnowingForm`, the same gate as the worth-knowing count, which the implementation of the later schemas extends. A scenario and the falsifier state the v14 and v15 case so that implementation cannot leave them out.

## Why no brief change

[Inferred] The bead's approach puts the floor in `reader-advice.ts` as advice only. Check's report already reaches the author on every check; the brief, draft schema and renderer are untouched, so the comprehension-regression rule of `CONTRIBUTING.md`, which applies to those three, is not engaged.

## Review (R-CHOICE-FLOOR-1)

[Observed] One fresh-context review, `docs/reviews/syzygy-5dhm-43/R-CHOICE-FLOOR-1-RAW.md`, recorded `REVISE` over commit `a3bb87f6` with one blocking finding (F1) and five non-blocking (F2 to F6). Each was repaired; none was overruled, and under D10 no confirmation round was run, so no review has read the repaired bytes.

- F1, F2: the row (A-321 then, A-336 since the rebuild as 2.37) lists every non-merge commit of the change in full, newest first, in its What-changed cell, and its revert cell reverts them all after first reverting the commit that last amends the row. Its commit cell holds the one specification commit the snapshot and tag bind, because the reconciler accepts exactly one full hash there for a tagged row.
- F3: a test where only an item's second citation names the Pole's file.
- F4: tests where only a nested child and only a steps item cite the attributing file.
- F5: a deep dive now attributes to the Pole of its `sectionId`, in the code and in the requirement's paragraph, scenario and falsifier; the sentence above is narrowed to match.
- F6: the advised run's check record is read too.
