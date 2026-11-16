# Generation-mutation plan test: review dispositions, round 1

[Observed] This record gives the dispositions of the CC-REV-1 review of
`syzygy-vsqr` (pull request #546). The change takes four notes of PR #543's
round-1 review (`docs/reviews/R-GP-IMPL-GEN-MUTATION-PLAN-1-RAW.md`): N2, N3,
N4 and N8, which are the bead's items 1 to 4. It changes one test,
`apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts`,
and one comment in the plan module `generation-mutation.ts`. The plan's
mutations, the runner, the scheduled gate's workflow and every guarded
source are unchanged. The lane's evidence is `docs/evidence/syzygy-vsqr/`.
Items 5 and 6 (#543's N6 and N7) stay open on the bead, because they change what the
runner or the mutation gate does, and `syzygy-bpyt.4.6` is under an authority
hold.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GEN-PLAN-TEST-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `02eb444f` | `r1-review.diff` sha256 `fcb2d8331a00639815896ba70357cf448ca3ccef4f6e5e88b9ad4e2d8ce63aee` |

The subject equals `git diff 81862261 02eb444f`: 4 files, +860/−16. Its
`apps/` part hashes to
`3c6f435fdffc8b57913ea0a26dea885319be5415f5a155f0fa73f3efd2d69a55`. The
reviewer re-derived both digests (raw section 1).

Round 1 had notes only, so it cleared the bytes it reviewed under the
owner's notes-only stopping rule. Revise-severity findings open: 0.

## What the reviewer verified

All of the following are [Observed] in the raw, sections 3 and 6:
- **Scope.** The runner, the gate workflow and every file under
  `packages/polaris-generation-core/src/` are byte-equal at base and head. The
  plan module's emit with comments removed is byte-equal, so only its comment
  changed.
- **N2.** Each mutation is now its own row, keyed by id. Two and then three
  drifts planted together are each reported by id in one run (the lane's V1,
  the reviewer's Q20).
- **N3.** The PR #543 reviewer's four survivors R1, R2, R4 and R5 are killed,
  their edits loaded byte for byte from that reviewer's tool, each by a
  message that names the mutation. The title reader sees 66 of the 66 test
  titles in the runner's four test files. No check throws at describe time,
  and a missing TypeScript fails the file loudly.
- **N4 and N8.** The plan comment is true. The test header's dated window is
  true for scheduled runs: all 24 scheduled runs from 2026-10-04 to
  2026-10-27 failed. One dispatched run in that window passed, so "every run"
  should say "every scheduled run" (N4 item 5).
- **Rule 6.** The lane's `test_mutants.py`, re-run at `02eb444f`: 19 of 19 as
  expected, matching its record. The test bytes are equal at `b5307ee1`, the
  commit the record ran at, and at `02eb444f`. The reviewer's own 24 mutants
  give 11 killed and 13 survived, every one as predicted before the run.
- **Checks:** full vitest 5,518 passed and 5 skipped of 5,523, 0 failed;
  typecheck exit 0; governance 32 OK, 21 WARN, 0 FAIL; quotations exit 0;
  hosted `checks` and `node` pass; the plan test passes 13 of 13 on a merge
  with main.

## Class and the GP-Q0 ruling

The reviewer ruled CC-REV-1 class none (raw section 2). No product source
changes, and the scheduled gate's pass/fail rule is unchanged
(`generation-mutation-run-main.ts:187`, byte-equal at base and head). What
changes is what node-ci's `npm test` step refuses: more plan shapes, and a
rename of any of the 13 must-fail titles in the four
`polaris-generation-core` test files (N8). The coordinator posted a notice on
`syzygy-bpyt.10` at landing that names those refusals, as N8 asks.

## The notes

The ids in this section are this round's, not #543's.

- **N1** (the must-fail check and the runner match names differently in four
  constructed shapes), **N2** (the path check is textual), **N3** (the
  runner's `TEST_FILES` check is a substring test), **N5** (the length and
  distinct-id failures name no mutation) and **N4** item 5 (the test header's
  "every run" should say "every scheduled run") are test bytes. They are
  carried to `syzygy-bpyt.47`, with the reviewer's probed fixes and mutants,
  which are retained with this record.
- **N4** items 1 to 4 (four PR-body sentences claimed more than their check
  does), **N6** (the test delta convention) and **N7** (the battery line was
  unresolved): repaired in the PR body before landing. Lane B replaced
  the battery line with its result (N7), and the coordinator applied the
  reviewer's wording for N4 and N6 (see the landing).
- **N8:** done in the notice.

## The landing

The landing commit merges main `b10e4da9` (#532) into the reviewed head
`02eb444f`. Main changed none of the 4 PR paths since `81862261`, so against
main the landing commit differs in exactly those 4 paths, each byte-equal to
`02eb444f`, plus the raw, this record and the retained evidence. The
canonical battery ran in a clean clone at `02eb444f`:
`commit=02eb444f22a673748567620c5f0d45877a27f2ff commands=114 nonzero=0`.
The battery at the landing commit and hosted `checks` and `node` there are
in the landing note on the pull request.

The PR body changed twice after the review, in prose only. The body the
reviewer read hashes to
`52df557aa888582487942f6a0e2427ff719ae7b20095b5c44dd2e96de8619792`. Lane B
then replaced its battery line with that result (N7), giving
`3892feca2f02cacb16b0edc92ca96ee9242ce8e3d2f061ee69e168d45b4daaab`. The
coordinator then applied the reviewer's wording for N4 items 1 to 4 and N6;
the file it applied hashes to
`0a6bbb9267f137be4bc5ad59588a2a9103c5767a963043dae95d4ba620df4d41`.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/gen-plan-test-review-2026-10-28/r1/`, 32 files. The
raw's cleanup section lists 37 kept files with their sha256. At landing, a
script checked all 37 against the reviewer's directory: 37 matched, 0
failed, and no file was unlisted.

Not retained, though the raw quotes each one's result line:
- `check-governance.txt` and `check-quotations.txt`: a governance log quotes
  the retired phrases it reports, so a tracked copy would fail CG-2a;
- `typecheck.log` and `npm-ci.log`;
- `pr-body-at-review.md`: the PR body before the coordinator's edit, which is
  the pull request's own history.

This is an implementation record and binds nothing.
