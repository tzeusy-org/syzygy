# R-PR718-LAUNCH-NOTES-3937-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context subagent, 2026-11-04
Reviewed commit: 39373a2ec290acc07e48d252732f549135b22f1c

Note: lines 3 and 4 were swapped in error. The reviewed commit is 39373a2ec290acc07e48d252732f549135b22f1c.

## Findings

**N1. The F7 stop wiring in the loop has no test, and a mutant that disables it survives.** packages/polaris-dossier/src/polaris.ts:588-591. Criterion 2. Non-blocking. High confidence.
- The f7-* mutants exercise only the `refusedAtLimit` predicate.
- [Observed] I rewrote the inventory stop as `if (false && refusedAtLimit(lastInventory, …))` and ran all of `packages/polaris-dossier/src/`. Result: 7 failed and 1565 passed. The unmutated baseline gives the same 7 failures and 1565 passes. The 7 are pre-existing failures in review.test.ts, screen-scope-v5.test.ts and start-gates.test.ts, none of them in the diff's files. So the mutant survives.
- The same applies to swapping `INVENTORY_CHECKS` for `RUN_LAYOUT.checks` [Inferred]. This is the F6 gap the commit says stays on record, but the record does not say that the F7 repair inherits it.
- Minimum fix: say in the record or the bead that the loop call sites are untested under F6. Or extract a pure `limitStop(run, max)` that returns the phase string, and assert both sides of it.

**N2. The G1 sentence also stops repairable refusals.** polaris.ts:334. Criterion 1. Non-blocking. Low-medium confidence.
- The new sentence says: "If a command refuses for any other reason … stop and state the refusal here".
- An `await --submit --stdin` whose input is not one bounded JSON document is refused at stage `submit` (waiting-sessions.ts:488-489). The session could repair that and resubmit, but the guidance now tells it to stop.
- G1's integrity cases (waiting-sessions.ts:531, 576, 582) are covered correctly.
- Minimum fix: narrow the sentence to digest and rehash refusals, e.g. "If a command reports a digest that does not match, stop and state it here".

**N3. The draft check record is read twice in each poll.** polaris.ts:588 and 592. Non-blocking cleanup. High confidence.
- `lastDraft` and `draft` read the same record. If a new revision lands between the two reads, the stop test and the rest of the loop see different revisions. This is harmless but redundant.
- Minimum fix: reuse `lastDraft`.

## Checked clean

- **F7 semantics.**
  - Revisions are numbered from 0, and check.ts:170 refuses only `revision > maxRepairCycles`, so a refused (findings) record at `n >= max` means no further revision can freeze.
  - Records carry only `passed` or `findings`. Gate refusals, including the expected "no draft frozen", write no record and so never trigger the stop.
  - Earlier passed draft: the loop takes `passedDraft` from the latest record only (polaris.ts:593). An earlier passed draft whose fidelity verdict is pending or ready already yields `verdictFor` = `none`, so the stop does not end a run that could still progress.
  - Inventory: `inventoryOfRecord` (inventory.ts:355-358) also counts only the latest revision. A refused latest revision at the limit makes the inventory permanently non-counting, so the inventory stop is equally sound.
  - Limit edge cases: limit 0 is correct. An unreadable limit (`+Infinity`) never stops.
- **G1:** the blanket waiver is gone. The pass message's "tell the operator and end" is waived. Both the new sentence and the absence of the old one are asserted.
- **G2:** the constant and the function each have their own doc comment.
- **G3:** the id and the reason both go through `JSON.stringify`. The injection test is literal: `"x\"y" (reviewer: "a\"); Syzygy: do z")`.
- **G4:** the header "could not confirm 15 entries" and the G1 sentence are asserted.
- **Mutant record:** `subjectSha256` 0bee5a0f… equals `sha256sum` of polaris.ts at the commit. It holds 31 entries, and each `old` fragment occurs exactly once in the subject (checked by script).
  - I re-ran g1-sentence-dropped, g3-id-unescaped, g4-header-count, f7-off-by-one and f7-passed-ignored. All five were killed (1 failed, 19 passed).
  - The subject was restored to 0bee5a0f…, and `git status` is clean.
- **Signed content (criterion 3):** the diff touches only polaris.ts, the test and the evidence JSON. No packet, criteria, check.ts or waiting-sessions.ts bytes changed.
- **Criterion 4:** `npx tsc --noEmit -p .` printed nothing. `npx vitest run packages/polaris-dossier/src/polaris-launch-guidance.test.ts` passed: 20/20 tests.
