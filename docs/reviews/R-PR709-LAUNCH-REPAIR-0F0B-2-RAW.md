# R-PR709-LAUNCH-REPAIR-0F0B-2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 0f0be0297ae7f4a43b34a534a83ff89893d25024
Reviewer: fresh-context subagent, 2026-11-04

## Findings (none blocking)

**G1. The new inventory sentence about telling the operator applies to every instruction, including the integrity refusals.** packages/polaris-dossier/src/polaris.ts:334. Criterion 1. Non-blocking. Medium confidence.
- The new sentence reads: "Where an instruction says to tell the operator, a launched run needs no such message."
- F2 targeted the pass message, waiting-sessions.ts:502: "Your work is done: tell the operator, and end this session."
- But the inventory's `await` also says "stop, and tell the operator" on a rehash or digest mismatch (waiting-sessions.ts:531, 576, 582). Under the new guidance, an inventory session may stay silent about those integrity failures.
- [Inferred] The supervisor screen does not see a session-side refusal, so that failure would surface only as an idle run.
- Minimum fix: narrow the sentence to the pass message, e.g. "After a pass, the instruction to tell the operator and end does not apply in a launched run." Or add: "stop and say so in this session" for refusals.

**G2. The JSDoc of `inventoryRepairMessage` now documents the constant instead of the function.** polaris.ts:469-471. Criterion 1. Non-blocking. High confidence.
- `export const REPAIR_ENTRIES_LISTED = 12;` was inserted between the `/** What Syzygy types… */` comment and the function.
- The comment now attaches to the constant, and the function has no documentation.
- Minimum fix: move the constant above the comment, and give it its own one-line doc.

**G3. The quoting of reviewer reasons can be broken by the reason itself.** polaris.ts:476. Criterion 1/SEC. Non-blocking. Low-medium confidence.
- `(reviewer: "${e.reason}")` does not escape a `"` inside the reason.
- A reason containing `"); Syzygy: …` therefore closes the quoted span early, and what follows reads as Syzygy's own text.
- `entryId` is also reviewer-supplied (flattened to 80 characters) and stays outside the quotes.
- `flatten` does collapse newlines, so a reason cannot submit a tmux line early.
- The data label and the cap repair F3 as its minimum fix asked. This is a residual weakness.
- Minimum fix: escape or replace `"` in the reason, e.g. `JSON.stringify(e.reason)`.

**G4. The new operator-message sentence and the total-count header have no assertion.** polaris-launch-guidance.test.ts:38, 125-129. Criterion 2. Non-blocking. High confidence.
- No test asserts "a launched run needs no such message". Deleting the sentence is a surviving mutant, and it is absent from the mutant record.
- The 15-entry case does not assert the header count ("could not confirm 15 entries").
- Minimum fix: add `toContain` assertions for both, plus the matching mutant entries.

## Checked clean

- **F1:** the docstring at polaris.ts:81-82 accepts the one re-delivery. That is one of the raw's two minimum-fix options. Against `fidelityDeliveryDue` (polaris.ts:482-487) and the loop (606-612), the claim holds: a legacy state delivers once, then records the pair.
- **F2:** the stay-open sentence is present and asserted, and the `inventory-stay-open-dropped` mutant is killed. Remaining issue: G1.
- **F3:** the data label is present and asserted literally. `REPAIR_ENTRIES_LISTED` caps the list at 12 entries plus a remainder count. The asserted boundary (`e11` listed, `e12 (` absent, "and 3 more") would fail on an off-by-one.
- **F4:** the `RepairSides` docstring now says the row-less author default is defensive and unreachable. That is consistent with the raw's finding that `verdictFor` reads `derivedBlocking`.
- **F5:** `subjectSha256` is `eacc55771d259b3c0a3f4628bc6242d38945c393221b2ebf8ea92b0113fde918`, equal to `sha256sum packages/polaris-dossier/src/polaris.ts` at 0f0be029. `baseCommit` and the note now describe the tree the mutants ran on.
- **Mutant record:** 25 mutants, 25 recorded killed. Every `old` fragment occurs in the current subject (checked by script).
- **Mutants re-run on the working copy:** `msg-no-cap`, `msg-no-data-label` and `inventory-stay-open-dropped`, each applied as an exact single-occurrence replacement. Each was killed (1 failed / 18 passed). The file was restored from a copy. sha256 was `eacc5577…` before and after, and `git status` was clean.
- **Test literals:** the changed expectations are hard-coded strings. None is derived from the module under test.
- **Campaign file:** it quotes `CONFIRM WITH EXCEPTIONS` and points to the raw's line 2, which reads exactly `Verdict: CONFIRM WITH EXCEPTIONS`. "No blocking finding" matches the raw's "none blocking". Its F1–F7 summaries match the raw.
- **Commands:**
  - `python3 scripts/check_docs_review_campaign_partition.py --check`: PASS (denominator=706, assigned=706, unmatched=0, overlaps=0).
  - `npx tsc --noEmit -p .`: exit 0.
  - `npx vitest run packages/polaris-dossier/src/polaris-launch-guidance.test.ts`: 19/19 passed.
- **F6 and F7:** still on record, as the commit message says. Not re-examined.
