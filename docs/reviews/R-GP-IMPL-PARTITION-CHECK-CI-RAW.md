# R-GP-IMPL-PARTITION-CHECK-CI — review of PR #705 (syzygy-5pem), round 1
Verdict: REVISE
Reviewed commit: f59a2f163ba634abcf46ef4ddcf9fff56ed61ca0
Subject: PR #705

Reviewer: fresh-context PR reviewer, review bead `syzygy-trbo`. Subject bead
`syzygy-5pem`: "Run check_docs_review_campaign_partition.py --check in CI
(CG-26 triple)". Acceptance criteria: (1) workflow step, battery line and
count word added in one commit; (2) a PR with an unmatched raw fails CI
(rule 6).

Diff under review: `f59a2f16` against merge base `2a99baa0` (origin/main at
review time `2b8d01ac`; `PROJECT-STATUS.md`, `.github/workflows/` and
`docs/README.md` are unchanged between the two). Two files: one workflow step
plus a five-line comment after `check_quotations --selftest` in the single
`checks` job of `.github/workflows/governance-docs.yml`; one battery line and
the count word 113 -> 114 in `PROJECT-STATUS.md`. One commit.

## Verdict basis

The mechanics are correct and both acceptance criteria are met: one commit
carries the triple, CG-26 is OK at 114/114/114, the step fails the job on a
non-zero exit, and an unmatched raw fails the check. The verdict is REVISE for
one finding (F1): the comment the PR adds says the step checks something it
does not check. Two exceptions (F2, F3) should be taken in the same revision
because the triple is being edited anyway. The notes (N1, N2) answer the
coordinator's questions and need no change to this PR.

## Findings

F1 (REVISE). The added workflow comment describes a predicate the check no
longer runs. It reads: "docs/reviews/ is partitioned by docs/README.md's
campaign table: every file in exactly one campaign, and the count line equal
to the tree". Since `f4016712` ("docs: store review campaigns as one file
each, derive every figure [syzygy-gkvu]"), campaigns live one file each under
`docs/review-campaigns/` (119 files, 118 campaign fragments plus the index).
`docs/README.md` stores no table and no count line; it routes to that
directory, and the table is printed on demand by `--table`. `--check`
(`scripts/check_docs_review_campaign_partition.py` `main`, `check_campaigns`,
`assert_head_bound_inputs`) checks that the HEAD-bound inputs are clean, that
the fragments parse, that each tracked file under `docs/reviews/` matches
exactly one fragment and no fragment is empty, that `git ls-files` and
`git ls-tree` give equal sets, that each fragment's verdict citation resolves
to a verdict line, and that `docs/README.md` routes to
`review-campaigns/`. It compares no count. A reader of the hosted step list,
which the workflow header calls "the hosted denominator", is told the CI
checks a count line that does not exist. The battery comment the PR adds to
`PROJECT-STATUS.md` has the same smaller error ("in exactly one
docs/README.md campaign"); the campaigns are `docs/review-campaigns/`
fragments. Repair: describe the fragment partition, and name
`docs/review-campaigns/` in both comments.

F2 (EXCEPTION; follow-up in the script). Nearly all of the step's cost is
work `--check` throws away. Measured at this head on this host: the pass path
took 3:05.08 wall (152.13 s user). The same `main()` with `report`'s
`add_date_for_path` default stubbed to a constant took 0.265 s wall and
printed the same `partition PASS: denominator=696; assigned=696; raw=662;
other=34; unmatched=0; overlaps=0; campaigns=118`. The cost is `add_date`,
which runs one `git log --follow --diff-filter=A` per tracked file (696)
to fill the "recorded" column, and `--check` prints and compares no date. The
failing paths are already fast: both mutants below exited 1 in under 0.2 s,
because `partition()` raises before any date is derived. So the cheaper
placement is in the script, not the workflow: have `--check` skip date
derivation (or derive dates only for `--table`/`--json`/default output). That
takes the roughly 3 minutes off a `checks` job of about 29 minutes, on every
`pull_request`, `push` and `merge_group` run. A separate parallel job is
compatible with CG-26 (probe P1 below), but it pays a second full-history
checkout and runner start-up to hide a cost that need not be paid at all.
This is not a defect of the PR, which adds the check correctly. It is the
reason not to accept 170 to 185 s as the price of the check.

F3 (EXCEPTION). The partition helper's own fixtures are not hosted.
`python3 scripts/check_docs_review_campaign_partition.py --selftest` passes
at this head (`selftest PASS: 25 fixtures`) and runs in well under a second,
but it is in neither the published battery nor the hosted step list. The
workflow block directly after the new step opens "The checkers' own fixtures.
A hosted run that exercises the checks but never the checks' checks reports a
denominator it does not have." The PR adds the check without its check. To
take it, add the `--selftest` line and step in the same commit and move the
count word to one hundred and fifteen (CG-26 is still one triple).

## Notes (no change required here)

N1. The merge-queue race is gone, and the queue will not fail repeatedly on
raw batches. The race was the pre-`f4016712` design, in which every raw PR
rewrote one count sentence; AGENTS.md at this head already says so ("Stored
derived counts race between sessions; that is why none is stored.", line
659). That sentence no longer exists, and `--check`
derives every figure from HEAD, so nothing can go stale in a rebase-merge.
Under `merge_group` the step checks the combined tree, and it can fail only on
a real defect of that tree:
- a raw added by one PR that matches no fragment;
- a fragment added by one PR whose pattern also matches a raw another PR's
  fragment claims (overlap only on combination);
- a fragment whose verdict citation or members arrive in a PR not in the
  batch (empty campaign, missing citation target).
A batch of raw PRs that each pass alone, and each match exactly one existing
fragment, passes combined. Running in `merge_group` therefore makes a
combination defect fail loudly before it reaches `main`, which is the
intent. The serialization cost moved elsewhere: review-raw PRs that append to
the same fragment line, as this review's own brief directs for
`greenfield-parity-implementation.md` line 14, conflict textually pairwise.
That conflict appears at rebase or merge time, before the queue, not as a
red check.

N2. Editing `PROJECT-STATUS.md` neither makes the unperformed
`polaris-edit-repair-deletion-scenario` package stale nor retires a
confirmation that is still live; both happened long before this PR.
- Row 14 of `POLARIS-EDIT-REPAIR-DELETION-SCENARIO-MANIFEST.txt` is
  `PATCHED`. It hashes current `PROJECT-STATUS.md` bytes with
  `proposed/PROJECT-STATUS.md.patch` applied, so any edit to the page moves
  it. On origin/main `2b8d01ac`, before this PR, the package builder's
  `--check` already fails: `git apply --check failed for
  PROJECT-STATUS.md.patch: error: patch failed: PROJECT-STATUS.md:31`. That
  hunk is nowhere near the lines this PR touches (467 to 486). The builder's
  `--check` is in neither the battery nor any workflow, so the staleness has
  been silent.
- `PROJECT-STATUS.md` has 92 commits since 2026-09-23, the date of the
  package's last change (`fe717550`). The package's confirmation raw,
  `R-POLARIS-EDIT-REPAIR-DELETION-SCENARIO-DELTA-CONFIRMATION-RAW.md`, is
  headed "PR #98 at 8a221b4". Under rule 10 it confirms history only.
- check_governance registers this act (CG-7d/7e) by the manifest *file*
  (`POLARIS_EDIT_REPAIR_SUBJECT`), which this PR does not touch. Its CG-7 rows
  are OK at this head.
- The PR body's claim was swept at this head over all 8,585 tracked files:
  neither the old `PROJECT-STATUS.md` digest (`0e72b10c…`, origin/main) nor
  the new one (`dfbb3891…`, `f59a2f16`) has any citer, by 16-hex prefix.
  The claim holds.
The package must be regenerated (`--write` after re-basing its patch) before
any act is offered. That is the package owner's work (`syzygy-9fjp`), not
this PR's, and this reviewer did not regenerate it. Worth a follow-up: host or
batter the builder's `--check`, or record that unperformed candidates are
allowed to rot until offered.

N3. Step placement and failure. `run:` executes under `bash -e`, and the
command is a single process. `main()` returns 0 only on success, and
`PartitionError` or `CalledProcessError` exit 1, so a failure fails the job.
The step runs after `check_quotations --selftest` and before the fixtures
block; no earlier step writes under `docs/reviews/`, `docs/review-campaigns/`,
`docs/README.md` or the helper. The HEAD-drift guard uses
`git diff HEAD --`, which ignores untracked output such as `__pycache__`. The
`checks` job's `fetch-depth: 0` covers `add_date`'s `git log --follow`; a
shallow checkout would fail closed with "no add date".

## Commands run (this host, at `f59a2f16` unless stated; TMPDIR=/tmp/r705)

- `python3 scripts/check_governance.py`: exit 0, `32 OK, 21 WARN, 0 FAIL
  (53 checks)`; `OK    CG-26 ... 114 checks examined, 0 findings — 114
  published, 114 hosted, 114 shared`.
- `python3 scripts/check_governance.py --selftest`: exit 0, `433 fixtures,
  0 failing`.
- `python3 scripts/check_docs_review_campaign_partition.py --check`: exit 0,
  `second-method PASS: git ls-files=696; git ls-tree=696; exact path sets
  equal`, then the `partition PASS` line quoted under F2; 3:05.08 wall.
- `python3 scripts/check_docs_review_campaign_partition.py --selftest`:
  exit 0, `selftest PASS: 25 fixtures`.
- `python3 scripts/build_polaris_edit_repair_deletion_scenario.py --check`
  at `f59a2f16` and at origin/main `2b8d01ac`: both fail with the same
  `PROJECT-STATUS.md:31` patch-apply error (N2).

## Rule-6 mutants (the reviewer's own; scratch detached worktree, never pushed)

The partition mutants were each committed on an empty marker commit over
`f59a2f16`, whose tree is identical to `f59a2f16`, and reset afterwards. The
CG-26 mutants are working-tree edits at `f59a2f16`, restored with
`git checkout`.

- M1, unmatched raw. Commit `docs/reviews/QQ-REVIEWER-MUTANT-UNMATCHED-RAW.md`
  (content `Verdict: CONFIRM`). `--check` exit 1: `ERROR: review campaign
  partition failed` / `unmatched:
  docs/reviews/QQ-REVIEWER-MUTANT-UNMATCHED-RAW.md`. Killed.
- M2, overlap. Copy `docs/review-campaigns/greenfield-parity-implementation.md`
  to `zz-overlap-mutant.md` with first line `# Overlap mutant` and commit.
  `--check` exit 1: `overlap: docs/reviews/R-GP-IMPL-UTF8-CANONICAL-1-RAW.md:
  greenfield-parity-implementation, zz-overlap-mutant` (and one line per
  shared member). Killed.
- M3, neutered hosted step. Append ` || true` to the new `run:` line.
  check_governance exit 1: `FAIL  CG-26 ... 115 checks examined, 2 findings —
  114 published, 114 hosted, 113 shared`; "published but not hosted —
  `python3 scripts/check_docs_review_campaign_partition.py --check`" and
  "hosted but not published — `... --check || true`". Killed: a step that
  cannot fail is caught by CG-26.
- P1, probe rather than mutant: move the step into a new parallel job
  `partition` (checkout `fetch-depth: 0`, setup-python 3.11). PyYAML parses
  it as jobs `['checks', 'partition']`. check_governance exit 0, CG-26 OK
  114/114/114. CG-26 reads every `run:` line whatever its job, so the
  parallel placement F2 weighs is lawful.

The author's four mutants in the PR body (drop the step, keep the old count
word, drop the battery line, commit an unmatched raw) were not re-run; M1 and
M3 cover the same predicates with different inputs.
