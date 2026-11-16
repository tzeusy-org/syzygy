# Test clocks and byte pins: review dispositions, rounds 1 to 4

[Observed] This record gives the dispositions of the four CC-REV-1 review rounds of `syzygy-bpyt.4.5` (pull request
#532). The change is test-only. It replaces wall-clock bounds in three timed test files with CPU-time bounds, and
replaces incidental byte pins with structural checks. It also gives the daemon entry a load-hook row and a compiler-API
row, beside the base's own text pin, which round 3's stopping rule restored. The lane's evidence and its checker,
`tools/build_record.py`, are under `docs/evidence/syzygy-bpyt-4-5/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-TEST-CLOCKS-1-RAW.md` | `REVISE` | `447d9f08` | `r1-review.diff` sha256 `e2e69768a05e8461b8d52cde590308753c0a73e668677037ffc4a5ca32765fae` |
| 2 | `docs/reviews/R-GP-IMPL-TEST-CLOCKS-2-RAW.md` | `REVISE` | `9e00252a` | `r2-review.diff` sha256 `260e725a177bfa004e9a71a02c203eded404c23c42a3997ce98aed0d176a3ddf` |
| 3 | `docs/reviews/R-GP-IMPL-TEST-CLOCKS-3-RAW.md` | `REVISE` | `d0467aeb` | `r3-review.diff` sha256 `9d87ec600a772d78c947f995f39b2c023ab03a8c9a4f5b92e6b19bf8902e8e57` |
| 4 | `docs/reviews/R-GP-IMPL-TEST-CLOCKS-4-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `23af2d08` | `r4-review.diff` sha256 `92b1adb645ce21065e3bd8c0afecb5c1f5b447070d0ba94f3d0901b6119b0aed` |

Rounds 3 and 4 were narrow: each reviewed only the previous round's repair. Round 4's subject is
`git diff d0467aeb 23af2d08`. The whole PR from its merge base before landing, `git diff d38d7a3c 23af2d08`, is 43 files
and hashes to `6bfcc006faa92bd833fc45cc2ef62e2d3da4f70f460d41611d41a3706af19e7e`; round 4 re-derived both digests.

Round 4 cleared the bytes under the owner's notes-only stopping rule. Revise-severity findings open: 0.

## The stopping rules

The coordinator set each rule before its round.
- **Before round 3:** round 3 is narrow. If it again finds a daemon-path load that the new row passes, there is no round 4
  on the row: the base's old pin is restored beside the new rows.
- **Before round 4:** round 4 is the last. Notes only clears the bytes. A blocking defect in its four items would come
  with an exact fix that the coordinator applies and verifies, with no round 5.

Round 3 found such loads (Y1–Y5), so the old pin went back. Round 4 had notes only.

## Round 1: one blocking finding, seven notes

Round 2 gives a verdict on each repair (round 2 raw section 4).
- **F1** (the kept text row checked a window wider than the two branches, so three daemon-path loads the old pin caught
  passed every test). Not resolved in round 2: round 1's three survivors are killed, but the narrowed row still let six
  loads pass (round 2's F1). Superseded through rounds 2 and 3 by the restored pin.
- **N1** (`engines` admits Node versions on which the four CPU-bound sites throw): resolved. The helper falls back to
  `process.cpuUsage()`, and all four bounds keep 10× margins under the fallback.
- **N2** (two exact pins without a recorded disposition): resolved. Both carry their reasons, and the record lists both as
  kept.
- **N3** (the near-miss tag-names case has no mutant that reaches its bound): resolved by a comment. Round 3's F2 later
  made the record require that exactly that row is unreached.
- **N4** (the record's links to two inputs were weaker than rule 11 asks): resolved.
- **N5** (pre-existing daemon-path loads that neither the old pin nor the new rows catch) and **N6** (the text row fails
  a type-only import, pre-existing): carried to `syzygy-bpyt.43`, items 1 and 2.
- **N7** (full-suite runs at high load fail in untouched files, pre-existing): belongs to `syzygy-bpyt.4.40`.

## Round 2: three blocking findings, three notes

Round 3 gives a verdict on each repair (round 3 raw section 4).
- **F1** (the narrowed text row ended a branch at the first following `  }` line, so six loads passed): the six are
  killed by the compiler-API row, but five new loads of the same class (Y1–Y5) survive it. The stopping rule applied.
- **F2** (a legitimate else-if chain failed the row): resolved.
- **F3** (`build_record` trusted the producer's Node 22 margin flag): resolved for the margins. The unreached-row and
  geometric-mean gaps became round 3's F2 and F3.
- **N1** (probe fragments stale after #529, and the residual X2): resolved.
- **N2** (the helper's version wording): resolved.
- **N3** (timeouts under load in files this change does not reach): belongs to `syzygy-bpyt.4.40`, as round 1's N7 does.

## Round 3: three blocking findings, six notes

Round 4 gives a verdict on each repair (round 4 raw section 4). The coordinator's repair list followed the stopping rule.
- **F1** (Y1–Y5 pass every test): resolved. `d38d7a3c`'s pin, lines 212–227 of
  `packages/cap1-system/src/daemon-entry-unchanged.system.test.ts` there, is in the test byte for byte, exactly once,
  checked two ways. The only other change to the test is a five-line comment. Y1–Y5 are byte-equal to round 3's
  variants. Each fails the restored pin alone, with a real assertion, and passes the other 16 rows. `build_record`
  requires both. The cost the ruling accepted is stated: the pin again fails E-comment-in-branch, E-renamed-binding,
  E-branch-swap, L2 and L3, and the test comment lists those five as its known false refusals.
- **F2** (an unreached mutant row was dropped from the check): resolved on both CPU paths. The unreached set must equal
  exactly the near-miss tag-names row. The lane's B3 and six of the reviewer's mutants (M1–M4, M15 and M16) are killed at that check.
- **F3** (`geometricMeanNowMs` was copied): resolved. It is computed from the runs and compared with `proposedBoundMs`.
  The lane's B4 and four of the reviewer's mutants (M6–M9) are killed at that check.
- **N6** (the record cannot be rebuilt against current main without re-running its base side): resolved as ruled. The
  record's MAIN stays `d38d7a3c`, and its `mainMovedSince` names the paths main had changed when it was built.
- **N1–N5:** not repaired, as ruled. N1 to N4 are carried to `syzygy-bpyt.43`, items 3 to 6. N5 (one full-suite failure
  under load in an untouched file) belongs to `syzygy-bpyt.4.40`.

## Round 4: four notes

- **N1** (the comment's list of the pin's known false refusals leaves out round 3's G1 and G2, which fail the pin alone):
  carried to `syzygy-bpyt.43`, item 7. The five it names are right.
- **N2** (`build_record` does not pin each site's mutant-row population, so a deleted row builds green): carried to
  `syzygy-bpyt.43`, item 4, with round 3's N2.
- **N3** (`mainMovedSince` is stale against current main by one PR path): taken in this record, as the reviewer's second
  option allows, because any rebuild at landing would re-bind the record. The record's `mainMovedSince` was built against
  `d621bfa2` and names 4 paths. Since then, #537 (`syzygy-bpyt.4.31`) changed one more PR path,
  `apps/three-surface-poc/src/polaris-generation/self-corpus.test.ts` (commits `1785a905` and `0e513a9b`). Its hunk adds a
  trailing comment to a timeout at `:46`. The PR's hunk adds a comment at `:11-13`, and git merges the two with no
  conflict. So against main `81862261`, `mainMovedSince` would list five paths: the four PR paths `main.test.ts`,
  `self-corpus.test.ts`, `dossier-evaluation.test.ts` and `dossier-profile.test.ts`, and the bound input `shutdown.ts`
  (comments only). One of the 13 closure files also moved, `packages/support/src/index.ts`, which gained one export line
  (round 4 raw section 3.5). #541 and #543 touch none of the 43 PR paths, the four bound inputs or the 13 closure files.
- **N4** (the compiler-API row's comment still calls itself "The kept part of the old text pin"): carried to
  `syzygy-bpyt.43`, item 8. Editing the test at landing would change bytes the record's daemon-entry runs bind.

## Class and the GP-Q0 ruling

Every round found that nothing a gate accepts or refuses changes under GP-Q0 (round 4 raw section 2). The PR's 43 paths
are 10 test files and 33 evidence files. The record's `productFilesChanged` is empty, and no path is under `.syzygy/` or
`openspec/`. All 17 daemon-entry rows pass, including the entry's usage-byte, refusal-message and exit-code rows. No
rendered byte, wire format, refusal string, exit code or digest-bound artifact changes.

## The landing

The landing commit merges main `81862261` (#541 and #543) into the round-4 head. Its tree equals git's own merge of
`23af2d08` and `81862261`, which round 4 also built (`f0f0feaa`). Against main it differs in exactly the 43 PR paths,
and every PR path is byte-equal to `23af2d08` except the four that main also changed, which git auto-merged.

Round 4's section 7 lists the landing re-checks. The coordinator re-listed main's changes (above), did not edit the
daemon-entry test, and ran `npm ci`, the build, the PR's nine root-config test files and the system suite on the merged
tree. Their result lines are in the landing note on the pull request. Hosted `checks` and `node` at the landing head are
the full suite of record.

## Retained review evidence

The four reviewers' tools and results are kept under `docs/evidence/test-clocks-review-2026-10-27/`, 199 files. Each
raw's cleanup section lists its kept files with their sha256. At landing, a script checked each list against the
reviewer's directory, and every listed file matched its sha256:
- `r1/`: 41 of round 1's 44 listed files. Not retained: the governance, quotations and typecheck logs. Two files in the
  directory that round 1's list does not name, a PR-body snapshot and a copy of the lane's daemon-entry probe, are not retained
  either.
- `r2/`: 61 of round 2's 70. Not retained: the governance, quotations and typecheck logs, five `npm ci` logs and
  a PR-body snapshot.
- `r3/`: 60 of round 3's 67. Not retained: the governance, quotations and typecheck logs, three `npm ci` logs and
  a PR-body snapshot.
- `r4/`: 37 of round 4's 37.

Each raw quotes the result lines of the logs it drops. A governance log quotes the retired phrases it reports, so a
tracked copy would fail CG-2a. A PR-body snapshot is the pull request's own history.

This is an implementation record and binds nothing.
