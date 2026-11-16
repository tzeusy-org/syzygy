# R-PR722-LAUNCH-GATES-052F-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context subagent, 2026-11-04
Reviewed commit: 052f236531f3966bdbde7ffc8993657cebbfa39d

## Findings

**P1. Non-blocking. A few unrepairable refusals still fall under "repair any other refusal and try again".** packages/polaris-dossier/src/polaris.ts:334. Criterion 1.
- [Observed] The new clause matches the three gate refusals named in R-PR718-LAUNCH-NOTES-A44D-2 P1 closely enough for a session to recognise them:
  - check.ts:156 prints "the pinned revision could not be verified again". The guidance says "the pinned revision cannot be verified again".
  - check.ts:166 prints "the deadline … ended at …; no step runs after it". The guidance says "the run's deadline has passed".
  - check.ts:171 prints "…; the repair-cycle limit is spent". The guidance uses that wording exactly.
- [Observed] Repairable refusals still fall under "repair and try again": the stdin refusal (waiting-sessions.ts:487-488), "the file to submit must exist inside …" (:490), and finding-level check failures.
- [Observed] Some refusals the session cannot repair are still not covered by the new clause:
  - check.ts:269/271/274 (`not-briefed`): the brief record is missing, does not name the pinned revision, or states no issue instant.
  - waiting-sessions.ts:531: "the inventory brief cannot be read (…)".
  - waiting-sessions.ts:484: "… is no longer the latest inventory session, so its file is not checked".
- [Inferred] The harm is the same bounded kind as before. None of these refusals writes a check record, and the supervisor loop still ends the run at the deadline or limit stop. The cost is futile retries rather than a wrong result. All of these refusals are rare in a launched run.

**P2. Non-blocking. One untested step remains in the loop: the call to `limitStop`.** polaris.ts:602-603. Criterion 2.
- [Observed] `latestChecks` (polaris.ts:538-540) is exported, and the loop now takes both records from it.
- [Observed] The new tests (polaris-launch-guidance.test.ts:195-210) put rev-5 and rev-6 under `checks/` and rev-2 under `inventory/checks/`, then assert n=6 for the draft and n=2 for the inventory. Both evidence mutants would therefore fail:
  - `p2-sides-swapped`: the draft would read rev-2.
  - `p2-inventory-wrong-dir`: the inventory would read rev-6.
- [Observed] The loop passes the records on as `limitStop(draft, inventoryCheck, …)` (:603). Swapping those two arguments is still untested. The gap is now one line of argument order, smaller than before. A unit test can reach it only by testing the loop itself.
- [Observed] Evidence record `docs/evidence/syzygy-1z8m-6/launched-run-gate-mutants-2026-11-04.json`:
  - `subjectSha256` is d055733a…c4a4. It equals `git show 052f2365:packages/polaris-dossier/src/polaris.ts | sha256sum` and the working-tree file.
  - The record holds 36 mutants, all `killed`.
  - A script confirmed that each `old` fragment occurs exactly once in the subject. This includes `p1-unrepairable-clause-dropped`, `p2-sides-swapped` and `p2-inventory-wrong-dir`.
  - I did not re-run the mutants myself, because this review was read-only.

## Checked clean

- **Criterion 3, loop behaviour:**
  - The draft is renamed only on the inventory side, to `inventoryCheck` (:602), and the name is used only at :603.
  - The later `const inventory = await inventoryOfRecord(…)` (:606) is a separate binding, and every later use refers to it: :618, :626, :651-655, :691.
  - `draft` is one binding, used by `limitStop`, `passedDraft`, `site` and `repairsSpent`, as before.
  - The draft is still read before the inventory, and the stop strings and lazy `cycleBreakdown` are unchanged.
- **Criterion 4, checks run from the worktree root:**
  - `npx vitest run packages/polaris-dossier/src/polaris-launch-guidance.test.ts` passed 24 of 24 tests.
  - `npx tsc --noEmit -p .` printed nothing and exited 0.
  - `git status` is clean, and this review modified no files.
- **Tests:** the G1 literal at test:38 matches the new sentence byte for byte. No new defect was found.
