# Round 2 dispositions — Polaris dossier local-agent mode, version 1.7

> **Candidate — binds nothing.** [Observed] Round 2 returned `REVISE`
> (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-7-2-RAW.md`, line 4) over commit
> `9f1131cfc0345d0400f2c353a7e1fe5c7434f97f`. Every finding below is repaired
> in the package's next commit. The affected-ids block is unchanged: no
> scenario was added, removed or renamed, and the two new clause blocks
> (`Ob34`, REQ-034's Observable, and `Or35`, REQ-035's Oracle) fall in test
> forms the block already lists as changed. The repair dispatches round 3,
> the last under the stopping rule.

| Finding | Severity | Disposition |
|---|---|---|
| 1. REQ-033's refusal list refuses design-repair revisions; the repair-cycle refusal is unscoped | revise | Repaired. The third list item is dropped. The first now reads "a check or review check that counts against the repair-cycle limit (REQ-polaris-generation-034) beyond that limit", so a design-repair revision is never refused because the repair-cycle limit is spent. |
| 2. A code excerpt is called a quotation, so the display rule would normalise it | revise | Repaired. The display rule now ends: it governs the quotations of claim blocks and inventory entries, and a code excerpt (hero and walk excerpt included) renders in both views byte for byte, comment leaders, markup and line breaks kept. The "Annotated code walk" scenario, REQ-034's Case and its falsifier say the same. |
| 3. The review-status region is undefined for close's re-stamp and at render | revise | Repaired. The render paragraph now says every rendered page carries exactly one named review-status region: in the ribbon on a narrative page, at the foot of every other page. At render it states each review kind's standing for those pages as the records stand, "none counts" where none does, labelled as close labels a standing, and never that the pages are reviewed or ready while a standing is not ready. The scenario "Every passed revision renders as its own pages" and the falsifier now cover it. |
| 4. "Notice" has no spec referent | note, editorial | Taken. The ribbon's paragraph now holds "any other notice Syzygy writes about the draft (such as that it is an editorial draft, not adopted)". design.md and the delta say the same. |
| 5. Observable and Oracle not extended | note | Taken. REQ-034's Observable gains the recorded limit decisions and refusals, every page's region at render, and the reader advice. Its Oracle fixes each expected limit, refusal and region in the fixture, outside the checker and the renderer. REQ-035's Oracle fixes each expected close record, end state, finding, label and region after close, outside the generator. |
| 6. "Latest" and "recorded last" orderings not tied to anything re-derivable | note | Taken. REQ-034 now says that wherever the change says latest, earlier or last of revisions, renders or recorded verdicts, the order is by the sequence numbers Syzygy assigns as it freezes, renders or records each, read from the objects it verifies, never an instant. Contract reading 6 names it. |
| 7. The legend omits the ellipsis rewrite and underscores inside a name | note | Taken. The legend now names both. |
| 8. RFC7-12 and RFC7-20 readings are the owner's | note, for the owner | Taken. "For the owner", item 2, adds the RFC7-20 reading, and contract reading 7 states it. Because the v5 thesis is generated prose above the ribbon, the spec now requires a Syzygy-written draft mark with its label. The scenario "Thesis-first landing page" and the falsifier require it. |
| 9. Residual determinacy cases | note | Taken in the delta, P1, "Cases the counting rule decides, stated": inventory resubmissions are counted as in v1.6; a design-repair revision refused at its spent limit stops resubmission; the record-dependence of the class. The stranded unrendered revision was already stated under "End states". |
| 10. The 2026-11-05 direction also said "no spec text changes" | note, for the owner | Taken. P1 (b) and the new "For the owner", item 6, say that the separate budget rests on choice A ("Give fidelity and design separate repair budgets"), not on that direction, which also recorded "Excluded: no spec text changes". The owner page says the same. |
| 11. Boundary, carried notes and settle-items hold | note | No change needed. |
