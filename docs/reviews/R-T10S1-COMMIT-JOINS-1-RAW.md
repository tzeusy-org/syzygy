# Review R-T10S1-COMMIT-JOINS-1
Verdict: REVISE
Reviewer: fresh-context Claude Code review subagent, CC-REV-1, read-only
Subject: commit 1eafbd3c2

## Bytes bound

- Commit: `1eafbd3c2e1ea9fb9a76c15afce13122c4320629` (parent `1eafbd3c2~1`;
  `origin/main` is an ancestor) [Observed: `git log -1 --format=%H`,
  `git merge-base --is-ancestor`].
- `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`
  at 1eafbd3c2: sha256 `4c70f9a0189141449d93f0f878e1d81004032d4bc0ae5720f142609c462cba81`
  [Observed: `git show 1eafbd3c2:<path> | sha256sum`; equals the source digest
  printed in the generated GOVERNING-DEPENDENCIES.md].
- `packages/three-surface-poc-core/src/commit-joins.ts` at 1eafbd3c2: sha256
  `3c7839b0d32459b02cb8fd36309ca052a39e9fc73dce775470dbd3dcc4b5c275`
  [Observed: same method; equals `rule.sha256` in the committed evidence record
  `docs/evidence/syzygy-t3jk-25/proving-project-commit-join-measurement-2026-11-26.json`].
- Uncommitted/untracked files in the worktree were not judged. The worktree
  HEAD was 1eafbd3c2 throughout; `git status --porcelain --untracked-files=no`
  was empty at the end (0 lines) [Observed].

## What was run

- `npx vitest run packages/three-surface-poc-core/src/commit-joins.test.ts`:
  5 passed; `npx vitest run apps/three-surface-poc/src/trajectory.test.ts -t syzygy-t3jk.25`:
  1 passed, 69 skipped [Observed].
- 15 source mutants of `commit-joins.ts`, each run against both test files,
  then restored (script in the reviewer's scratchpad; old/new fragments listed
  under finding 5) [Observed].
- Coverage recount by a Python sweep over `| RFC<n>-` rows per part of
  CONTRACT-COVERAGE.md at 1eafbd3c2 and at its parent [Observed].
- `python3 scripts/build_three_surface_poc_spec_dependencies.py --check`:
  "match regeneration — 31 requirement(s), 115 distinct authorities" [Observed].
- `python3 scripts/check_spec_reconciliation.py --check` in a scratch clone at
  the parent (R1–R5 and R7 OK, R6 WARN) and at 1eafbd3c2 (R1, R2, R3 FAIL)
  [Observed].
- A tsx probe of `observeCommitJoins` with an empty git output [Observed].

## Acceptance criteria

1. Pinned and bounded, truncation stated — met [Observed]. The single call is
   `['log', '--max-count=5001', '--format=%H\x1f%cI\x1f%s', <revision>, '--']`;
   the revision must match a full 40/64-hex object id; `truncated` is
   `lines.length > 5000`; at most 5,000 rows are counted. The unit test pins
   the argument vector literally, and the integration test adds a naming
   commit after the observed revision that is not joined.
2. Exact-token joins only — met [Observed]. `subjectTokens` splits on
   `[^A-Za-z0-9._-]+`, trims `[._-]` from both ends, and joins only on
   `served.has(token)`. Case-fold, prefix and no-trim mutants are killed.
3. No subject or author text in either channel — met [Observed]. Only `%H`,
   `%cI` and `%s` are requested; the subject is sliced for tokens and dropped;
   `CommitJoin` holds `{hash, at}`; a thrown git error (which carries
   stdout/stderr) is caught and discarded. The integration test checks for the
   marker in both `/api/poc` and the Trajectory page; a subject-leak mutant is
   killed by both files. [Inferred] Only identifiers already served can come
   out of a join, so the join adds no new free text to either channel (SEC-5).
4. Unknown with a closed reason, never an observed zero — **partly met**; see
   finding 1 (empty read gives an observed zero).
5. The RFC2-18/19 decision — the trigger property is sound, but the stated
   trigger set is incomplete and the RFC2-19 mapping is a paraphrase; see
   findings 4 and 6. [Observed] In `apps/three-surface-poc/src` (non-test
   `.ts`), a sweep for `setInterval|setTimeout|fs.watch|watchFile|chokidar|.watch(|schedule|poll`
   finds only `restart.ts` (pause), `fresh-checkout-demo-main.ts` and
   `cdp-browser.ts` timeouts, and comments in `watch-mode.ts`,
   `reobserve-session.ts` and `walkthrough-inputs.ts`. None rebuilds the model.
   `buildPocModel` runs from `createReobserveSession` at three points: daemon
   start (`options.build(options.capture)`), `reobserve()` (browser action or
   an Enter line in `--watch`), and `afterMaterialized()` (wired as
   `onMaterialized` in `poc-main.ts:274`, i.e. after an operator materialize).
   `/api/poc` serves the cached `session.model()`.
6. Coverage totals and moves — **Part A correct, Parts B1 and B2 stated totals
   stale**; see finding 2.
7. Tests fail if a predicate is removed — 14 of 15 mutants killed; the hash
   check survives; see finding 5.
8. Spec text matches code — mostly; see findings 1, 3 and 4.

## Findings

### 1. must-fix — An empty history read is served as an observed zero

[Observed] With `runGit` returning `''`, `observeCommitJoins` returns
`{"kind":"observed", "read":0, "truncated":false, "joined":0, "unjoined":0, "items":[]}`
(tsx probe at 1eafbd3c2). Output `'\n'` gives `commit-history-malformed`,
because the one empty line fails the field-separator test.
The cause is the guard `if (read > 0 && lines[0] !== undefined && !lines[0].startsWith(input.revision))`:
with no rows, nothing is checked. A `git log <commit>` that succeeds always
returns at least that commit, so zero rows means the read did not return the
pinned revision. The spec's own Unknown arm already covers this ("the newest
row is not the pinned revision" → `commit-history-malformed`), and the
requirement says "A failed join is never served as an observed zero" (VIS-2).
[Inferred] This is unreachable with today's real `git` in normal operation.
It is reachable through the injected `runGit` seam and through any git
wrapper or config that suppresses output. Repair: treat `lines.length === 0`
as `commit-history-malformed`, and add the case to the Unknown table test.

### 2. must-fix — CONTRACT-COVERAGE.md Part B1 and Part B2 totals are stale after the move

[Observed] Recount at 1eafbd3c2, matching `| RFC<n>-` rows between section
headings:
- Part A: 185 rows, 91 clauses, 132 covered, 53 Unknown. This matches the
  printed totals and the generated `contracts (91)`.
- Part B1: 28 rows over 27 clauses, all Unknown. The file still prints
  "**29 consequence rows over 28 clauses — all Unknown.**" (lines 351–352),
  which was right at the parent (29/28).
- Part B2: 206 clauses. The file still prints "Part B2 total `[Observed, computed]`: **208 clauses.**"
  (line 574), which was right at the parent.
- The per-family table (A/B1/B2 = 91/27/206, RFC2 11/0/16, RFC4 11/1/20,
  RFC8 17/0/15) and the "Verifying this table" sum (91 + 27 + 206 = 324) are
  correct. The three parts are pairwise disjoint.

Both stale lines are labelled `[Observed, computed]` and are now false
(verification rule 3). This fails acceptance criterion 6. Repair: 28 rows over
27 clauses; 206 clauses.

### 3. must-fix — The RFC4-22 "renders Unknown" limb is claimed covered, but an unjoined served item is silently absent

[Observed] RFC4-22 (fidelity-joins-and-mappings.md, line 87–89): "A join that
can no longer be established (branch deleted, message tag absent) renders
Unknown — never fuzzy-matched." The new Part A row claims "covered" for
"...; a join that cannot be established is Unknown, never fuzzy-matched".
The code and spec give `items` only "for each served item some commit names".
A served item that no read commit names gets no entry and no per-item state:
it is neither listed as Unknown nor given a reason. The no-fuzzy half holds.
The Unknown half holds only for the whole join (four closed reasons), not
for the per-item join that the clause addresses.
[Observed] The committed measurement record shows that on the proving
project the read is `truncated: true` (5,000 of more). So an item absent from
`items` may be absent because no commit names it, or because its commits lie
beyond the bound. A consumer that reads absence as "no commits" turns Unknown
into zero (VIS-2). The served `truncated` flag does not tell the two apart
per item.
Repair, either way: serve the unjoined served items with an Unknown state and
a closed reason, for example `no-naming-commit-within-bound` versus a
truncation qualifier; or narrow the covered row to the no-fuzzy limb and move
the "renders Unknown" limb to an Unknown row.

### 4. should-fix — The trigger statement omits the post-materialize rebuild

[Observed] The spec ("The read runs inside the observation pass, which runs
when the daemon starts or an operator re-observes (RFC2-19)") and the
`model-slices.ts` comment ("runs only when the daemon starts or an operator
re-observes") both leave out the third caller: `afterMaterialized()` in
`reobserve-session.ts` calls `options.build(capture)`, which re-runs
`buildPocModel` and with it the `git log`.
[Inferred] That rebuild is still human-triggered (an operator materialize)
and reads the same pinned revision, so the RFC2-19 trigger property holds and
the author's conclusion stands. Only the enumerated statement is incomplete.
Repair: name all three triggers, or say "only on a human-triggered
observation or rebuild".

### 5. should-fix — The per-row hash check survives mutation

[Observed] Mutant `no-hash`: `!REVISION.test(hash) || !INSTANT.test(at)` →
`!INSTANT.test(at)`. Both test files pass. The only malformed-hash fixture,
`line('not-a-hash', …)`, is the first row, so the newest-row check
(`!lines[0].startsWith(input.revision)`) rejects it first. A non-hex hash in
any later row is accepted and served as a `hash` (rule 6).
Other mutants and outcomes, each against both files:

| Mutant | old → new | Outcome |
|---|---|---|
| no-trim | `run.replace(/^[._-]+\|[._-]+$/g, '')` → `run` | killed |
| casefold | `served.has(token)` → `… \|\| served.has(token.toLowerCase())` | killed |
| prefix | `served.has(token)` → `[...served].some(id => token.startsWith(id))` | killed |
| no-newest-check | newest-row guard → `if (false)` | killed |
| no-truncated | `lines.length > COMMIT_HISTORY_BOUND` → `false` | killed |
| no-slice | `lines.slice(0, COMMIT_HISTORY_BOUND)` → `lines` | killed |
| all-ref | `input.revision, '--',` → `'--all', '--',` | killed (both files) |
| no-instant | drop `!INSTANT.test(at)` | killed |
| no-rev-check | revision guard → `if (false)` | killed |
| no-workitems | work-items guard → `if (false)` | killed |
| leak-subject | push `{hash, at, subject}` | killed (both files) |
| catch-to-zero | read-failed return → `raw = ''` | killed |
| dedupe-off | `new Set(...)` dropped | killed (both files) |
| unjoined-off | `read - joined` → `read` | killed (both files) |

Repair: add a malformed-hash case in a non-first row.

### 6. should-fix — The RFC2-19 Part A row maps a limb the clause does not state

[Observed] RFC2-19 (reconciliation-chain.md line 245): "The loop is
human-triggered: reconciliation evaluations run inside a deliberately
triggered propagate/sync or observation pass, never autonomously on merge
events." The new covered row reads "Reading merge facts runs inside a
deliberately triggered observation pass, never autonomously on a merge
event." The join reads commit subjects, not merge facts, and computes no
reconciliation evaluation; the requirement itself says so ("It computes no
reconciliation chain state (RFC2-18)").
[Inferred] The POC does keep the trigger discipline, but the row paraphrases
the clause into a limb about reading merge facts (rule 8: quote the clause,
not nearby prose). It also moves RFC2-19 out of Part B2 on a requirement that
performs no act the clause governs. Repair: re-anchor the row to the clause's
own words with an explicit "by extension" fold note, or keep RFC2-19 in
Part B2 and cite it in POC-REQ-064 as context only. RFC2-18 is correctly left
uncovered.

### 7. should-fix — At 1eafbd3c2 alone, the spec reconciliation battery fails

[Observed] `scripts/check_spec_reconciliation.py --check` in a scratch clone:
- at the parent: R1–R5 and R7 OK, R6 WARN with 2 findings (pre-existing);
- at 1eafbd3c2: R1 FAIL (1 finding), R2 FAIL (16 findings: "broken chain —
  reversing … proposed/*.patch over the successor row … does not yield the
  row the chain reached" for earlier POC amendments' spec.md,
  CONTRACT-COVERAGE.md and GOVERNING-DEPENDENCIES.md), and R3 FAIL
  (3 findings, including "POC: 31 requirements / 59 scenarios, expected 26 / 28"
  and a census mismatch).

The commit registers `three-surface-poc-commit-joins-amendment-v1.0` in
`POC_SCENARIO_AMENDMENTS`, but the commit contains no amendment package,
adoption row or tag. [Inferred] The change record another session is drafting
is expected to supply these. The commit must not land on `main` without them,
and the battery must be re-run green on the combined head (rule 7).

### 8. note — The evidence record measured a replica, not the module

[Observed] The committed measurement record names the module and its digest
(rule 11 satisfied), but its method is "a Python replica of subjectTokens and
the bound". [Inferred] Its figures (3,804 of 5,000 joined) are evidence about
the replica. Running the TS module once over the same history, or a
differential over a sample, would tie the figure to the bytes it names.

### 9. note — Bound semantics

[Observed] When truncated, git returns the 5,001st row, and the code holds it
in memory and then drops it unread for tokens. That is harmless. `read` counts
only the rows checked, and any malformed row in the first 5,000 makes the
whole join Unknown (fail-closed).

## Count

must-fix 3, should-fix 4, note 2.
