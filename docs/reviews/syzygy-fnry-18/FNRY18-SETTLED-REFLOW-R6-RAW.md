# Settled dossier mobile reflow citation source review, round 6

Subject commit `21ec5f262189af7118ea0db20b7a7f6055b45c52`
Tree `a6a4450ffcc7b19508586a11aeb1c12aa4485440`
Predecessor `8d1e38c6991459bb4711aeec9ac1845f77f65ac7`
Reviewed 2026-11-25 UTC

CONFIRM

[Observed] The two-file delta adds one local theme rule for viewports through 800 pixels and extends the 23-page browser fixture. The rule places the existing visible citation detail inside the viewport and wraps its path. The source link, accessible name, excerpt coordinates, markup and desktop rule remain byte-identical in this delta.

[Observed] An independent clone of the exact source passed three Chrome tests and the provider golden. The expanded test opens two long citations at 390 by 844 with scripts removed. Real Tab focus and mouse movement both reveal the full detail on an inline citation in the rightmost third and on a code citation near the left. Both preserve their exact accessible names and existing source destinations. The document, tooltip box and tooltip text rectangles stay in bounds. The tooltip closes on blur and pointer exit.

[Observed] Replacing only the renderer with R4 reproduced the full overflow at the right-side inline citation in the same test: the tooltip box and text were outside the viewport and the page was wider than the viewport. The prior independent rich fixture also reproduced the pre-fix 1081-pixel document on keyboard focus. The clone restored the exact clean R6 source. Positive log SHA-256 `f31dab5be2bb215ee3ee50308130acf01fc84c9325f5427ed852a548d8c9a4d3`. R4 renderer control SHA-256 `8de7819cf03c569911c8b759f884709571c2b64b7defa0bbd16394be0d26a180`.

[Unknown] This finding is bound to the synthetic fixtures and exact source. Whole-tree validation and the eventual protected result need their own evidence.
