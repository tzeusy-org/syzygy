# R-STEP-MEASURES-IMPL-1 — PR #1005 (syzygy-5dhm.25) stage timings and review rounds in the close record
Reviewed commit: 54204778eb82fe994a0c79955d480c4491ca9900
Verdict: CONFIRM WITH EXCEPTIONS
Subject: origin/agent/syzygy-5dhm.25-impl at the commit above, against merge base dba7a40f622084889db826a57bafeed0af22147a with origin/main. Acceptance: REQ-polaris-generation-033 v2.31 (openspec/changes/dossier-step-measures/ on main; A-310, tag polaris-dossier-step-measures-v2.31) and bead syzygy-5dhm.25.

## Summary

[Observed] The implementation matches the v2.31 clause and its four close scenarios. One bounded read (`readStepLog`, close.ts) feeds both the `steps` view and `stepMeasures`; the measures carry only numbers, closed labels and fixed reasons; whole-log Unknowns (absent, unreadable, empty, malformed, over 10,000 lines) and per-measure Unknowns are fixed strings; pairing is per kind in physical order, a newer opener supersedes, await and refused checks neither open nor pair; the encoder tries formatted full, compact full, formatted capacity-Unknown, compact capacity-Unknown, else a typed `capacity` refusal with no record written. The record format, steps view, operator usage declaration and provider disclosure keep their meaning. No blocking defect found. Two non-blocking test gaps follow, each shown by a surviving mutant I ran.

[Observed] Step-row field names checked against their writers: `check`/`inventory-check` rows carry `outcome` passed|findings|refused and `revision` (check.ts:162, :357); `render` outcome `rendered` (render.ts:279); `session-prompt` issued with role review, kind, session (session-handover.ts:325) and delivered with kind, session, round, round 1 included (waiting-sessions.ts:342, :361); `review-check` with outcome and kind (review.ts:212; the refused row at review.ts:133 carries no kind and so is ignored); `await` rows (waiting-sessions.ts:620-683) never open or pair.

## Findings

### F1 — non-blocking — equal-instant boundaries are untested
- Where: packages/polaris-dossier/src/step-measures.ts:107 (`if (end < start)`) and :135 (`if (row.ms < pending.ms) backwards = true`).
- Failure scenario: the spec makes only an ending *earlier* than its start Unknown; an ending at the same millisecond is a genuine 0 ms interval. A regression to `<=` would turn a real zero into `ending-before-start`, or make the whole paired sum `paired-interval-backwards`, and no test notices. Mutants `end <= start` and `row.ms <= pending.ms` each survived (17/17 tests pass). The code today is correct.
- Suggested fix: add literal cases in step-measures.test.ts where a stage row and a validation share their opener's/baseline's instant, expecting `{ state: 'measured', ms: 0 }`.

### F2 — non-blocking — preference of full measures over formatting is not discriminated
- Where: packages/polaris-dossier/src/close.ts:229-231 (`encodeExecutionRecord` candidate loop).
- Failure scenario: the spec requires that the capacity Unknown replace the measures "only when the full measures cannot fit", so a compact full record must win over a formatted capacity-Unknown record. Mutating the loop to try formatted full, then formatted capacity, then the compact forms survived (17/17 pass). In the ceiling test the formatted overhead of the fixture record is larger than the measures member, so formatted capacity never fits where compact full does [Inferred: the mutant survived, and the atFull case asserts Inferred measures]. A record with little formatting overhead (few members, one large string) could under such a regression lose measures it had room for.
- Suggested fix: a direct unit test of `encodeExecutionRecord` over a small synthetic record (one large string member plus `stepMeasures`) sized so formatted full exceeds 16,777,216 bytes, formatted capacity fits and compact full fits; expect the compact text with full measures.

## Checks of the brief's items

- Step-log parsing: only `polaris-dossier-step/1` objects with string `step` and an `at` that matches `YYYY-MM-DDTHH:MM:SS.mmmZ` and round-trips through `toISOString` are rows; anything else in the 10,000-line prefix makes the whole projection `step-log-malformed-row` with row counts. Correct.
- Pairing, elapsed arithmetic, Unknown reasons: read against the clause line by line; correct (see Summary). Sum overflow uses `Number.isSafeInteger` on a monotone nonnegative sum; correct.
- Size fallback chain: correct order; `fits` checks UTF-8 bytes and the status reader's `parseBoundedJson` limits, now shared via `CLOSE_RECORD_JSON_LIMITS` (status.ts:81). Refusal stage `capacity` leaves no record (test line 183-185).
- Every spec scenario has a test: "bounded step-derived measures" (close-step-measures.test.ts:86), "same bounded snapshot" (:103), "missing or refused observations" (:118 whole log, step-measures.test.ts:80-110 per measure, ceiling :151), "review rounds pair only within kind and order" (step-measures.test.ts:112, :142, :161; close path via LOG). Historic record readable (:145).
- Surviving mutants in docs/evidence/syzygy-5dhm-25/: claim verified by reading. `byte-check-chars` is redundant because `parseBoundedJson` itself rejects when `Buffer.byteLength(text, 'utf8') > limits.maxBytes` (packages/polaris-generation-core/src/parse-json.ts:28), and `fits` calls it with the same 16,777,216 bound. `instant-ms-optional` is redundant because `new Date(ms).toISOString()` always emits `.mmm`, so an instant without milliseconds fails the round trip (step-measures.ts:86). The record stores each mutant's old/new and the commit (fe3e55df...), and the compound mutants are listed as killed.
- A-314 row: full hash fe3e55dfe8b90ff60d621a97191c2b7ab9088931, what, why and revert command present. `git revert --no-commit fe3e55df...` in the snapshot staged 7 files (14+, 604-), and `git diff --cached dba7a40f6 -- packages vitest.tiers.ts apps scripts` was empty, so the command restores the code exactly to the merge base; then `git revert --abort`, tree clean.
- No secret or free text in the record: `stepMeasures` copies no instant, step field or string from the log (unit test :55 and code reading); `snapshot.why` is not copied into the measures. The existing `steps` view's copying of `outcome` is unchanged pre-existing behaviour.
- Placement: implementation only under packages/ plus vitest.tiers.ts; evidence under docs/evidence/; one governance row. The provider golden apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts is not in the diff.
- No synchronous long child process: the new tests spawn none; sync-child-process-guard.test.ts passed.

## Verification

- `git rev-parse origin/agent/syzygy-5dhm.25-impl` after `git fetch origin`: 54204778eb82fe994a0c79955d480c4491ca9900. Snapshot worktree .worktrees/parallel-agents/review-5dhm.25 at that commit, `npm ci` (added 120 packages), TMPDIR=/home/orca/.tmp/r25.
- Targeted run: `npx vitest run --project unit --project integration` over step-measures.test.ts, close-step-measures.test.ts, close.test.ts, status.test.ts, cli.test.ts, apps/three-surface-poc/src/sync-child-process-guard.test.ts and dossier-render-provider-golden.test.ts: Test Files 7 passed (7), Tests 223 passed (223).
- `npm run check`: exit 0; Test Files 224 passed (224); Tests 5670 passed, 1 skipped (5671).
- My mutations (each over step-measures.test.ts + close-step-measures.test.ts, restored with `git checkout --` after each):
  - M1 `end < start` -> `end <= start` (step-measures.ts:107): survived, 17 passed (F1).
  - M2 `row.ms < pending.ms` -> `row.ms <= pending.ms` (step-measures.ts:135): survived, 17 passed (F1).
  - M3 encoder tries both formatted candidates before compact (close.ts:229-231): survived, 17 passed (F2).
  - M4 `stepMeasures(stepLog, now)` -> `stepMeasures(readStepLog(run), now)` (second read): killed, 1 failed ("describes the first retained bytes in both projections ...").
  - M5 `review-check` rows of any kind pair (`if (row.kind !== kind && row.step !== 'review-check') continue;`): killed, 4 failed.
- `git status --short` in the snapshot after all mutations and the revert test: empty.
