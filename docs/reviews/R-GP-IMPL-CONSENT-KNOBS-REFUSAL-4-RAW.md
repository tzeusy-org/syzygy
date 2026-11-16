# R-GP-IMPL-CONSENT-KNOBS-REFUSAL-4 — narrow recheck of PR #640 X2/X3 repairs
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: fa385e485d16d37b2e2997b3432b092248dbefe0
Base: ba0d8af6bb7db75638f28f4df20031be5355d455

- Scope: a narrow recheck of the commits after `9dde4cc2`, which round 3 reviewed. Round 3 is `R-GP-IMPL-CONSENT-KNOBS-REFUSAL-3-RAW.md`, CONFIRM WITH EXCEPTIONS.
- Base: the `Base:` line names the PR's merge base. `origin/main` has since moved to `74c44cc0d38888316a268ff1111f709c4a98dc2f`; this review did not compare against it.
- Head: `gh pr view 640` reports `fa385e485d16d37b2e2997b3432b092248dbefe0`. It is one commit over `9dde4cc2`, namely `fa385e485` "docs: the policy family has eight forms; mark the README's no-performed-act sentence stale".
- Method: the round-3 worktree was moved, detached, to the head. The checks were `npm run check`, `scripts/check_governance.py` and `gh pr checks 640`.

## Verdict basis

The code repairs are confirmed:

- X2 is repaired; the count of eight is correct.
- The README part of round-3 N2 is repaired.
- The diff changes no code.
- The local gates pass.

X3 is repaired only in part. The three sentences round 3 named are now marked in place, but other claims in the PR body went stale with the rebase and are still unmarked. All of it is prose and changes no answer. One hosted check, `checks (governance)`, was still pending when this was written.

## Checks

1. The diff `9dde4cc2..fa385e48` is prose only [Observed].
   - Files: `git diff --stat` lists two, `README.md` (+1 −1) and `src/package-reader.ts` (+8 −7).
   - Code: with every `/* … */` block stripped by a Python regex, the head's `package-reader.ts` is string-equal to `9dde4cc2`'s. Every changed line in that file falls inside the `POLICY_FAMILY` docstring.
   - README: `git diff --word-diff` shows only the inserted marker. It turns "no performed act exists today, so the reader returns no record from the live tree." into `[Stale 2026-11-16: "…" The admission reader now returns one record, PUBLIC-OBS-REDIS-2026-10-03, …]`.
   - Tests: no test file changed.
2. The count of eight is correct [Observed].
   - The `POLICY_ACT_FORMS` literal lists eight `file:` entries: `…PUBLIC-SOURCE-SCOPE-ACT.md` and `-V2-` through `-V8-ACT.md`.
   - Round 3 read the same 8 from the built index.
   - The new docstring names them correctly as "the public-source-scope act and its V2 to V8 successors".
3. The README marker is accurate [Observed].
   - In the retained `verdicts-over-tree-runs-2026-11-16.json`, `admission` is `PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7` at all 7 instants.
4. PR body: round 3's three sentences are marked accurately [Observed].
   - Outcome: both quoted sentences are marked `[Stale 2026-11-16: …]`, quoted exactly. The current state is correct: the 2026-11-15 answer, the rebase onto `ba0d8af6`, 0 of 357, and the round-3 verdict copied exactly.
   - The N2 bullet: "pending the owner's decision" is marked and quoted exactly, and the current text is correct.
   - The coordinator paragraph: "retained as an unresolved source correction" and "the current-tree comparison remains Unknown" are marked, and the current text is correct.
5. Gates [Observed].
   - `npm run check` exit 0: 188 test files, 4477 passed and 1 skipped of 4478.
   - `check_governance.py`: 32 OK, 21 WARN, 0 FAIL.
   - `gh pr checks 640` when read:
     - passing: `node`, `node (unit)`, `node (integration)`, `node (e2e)`, and the P115, readability and reconciliation selftests;
     - **`checks (governance)` pending**, so the hosted result is not yet complete.
6. The round-3 raw is byte-identical on #642 [Observed].
   - `git show 1599920f8:docs/reviews/R-GP-IMPL-CONSENT-KNOBS-REFUSAL-3-RAW.md | sha256sum` gives `30f313a2eb55d65a4797d565d4fe2d1e18c46d690c167aeaaba69ec1d9cbf09c`.
   - My file at `/home/orca/.tmp/syzygy-looper-20261116/R-GP-IMPL-CONSENT-KNOBS-REFUSAL-3-RAW.md` hashes to the same value.
   - `1599920f8` is contained in `origin/agent/syzygy-pkym`.

## Findings

### X3-residual (exception, low; prose only) — the PR body still has unmarked claims made stale by the rebase [Observed]

Anchor: the PR #640 body as read at head `fa385e48`. Round 3 did not list these claims; the rebase made them false.

- **"Gates at the head, rebased on `a332ff69`:"**
  - The line reports `npm test` 3629 of 3629, and the integration tier 1494 of 1494.
  - The head is now rebased on `ba0d8af6`; `npm run check` at `fa385e48` runs 4478 tests.
  - The line is unmarked.
- **GP-Q0 part 1, the first bullet: "today's `origin/main` `a332ff69` change no file …"**
  - "today's" no longer holds: main is `74c44cc0`, and the PR's base is `ba0d8af6`.
  - It is unmarked.
- **E1 disposition: "All three records were regenerated at `c962c7bd`, which this branch reaches"**
  - `git merge-base --is-ancestor c962c7bd fa385e48` fails: after the rebase, the branch no longer reaches that commit.
  - Its next sentence is false too: "The later test-and-doc commit does not change `package-reader.ts`". `ffca5d2d` and `fa385e48` both change that file's comments.
  - Neither sentence is marked. The body's own fallback ("re-check the records by digest") still holds.
- **The Outcome marker claims more than was done.** It says "its X2 and X3 are repaired at `fa385e48` and in this body". By the items above, that holds only for the three sentences round 3 named.
- Repair: mark each sentence above in place, quoted and dated, in the same form already used. No code or answer changes.

### N1 (note) — two coordinator-paragraph phrases are left unmarked [Inferred]

- The phrases: "full original task remains OPEN/BLOCKED" and "Existing round2 … MERGE HELD".
- Both are true as history. The task is still incomplete, because the stem is excluded.
- But after the 2026-11-15 ruling, the merge hold is no longer the current state.
- The appended marker says the owner's answer "settles the policy-stem question". That covers this only by implication, so marking these two phrases explicitly is the stricter reading of the CG-27 lesson.

### N2 (note) — a pre-existing count, still unrepaired [Observed]

- `readPolicyActs`' docstring says "version 1 to 7" (`package-reader.ts`, around line 419). There are 8 versions.
- Round 3 recorded this as pre-existing and outside the PR; it is unchanged.
