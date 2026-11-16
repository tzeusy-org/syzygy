# Generation-mutation plan fragments: review dispositions, round 1

[Observed] This record gives the dispositions of the CC-REV-1 review of
`syzygy-kpbq` (pull request #543). The change makes the scheduled
generation-mutation gate (`.github/workflows/generation-mutation-gate.yml`)
run every mutant of its plan again. The gate had been red on every
scheduled run since 2026-10-04. The change:
- re-points `pipeline-repair-cycle-cap-disabled` at the two-line cap block
  that 5955f8c0 introduced;
- re-points `provider-draft-duplicate-handle-check-disabled` at
  `draft-model.ts`, where 69995614 moved `unique()`. The coordinator approved
  this on 2026-10-27, on the same follow-the-move ground;
- adds `generation-mutation.test.ts`, which asserts that every plan fragment
  occurs exactly once in its source.

No guarded source changes. The lane's evidence is the two run records under
`docs/evidence/` named in the PR body, and `docs/evidence/syzygy-kpbq/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GEN-MUTATION-PLAN-1-RAW.md` | `REVISE` | `e40af0ea` | `r1-review.diff` sha256 `72b3e27ad9c619852e25288d3a252c69d8fce40ee3fe0dc8618d1e557c6f7ba7` |

The subject equals `git diff 973965a8 e40af0ea`: 8 files, +672/−7. Of
those, 4 are code or CI, and their diff hashes to
`1a09d7ab61069389ba924e83d64bd115305f87a98c9d81be8c1fd2edff1f49eb`. The
reviewer re-derived both digests.

## The one blocking finding, and why there was no round 2

Round 1's only blocking finding, F1, was a sentence in the PR body, not in
the reviewed bytes. It was the disclosure "Only the gate's CI scratch run
mutates it, and that run restores it digest-verified", about
`draft-model.ts`. The sentence is false on two counts:
- a local `npm run poc:generation-mutation-run` also rewrites the file in
  place, as this PR's own run at `3669ae24` did;
- after a mid-run throw, the runner's outer `finally`
  (`generation-mutation-run-main.ts:188-191`) writes the bytes back with no
  digest check, and the workflow's restore-check step is skipped.

The reviewer stated that no reviewed byte has to change, and gave
replacement text.

**Ruling (coordinator, 2026-10-27).** The coordinator replaced the sentence
in the PR body with the reviewer's text. In the same edit, it added
"CC-REV-1 classes: none" (N1) and corrected the base-relative anchor (N5).
At `e40af0ea` the throw is at `generation-mutation.ts:36`, called from
`generation-mutation-run-main.ts:125`. The coordinator checked both anchors
at that commit.

The PR body the reviewer read hashes to
`69f51ea2e2240f0fdfae691dcdd3242c091de0ff1fd6bbdcc8917760532528dd`. The file
the coordinator applied hashes to
`97d73823fb4e6d7e0c377ad878bd6f18258bdfeaa659358aa72cfa7069280661`. The
reviewed bytes are
unchanged at `e40af0ea`, and every other finding is a note. So no round 2 was
dispatched, and the reviewed bytes stand with notes only.

Revise-severity findings open in the reviewed bytes: 0.

## What the reviewer verified

All of the following are [Observed] in the raw, sections 3 and 6:
- **The cap re-point** disables the same predicate as before the split,
  `repairs >= budget.maxRepairCycles`. The mutant's `to` is its `from` with
  exactly that substring replaced by `false`. It also disables the
  quote-only `break`, which the same predicate guards. The kill is the
  must-fail test's reason mismatch: `budget-exhausted` received where
  `repair-exhausted` is expected. It is not a timeout.
- **The `draft-model.ts` re-point.** 69995614 moved `unique()` verbatim; only
  `export ` was added. The plan entry changes only its `file`. The two
  callers inside `draft-model.ts` also moved from `provider-draft.ts`, so the
  mutant reaches the same call sites as before the move.
- **The whole plan,** run with the gate's own command at `e40af0ea`: 12 of 12
  applied and killed, 0 restore failures. The reviewer's run record equals
  the PR's for all 12. The hosted dispatch, run 40508139318, also killed 12
  of 12.
- **The fragment test** fails on a zero-occurrence, a two-occurrence and an
  empty fragment. It reads the files the runner mutates. `plan_test_mutants.py`
  re-run kills 7 of 7.
- **The history.** The reviewer checked all 26 run logs, not a sample:
  - each of the 24 failing scheduled runs prints 7 kills and then the cap
    fragment error;
  - the last green run and the dispatched run each killed 12 of 12.
- **The checks:**
  - full vitest at `e40af0ea`: 5,438 passed, 5 skipped of 5,443, 0 failed;
  - typecheck exit 0;
  - governance 32 OK, 21 WARN, 0 FAIL;
  - quotations 0 findings;
  - hosted `checks` and `node` pass;
  - the fragment test passes on a local merge with main `d621bfa2`, and no
    PR path overlaps main.

## Class and the GP-Q0 ruling

The reviewer ruled CC-REV-1 class none, and the change behaviour-preserving
under GP-Q0 (raw section 2). No product source changes: the 5 mutated
sources are byte-identical at base and head. The changes in outcome are CI
only:
- the scheduled generation-mutation gate goes from red to green;
- node-ci gains a test that refuses a plan fragment that drifts from its
  source.

The coordinator's ruling in `syzygy-kpbq` asked for an owner notice on
`syzygy-bpyt.10` at landing anyway, because a CI gate's outcome changes. N9
asks that notice to name both changes, and it does.

## The notes

- **N1** (the change record stated no CC-REV-1 classes) and **N5** (a
  base-relative line anchor): repaired in the PR body, as ruled above. N5's
  copy of the anchor in a `syzygy-bpyt.4.6` comment is corrected by a later
  comment on that bead.
- **N2** (the fragment test stops at the first drift, and two assertions do
  not name the mutant), **N3** (four textual test mutants survive), **N4**
  (the plan comment "three per subject file" is false at head), **N6**
  (restoration after a throw is unverified, and CI skips its restore check),
  **N7** (the reviewer-blocking predicate 5955f8c0 added has no plan mutant)
  and **N8** (the test header's "23 runs" was stale at commit time) are
  carried to `syzygy-vsqr`, items 1 to 6. `syzygy-bpyt.4.6` may absorb items
  2, 5 and 6. N3's R4 (a `mustFail` name that matches no test) was already
  on `syzygy-bpyt.4.6`.
- **N9** (the owner notice should name both CI-gate changes): done in the
  notice.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/gen-mutation-plan-review-2026-10-27/r1/`, 22 files. The raw's
cleanup section lists 27 kept files with their sha256. At landing, a script
checked all 27 against the reviewer's directory: 27 matched, 0 failed, and
no file was unlisted.

Not retained, though the raw quotes each one's result line:
- `governance.txt` and `quotations.txt`: a governance log quotes the retired
  phrases it reports, so a tracked copy would fail CG-2a;
- `typecheck.txt` and `npm-ci.log`;
- `pr-body.md`: the PR body before the coordinator's edit, which is the
  pull request's own history.

This is an implementation record and binds nothing.
