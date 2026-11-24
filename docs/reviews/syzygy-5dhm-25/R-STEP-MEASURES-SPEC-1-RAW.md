# R-STEP-MEASURES-SPEC-1 — fresh-reader review of dossier step measures 2.27
Subject SHA-256: 298c7b1cf7e566a63b1305b91ba805b8b8eba754903fe8f2b96d8ff1bc146fcc
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context agent, 2026-11-25

## What was reviewed and how

Worktree `/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-5dhm.25`, HEAD `d1a7cf9b4eebab25a3601765d70653fa32130af3`. The subject and the package (`openspec/changes/dossier-step-measures/`) are untracked in that worktree.

- `sha256sum` on the subject gives `298c7b1c…6fcc`. [Observed] It matches the expected digest.
- `sha256sum` on the predecessor gives `a5453cb1…9cd7`. [Observed] This is the digest SEMANTIC-DELTA.md names.
- `diff predecessor subject`. [Observed] Two lines change: line 1 (the title) and line 3 (the banner). Everything else is an insertion: lines 41–42 (the paragraph and a blank line), 165–181 (three scenarios) and 190 (the Form-block line). No predecessor line below the banner is removed or reworded.
- `step_measures_build_spec.py . <scratch>/built.md --survival` printed "predecessor non-empty lines 110; carried in order 110; built non-empty lines 123; added 13; scenarios 16 -> 19". [Observed] The built file's sha256 equals the subject's digest. As a second method, I counted the non-empty added lines in the diff by hand: 1 paragraph + 11 scenario lines + 1 Form line = 13. [Observed] `grep -c "^#### Scenario"` gives 16 for the predecessor and 19 for the subject.
- **Implementation bytes.** [Observed] The worktree copy of `packages/polaris-dossier/src/step-measures.ts` differs from HEAD. It reads `refused += 0` in place of `refused++`. A running `node docs/evidence/syzygy-5dhm-25/step_measures_mutation.mjs` process is rewriting the file in place (seen in `ps`). So I reviewed the committed bytes (`git show HEAD:…`): step-measures.ts blob `d28ba0bd7f59…` and close.ts blob `fc8a46c87f0c…`, together with HEAD's `step-measures.test.ts` and `close.test.ts`. I did not run the test suite, because a run during the mutation would test the mutant. Every agreement between scenarios and code below comes from reading the code and the literal test expectations. [Inferred] Nothing was executed.
- Also read: `close.ts` (`closeStepMeasures`, `stepInstants`, `readLog`, `USAGE_NOT_RECORDED`, the secret screening at line 127 and lines 180–206), `review.ts` (where `review-check` steps are logged), `check.ts:162`, `session-handover.ts` and `waiting-sessions.ts` (where `session-prompt` steps are logged), the round loop at `scripts/dossier_stored_run_measures.py` lines 677–692, and CC-SPEC-4 (SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md:184, found via DIRECTIVE-REGISTER.md:126).

### Acceptance criteria

1. **Carried text and counts.** [Observed] Met. 110 lines are carried, 13 added, and scenarios go from 16 to 19. Only the title and banner lines change.
2. **The paragraph against the code.** [Observed] The paragraph matches the code on every point:
   - the member name `stepMeasures`, its place in `record.json`, and its use of the same capped lines (`STEP_LINES_MAX`) the step instants use;
   - the wall time, from the first readable row to the close instant;
   - the four first-instant times (first check, first passed check, first passed inventory check, first rendered render);
   - distinct revisions, with rows counted by outcome;
   - the round predicate (delivered or issued prompts; refused checks of the same kind; an unfinished round adds no time);
   - whole milliseconds;
   - a row is read only when it has a step name and a UTC instant;
   - the whole record is Inferred;
   - Unknown for an unreadable log, an empty log or a log with no readable row, for a missing row, and for out-of-order instants;
   - lines past the cap counted as unreadable.

   F2–F5 list where the text is looser than the code.
3. **Scenarios.** [Observed] Scenario 1's figures equal the literals in HEAD's `step-measures.test.ts` first case: opened 2, completed 1, unfinished 1, refusedSubmissions 1; draft revisions 2; inventory revisions 1; one completed design round. Scenario 2's reasons equal the code's strings ("the step log records no check row", "the step log records no delivered or issued design review prompt", "the step log records no step", and `steps.jsonl cannot be read (…)` from `readLog`). Scenario 3 matches `agentUsage` `{ state: 'not-recorded', label: 'Unknown' }` at close.ts:113.
4. **Secrets, usage and labels.** [Observed] Met. Nothing is labelled Observed, nothing claims usage, and no file body is copied. F1 notes a pre-existing unscreened channel that the new member also uses.

## Findings

**F1 (advisory; the gap pre-dates this change, and this change re-carries it).** The new member copies outcome strings written by the agent sessions, unscreened, as keys in `record.json`.
- Location: step-measures.ts `revisions()`, `byOutcome[row.outcome ?? 'none']`. This becomes `draftRevisions.rows` and `inventoryRevisions.rows`.
- The step log lies within the agent sessions' write reach. So any string a session writes as a `check` or `inventory-check` row's `outcome` lands verbatim in the record. The close-time secret screen (`close.ts:127`) is applied only to `reportedCommands`, although the comment at close.ts:180 says reported commands are screened "by the secret detectors that screen every other carried text".
- The predecessor's `steps.entries` already carries the same `outcome` strings unscreened. The new keys are a subset of those strings, so this does not weaken screening relative to 2.21. [Inferred]
- The paragraph says nothing about verbatim outcome keys. Two possible fixes: count only the known outcome words (`passed`, `findings`, `refused`) and put any other outcome under one fixed key, or screen the keys with the same detector.

**F2 (advisory).** The round predicate lets one validated check end more than one round.
- Paragraph text: "A round opens at a session prompt of the review role and that kind that was delivered or issued, and ends at the next review check of that kind that validated".
- Suppose two prompts of the same kind are logged before one validated check. Both rounds end at that check. Each round counts the refused checks after its own prompt, so refusals logged after the second prompt are counted twice, and the overlapping time is summed twice into the kind's `ms`.
- The code (`reviewRounds`) and figure f (`dossier_stored_run_measures.py` lines 681–692) both do exactly this. Text and code agree. [Inferred] It is a weakness of the predicate, not a code–text mismatch.
- Fix: either say that a round also ends at the next prompt of its kind, or state the overlap behaviour explicitly so readers do not take `opened`/`completed` as disjoint.

**F3 (advisory).** "Each time is in whole milliseconds between two logged instants" does not hold for the wall time.
- The wall time ends at "the close instant", which is Syzygy's clock at close (`isoOf(now)`). The `close` row is logged only after the record is written (close.ts:163), so that instant is not in the log being read. design.md says so. The paragraph sentence does not.
- Suggested wording: "between two logged instants, or, for the wall time, a logged instant and the close instant".

**F4 (advisory).** A revision count can be Unknown for a reason the paragraph's Unknown rule does not name.
- `revisions()` returns Unknown "no check row in the step log names a revision" when such rows exist but none carries a revision. The rule covers "a missing row", and this case has the row but lacks the field.
- The behaviour is right under VIS-2. The rule just does not literally state it.
- Relatedly, Scenario 1's WHEN says "a passed inventory check" without saying it names a revision, yet its THEN expects "one inventory revision". The test fixture's row carries `revision: 0`.
- Suggested fix: "a missing row, or rows that name no revision, makes…", and "a passed inventory check at revision 0" in Scenario 1.

**F5 (advisory).** An out-of-order instant voids the whole kind's rounds, not one round.
- Paragraph text: "instants out of order make the measure they bound Unknown rather than negative".
- In `reviewRounds`, a single round whose validated check precedes its prompt makes the entire `reviewRounds.<kind>` Unknown, including rounds that were well ordered.
- This is consistent if "the measure" means the kind's rounds, but the text does not say so.

**F6 (advisory).** The Form-block oracle cites a predicate that is not identical to the code's.
- Location: subject line 190, "every completed round of the stored runs compared with the round predicate of `scripts/dossier_stored_run_measures.py`".
- That script opens rounds only at `delivered` prompts (line 682). The code also opens them at `issued` prompts. design.md says no stored run holds an issued review prompt.
- So the stored-run comparison cannot falsify the `issued` branch. [Inferred] Only the literal case in step-measures.test.ts ("opens a round at an issued review prompt too") covers it.
- Name that literal case in the Form line, or note that the comparison covers delivered rounds only.

**F7 (advisory, editorial).** The miscount in Scenario 2.
- Scenario 2's WHEN names three cases ("records no check row and no design review prompt, or stands at its path but cannot be read, or is absent").
- The last AND says "no measure of either case is a zero". "Either" implies two cases. It should read "of any case".

**F8 (advisory, process).** The worktree's `step-measures.ts` was mutated in place during this review.
- A mutation runner was rewriting it (seen as `refused += 0`). Any test run, digest or commit taken from that worktree before the runner finishes and restores the file would bind mutant bytes.
- This review is bound to HEAD `d1a7cf9b4` blobs only.

## Summary

The subject's digest matches. The builder reproduces it byte for byte. The predecessor is carried unchanged: 110 lines carried, 13 added, scenarios 16 to 19, and only the title and banner rewritten. The added paragraph and three scenarios agree with the committed implementation and its literal tests on every figure, reason string, label and Unknown rule I checked. Nothing in the subject labels agent-writable data Observed or presents the measures as usage.

None of the exceptions is blocking:
- F1: outcome strings copied verbatim as record keys, unscreened. This pre-dates 2.27 but is re-carried by it.
- F2: rounds of one kind can overlap and double-count.
- F3–F5: imprecisions in the wall-time "two logged instants" sentence, the "names no revision" Unknown case, and the scope of the out-of-order rule.
- F6: an oracle that cannot reach the `issued` branch.
- F7: an editorial miscount.

I did not execute the tests, because a mutation runner was rewriting the implementation file in place (F8).
