# R-GP-IMPL-PARTITION-CHECK-CI-2 — review of PR #705 (syzygy-5pem), round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: be4566e3eafe19403f7edcec439aab7e40007b95
Subject: PR #705 (round 2)

Reviewer: fresh-context PR reviewer, review bead `syzygy-trbo`, round-2
confirmation of the round-1 raw `R-GP-IMPL-PARTITION-CHECK-CI-RAW.md`
(`REVISE` over `f59a2f16`, findings F1-F3). Subject bead `syzygy-5pem`.

Diff under review: `be4566e3` against merge base `1d093a2f` (origin/main at
review time). Two commits: `a88c8568` (the round-1 triple, rebased: one
workflow step, one battery line, count word 113 -> 114) and `be4566e3` (the
repair: both comments rewritten, `--check` skips add dates, a `--selftest`
step and battery line, count word 114 -> 115). Three files:
`.github/workflows/governance-docs.yml`, `PROJECT-STATUS.md`,
`scripts/check_docs_review_campaign_partition.py`. All runs below were in a
scratch clone at `be4566e3` on this host; "old" is the script at `1d093a2f`,
"new" the script at `be4566e3`, both run against the same committed tree.

## Verdict basis

F1, F2 and F3 are closed. `--check` output is byte-identical between the old
and the new script on the clean head and on five committed mutants of my own,
the one date-using mode I ran is byte-identical too, and CG-26 is OK at
115/115/115. The verdict carries two exceptions: the PR body still describes
round 1, and no fixture pins the date skip, so inverting it survives the
selftest.

## Round-1 findings

F1 (closed). The workflow comment now reads "docs/reviews/ is partitioned by
the fragments under docs/review-campaigns/: every file in exactly one
campaign ... --check reads the HEAD-bound tree and its fragments; it prints no
dates." It no longer mentions a count line. The battery comment reads "every
docs/reviews/ file in exactly one docs/review-campaigns/ fragment". Both match
what `main`, `check_campaigns` and `assert_head_bound_inputs` do.

F2 (closed). `main` now passes `date_for_path = (lambda _path:
CHECK_ONLY_DATE) if args.check else add_date` to `report`. Under `--check`
nothing reads `recorded`: the PASS line prints only `total`, `assigned`,
`raw`, `other` and the campaign count, and `--json`, `--table` and the plain
output sit in `elif` arms that `--check` never reaches. Measured (exit, wall):

| Tree at commit | new | old | stdout+stderr |
|---|---|---|---|
| clean `be4566e3` | 0, 0.24 s | 0, 188.85 s | identical |
| unmatched raw `docs/reviews/ZZ-R2-NO-CAMPAIGN-RAW.md` | 1, 0.18 s | 1, 0.18 s | identical |
| overlap: new fragment `zz-overlap.md` claiming `R-GP-IMPL-PWB-ONE-BLOB-READER-1-RAW\.md` | 1, 0.18 s | 1, 0.18 s | identical |
| empty campaign: new fragment `zz-empty.md`, pattern `ZZ-NOTHING-RAW\.md` | 1, 0.19 s | 1, 219.16 s | identical |
| bad verdict citation: `R-GP-IMPL-PWB-ONE-BLOB-READER-1-RAW.md:2` -> `:9999` in `greenfield-parity-implementation.md` | 1, 0.30 s | 1, 211.57 s | identical |
| `docs/README.md`: `review-campaigns/` -> `review-kampaigns/` | 1, 0.29 s | 1, 239.40 s | identical |

Each mutant was committed in its own worktree, because `--check` refuses
uncommitted inputs. Clean PASS line, both scripts: `partition PASS:
denominator=705; assigned=705; raw=671; other=34; unmatched=0; overlaps=0;
campaigns=118`. The failure messages were, in order: `unmatched:
docs/reviews/ZZ-R2-NO-CAMPAIGN-RAW.md`; `overlap:
docs/reviews/R-GP-IMPL-PWB-ONE-BLOB-READER-1-RAW.md:
greenfield-parity-implementation, zz-overlap`; `empty campaign: zz-empty`;
`verdict citation line out of range: Greenfield-parity implementation:
R-GP-IMPL-PWB-ONE-BLOB-READER-1-RAW.md:9999`; `docs/README.md does not route
to docs/review-campaigns/`. The empty-campaign, citation and README mutants
were slow under the old script because `report` derived dates for earlier
campaigns before it raised, or before `check_campaigns` ran. My first overlap
attempt named a raw absent from this head and failed as an empty campaign
instead. I discarded it and re-ran the mutant against a raw that exists.

Modes that use dates are unchanged. The non-`--check` arm passes `add_date`,
which is `report`'s own default, so the code path is the same. `--json`, run
with both scripts on the clean head: exit 0 for both, byte-identical output,
118 `recorded` values, none of them `unused under --check`. I did not run
`--table`, the plain output or `--second-method` with the old script. Both
output modes render from the same `data` dict as `--json` [Inferred].

F3 (closed). `check_docs_review_campaign_partition --selftest` is a hosted
step directly after the `--check` step, and a battery line directly after the
`--check` line. `--selftest`: `selftest PASS: 25 fixtures`. The count
sentence reads "The one hundred and fifteen checks above are the same one
hundred and fifteen the hosted workflow runs".

## Checks run at `be4566e3`

- `python3 scripts/check_governance.py`: exit 0, `32 OK, 21 WARN, 0 FAIL (53
  checks)`; `OK    CG-26  published battery and hosted battery are one list —
  115 checks examined, 0 findings — 115 published, 115 hosted, 115 shared`.
- `python3 scripts/check_governance.py --selftest`: `433 fixtures, 0 failing`.
- `python3 scripts/check_docs_review_campaign_partition.py --check`: PASS as
  above. `--selftest`: `selftest PASS: 25 fixtures`.

Rule-6 mutants of the triple, each applied alone to the working tree and
reverted (`check_governance.py` exit 1 for all four):

- A, drop the hosted `--selftest` step: `FAIL CG-26 ... 115 published, 114
  hosted, 114 shared`, "published but not hosted —
  `python3 scripts/check_docs_review_campaign_partition.py --selftest`".
- B, count word back to "one hundred and fourteen" (both occurrences): `FAIL
  CG-26 ... 115 published, 115 hosted, 115 shared`, "the parity sentence
  claims 114 published checks; the block holds 115".
- C, drop the battery `--selftest` line: `FAIL CG-26 ... 114 published, 115
  hosted, 114 shared`, "hosted but not published".
- D, hosted step `--check` -> `--table`: `FAIL CG-26 ... 116 checks examined
  ... 115 published, 115 hosted, 114 shared`, "published but not hosted —
  `python3 scripts/check_docs_review_campaign_partition.py --check`".

## Exceptions

E1. The PR body still describes round 1. It says the count goes "one hundred
and thirteen -> one hundred and fourteen", that CG-26 is "114 published / 114
hosted / 114 shared", that `--check` takes "about 170 s wall", and that the
triple lands "in one commit". The head has two commits. Each carries its own
coupled triple, and together they reach 115. The body does not mention the
`--selftest` step or the date skip, and it gives no `old`/`new` fragment for
the rule-6 mutants it lists. Repair: rewrite the body for the head being
merged.

E2. No fixture pins the date skip. Mutant: `if args.check else add_date` ->
`if not args.check else add_date` in `main`. `--selftest` still prints
`selftest PASS: 25 fixtures`, because no fixture runs `main`. Under that
mutant `--table` prints `unused under --check` in the Recorded column (first
data row: `| Arbitrary public-repository dossier spec | 3 | unused under
--check | ...`), and `--check` is back to roughly three minutes. A regression
of either kind would show only as a wrong table or a slow job. Follow-up, not
a blocker: add a selftest fixture that drives `main` (or a factored
`date_for_mode`). It should assert that `--check` never calls `add_date` and
that the date-using modes always do.

## Notes

N1. Under `--check` the script no longer derives add dates, so `add_date`'s
`no add date: <path>` refusal cannot fire there. Under `--check` that refusal
is unreachable [Inferred]. `assert_head_bound_inputs` refuses an index that
differs from HEAD, and `second_method` requires the `git ls-files` and
`git ls-tree HEAD` path sets to be equal, so every counted path is a blob at
HEAD. The workflow checks out with `fetch-depth: 0`, so some commit in
history adds each path. The refusal still guards the date-using modes,
whose code path is unchanged.

N2. AC 1 ("workflow step, battery line and count word added in one commit")
holds per triple. `a88c8568` adds the `--check` step, its battery line and
113 -> 114. `be4566e3` adds the `--selftest` step, its battery line and
114 -> 115, together with the comment and script repairs. Neither commit
leaves CG-26 split.
