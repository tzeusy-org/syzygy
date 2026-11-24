# Design — dossier coverage hold, version 2.28

## Decisions

1. **Hold at issuance, not in the packet builder's outcome.** [Observed] `buildFidelityPacket` (`packages/polaris-dossier/src/review-packet.ts`) is called by the three issuing points (`review-packet`, a review `session-prompt`, a delivery to a waiting session in `session-handover.ts`) and also by `review-check` and `reviewOfRecord`, which rebuild the packet to validate and count a verdict. The build carries the hold as a field, `coverageHold`, and only the three issuing points refuse on it, so a verdict already written for an older packet validates and counts as before, and the packet's bytes never depend on the hold.
2. **One comparison rule.** The hold and the report-only advice both use `compareInventoryCoverage` (`inventory-coverage.ts`, rule `overlap-or-path-named`, version 2). The advice compares the full inventory. Packet issuance compares the entries after the withheld-outcome rule.
3. **Withheld entries do not hold.** An entry every cited span of which screening withholds, or that relies on a quotation from one, is answered `withheld` by Syzygy in the verdict (`review-verdict.ts`); the hold reads the same standing (`standingBySubject`, `isWithheldItem`) and leaves it out.
4. **Schema v5 and later only.** A draft of schema v2 to v4 can record no omission, so an author could only clear the hold by citing; those drafts are issued as before. Every draft schema the brief issues today is later than v4.
5. **Plain refusal words.** The refusal names each entry by identifier and paths only (JSON strings, the inventory session's text), never its statement, kind or lines, so the inventory stays independent of the draft; at most twelve in the paragraph, every one in `reasons`; then the next step.
6. **A notice names the selected pair.** All three refusals carry `coverage.draftRevision` and `coverage.inventoryRevision`. The supervisor uses that pair even if the initial poll saw an earlier pair. It holds the packet independently of notice delivery. It records a successful notice after both tmux operations succeed, tries a failed literal send up to five times, and reports an Enter failure without adding more coverage input to that pane. A notice fits within 4,000 UTF-16 code units and reserves the repair instructions before listing screened entries. At the repair-cycle limit the run ends blocked and names the hold.

## Code

`packages/polaris-dossier/src/coverage-hold.ts` (new): `fidelityCoverageHold`, `heldEntryLine`, `heldSchema`. `review-packet.ts` computes the hold with the screen's secret-path test; `review.ts` and `session-handover.ts` refuse with stage `coverage`; `polaris.ts` handles the refusal in the supervisor loop. `inventory-coverage.ts` retains its report-only note.

## Residuals

- [Inferred] The rule is mechanical: an entry represented in words the rule cannot see holds the review until the author adds a citation or a path, as check's advice already says.
- [Unknown] The effect on review rounds per run until runs are made under it (slice 4, syzygy-5dhm.86, measures before and after).
- [Observed] The supervisor's coverage step is tested with synthetic delivery and notice sinks. [Unknown] Receipt or reading by a live author.
