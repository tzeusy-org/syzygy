# Generation-mutation plan test, follow-ups: review dispositions, round 1

[Observed] This record gives the dispositions of the CC-REV-1 review of
`syzygy-bpyt.47` (pull request #550). The change takes the test-byte notes N1,
N2, N3, N5 and N4 item 5 of PR #546's round-1 review
(`docs/reviews/R-GP-IMPL-GEN-PLAN-TEST-1-RAW.md`; dispositions
`docs/evidence/gen-plan-test-round-1-dispositions-2026-10-28.md`). It changes
one test, `apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts`,
and one comment inside an interface in the plan module `generation-mutation.ts`.
The plan's mutations, the runner (`generation-mutation-run-main.ts`), the
scheduled gate's workflow and every guarded source are unchanged. The lane's
evidence is `docs/evidence/syzygy-bpyt-47/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GEN-PLAN-TEST-2-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `5cf4223a` | `r1-review.diff` sha256 `0c8b28b2fba6d838d0b11a6a38ae7a84f8602ec6e94cd7c5566590d0af796545` |

The subject equals `git diff 95c87a52 5cf4223a`: 4 files. Without
`docs/evidence/` it hashes to
`dee2b816db6133b14850806c01788a5122d4042f8cc28e101c21b2769661f0e2`. The
reviewer re-derived both digests and the PR body's
(`59b2f6a8d35fdc1872d7cb3a97b495f4f87e2b8f3fb4314f726b0cf7b64801ac`).

Round 1 had notes only, so it cleared the bytes it reviewed under the
owner's notes-only stopping rule. Revise-severity findings open: 0.

## What the reviewer verified

All [Observed] in the raw:
- **Scope.** The plan module's emitted JavaScript (under three option sets)
  and its declaration text are byte-equal at base and head, and the runner
  and the gate workflow are byte-equal. So the scheduled gate's decision does
  not move for any plan.
- **Rule 6.** The lane's `test_mutants.py` re-ran 47 of 47 as expected (39
  killed, 8 survived as expected), with 0 rows differing from the record and
  no kill by timeout. The reviewer's own 14 mutants ran as predicted.
- **Checks:** hosted `checks` and `node` pass at `5cf4223a`; hosted node at the
  reviewer's local merge passed 5,518 with 5 skipped.

## Class and the GP-Q0 ruling

The reviewer ruled CC-REV-1 class none. No product output changes; what
changes is what node-ci's `npm test` step refuses. As for PR #546, the
coordinator posted a notice on `syzygy-bpyt.10` at landing that names those
refusals, with the reviewer's corrected list (N4 item 3).

## The notes

- **N1** (a duplicated empty id passes the joined-string duplicate check),
  **N2** (the exactly-one must-fail count reads `it` titles, while the runner
  matches describe-qualified full names) and **N3** (the runner's
  `TEST_FILES` is checked at its declaration, not at its use in the vitest
  argv): test bytes, carried to `syzygy-bpyt.62` with the reviewer's code.
- **N4** (informational): two PR-body sentences are imprecise but not false,
  and are corrected here. "No product byte changes" means no emitted or
  rendered byte of any product module changes; the plan's source changes by
  one comment. "The probe's reader keeps the last `TEST_FILES` it visits"
  means the last one with an array-literal initializer; the deviation's
  conclusion is unaffected. Item 3 corrects the notice list: the path check
  refuses every suffix other than `.ts`, not only `.tsx`.
- **N5** (informational): the reviewer's local full suite at load about 50
  failed 8 files the change does not touch, all by timeout; every one passed
  alone. The full-suite evidence of record is hosted `node`, and the lane's
  run in a scratch clone (251 files passed and 3 skipped; 5,518 tests passed
  and 5 skipped).

## The landing

The landing commit merges main `a1b9bde2` (PRs #551 and #545) into the
reviewed head `5cf4223a`. Main changed none of the 4 PR paths since the
merge base `95c87a52`, so against main the landing commit differs in exactly
those 4 paths, each byte-equal to `5cf4223a`, plus the raw, this record, the
retained evidence and the README campaign row. The canonical battery ran in a
clean clone at `5cf4223a`:
`commands=114 nonzero=0` (lane B's run, `lead/battery-laneb-b47`). The
battery at the landing commit and hosted `checks` and `node` there are in the
landing note on the pull request. The PR body is unchanged since the review
(`59b2f6a8d35fdc1872d7cb3a97b495f4f87e2b8f3fb4314f726b0cf7b64801ac`).

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/gen-plan-test-review-2026-10-28/r2/`, 21 files, beside round 1's
`r1/`. The raw's cleanup section lists 21 kept files with their sha256. At
landing, a script checked all 21 against the reviewer's directory: 21
matched, 0 failed, and no file was unlisted. Per the brief, no governance,
quotation, typecheck or `npm ci` log and no copy of the PR body was kept.

This is an implementation record and binds nothing.
