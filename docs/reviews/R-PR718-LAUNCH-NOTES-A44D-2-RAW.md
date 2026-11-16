# R-PR718-LAUNCH-NOTES-A44D-2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context subagent, 2026-11-04
Reviewed commit: a44df72a4699bce9bf556290ce7a923b9cf248f6

## Findings

**P1. Non-blocking. The narrowed N2 sentence now tells the session to "repair and try again" on gate refusals it cannot repair.** packages/polaris-dossier/src/polaris.ts:334. Criterion 2.
- [Observed] The integrity refusals the inventory session can meet are worded so the session will recognise them:
  - The brief rehash at waiting-sessions.ts:532 says "`inventory-brief…` does not hash to the digest Syzygy recorded when it wrote it; stop, and tell the operator". That matches "a file or digest does not match what Syzygy recorded" almost word for word.
  - The packet rehash at waiting-sessions.ts:582 also says "stop, and tell the operator", but that one is on the review path.
  - The `submit` stdin refusal (waiting-sessions.ts:488-489) now correctly falls under "repair any other refusal", so N2 is repaired.
- [Observed] Several refusals are neither repairable nor phrased as a file or digest mismatch:
  - check.ts:156 (`reverify`): "the pinned revision could not be verified again, so the inventory is not checked". Its codes are registry, policy, consent-ids and statement. Only `governed-changed` (reverify.ts:150, "not the … the run record states") reads close to a mismatch.
  - check.ts:166 (`deadline`).
  - check.ts:171 (`repair-limit`).
  - waiting-sessions.ts:531: "the inventory brief cannot be read (…)".
- Under the old sentence these stopped the session. Under the new one the session is told to repair and retry.
- [Inferred] The harm is bounded. These gate refusals write no check record, so no repair cycle is spent. The supervisor loop still ends the run at the deadline or the limit stop. The cost is futile retries rather than a clear stop.
- Minimum fix, if wanted: add a clause such as "…or that the run cannot continue (the pinned revision cannot be re-verified, the deadline has passed, or the repair-cycle limit is spent)".

**P2. Non-blocking. The loop's call-site arguments remain untested.** polaris.ts:597-599. Criterion 1.
- `limitStop` is pure and exported, and the loop uses it. Both mutants recorded as killed:
  - n1-draft-stop-dropped
  - n1-inventory-stop-dropped
- [Inferred, by reading test lines 184-186; I did not re-run either mutant, because this was a read-only review] Each would fail:
  - Dropping the draft stop makes `limitStop(refused(6), passed(1), …)` return null instead of the draft string.
  - Dropping the inventory stop does the same for `limitStop(passed(2), refused(6), …)`.
- Still unexercised at the call site:
  - swapping the two record arguments;
  - passing `RUN_LAYOUT.checks` in place of `INVENTORY_CHECKS`.
- This is the residual F6 gap that the prior review already named. It is not a new defect.

## Checked clean

- **N1 evidence record:** `subjectSha256` is f9b3a54b…. It equals both `git show a44df72a:packages/polaris-dossier/src/polaris.ts | sha256sum` and the working-tree file. The record has 33 mutants, and each `old` fragment occurs exactly once in the subject (checked by script). Both n1 entries are marked `killed`. `baseCommit` was moved to 39373a2e.
- **N3:**
  - polaris.ts:597 reads the draft record once.
  - The same `draft` feeds `limitStop` (598) and `passedDraft` (600).
  - The draft is read before the inventory, the same order as before.
  - The stop strings are byte-identical to the previous inline ones, including the draft-only `cycleBreakdown` suffix, which is now passed lazily as `() => cycleBreakdown(run)`.
  - The only behaviour change: the inventory record is now read even when the draft side stops. That is harmless.
- **The G1 test (test:38) and mutant g1-sentence-dropped** were updated to the new sentence. The old "If a command refuses for any other reason" text is gone.
- **Criterion 4:**
  - `npx vitest run packages/polaris-dossier/src/polaris-launch-guidance.test.ts` passed 22 of 22 tests.
  - `npx tsc --noEmit -p .` printed nothing and exited 0.
  - `git status` is clean, and no files were modified by this review.
