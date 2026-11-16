# Support-leaf guards: review dispositions, rounds 1 to 3

[Observed] This record gives the dispositions of the CC-REV-1 review of
`syzygy-bpyt.6.14` (pull request #545). The change takes notes N9 and N10 of
PR #530's round-2 review (`docs/reviews/R-GP-IMPL-SUPPORT-LEAF-2-RAW.md`). It
is test-only: an identifier allowlist for the `@syzygy/support` purity test,
a shared specifier reader in `packages/support/src/purity.testkit.ts`, the
owner-act drafter's purity test moved onto that reader, and a derived,
guarded alias map for the S10 no-egress bundle in
`packages/polaris-dossier/src/no-egress.test.ts`. No product module, gate
or manifest changes. The lane's evidence is
`docs/evidence/syzygy-bpyt-6-14/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-GUARDS-1-RAW.md` | `REVISE` | `5995aa3c` | `r1-review.diff` sha256 `c1011bc5b078a5979571b4da361037616c10740a586708413d13c23fae2582ec` |
| 2 | `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-GUARDS-2-RAW.md` | `REVISE` | `ecea355b` | `r2-review.diff` sha256 `00a785f11fddd491890552cb6a22146999eac3215b8635fe1110f0288580f29d` |
| 3 | `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-GUARDS-3-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `12d70cf0` | `r3-review.diff` sha256 `0650f7548a0bfbe68125ff6f5efc2d6e9ae571f07aef151c6570554ab52efd8a` |

Round 3 was the last round under the stopping rule the coordinator set on
round 1: a blocking finding after it would have gone to the owner. It had
notes only, so it cleared the bytes it reviewed under the owner's notes-only
stopping rule. Revise-severity findings open: 0.

## Class and the GP-Q0 ruling

Round 1 confirmed CC-REV-1 class 4 (the S10 proof verifies an egress path)
and added class 3 (the purity guard keeps `sha256`, `deepFreeze` and
`decodeUtf8` deterministic); not class 1. Rounds 2 and 3 found that the
repairs change neither class. Class 4 draws GP-Q0's three extra checks: the
S10 bundle differential (five builds, byte-identical), a rule-6 mutant per
predicate (`docs/evidence/syzygy-bpyt-6-14/tools/mutants.py`, 52 of 52 as
expected at the round-2 repair head in both dist states), and an owner notice.
No product byte changes: round 3 compared 1,028 of 1,028 non-test dist files
and found them identical. The guards refuse more forms than before in their
own tests and refuse nothing in today's sources. The coordinator posted the
owner notice on `syzygy-bpyt.10` at landing, as for a test guard that
refuses more.

## Round 1 (REVISE over `5995aa3c`)

Ruling recorded on `syzygy-bpyt.42`. Taken as repairs, from the reviewer's
fix texts: F1 (`export * from 'node:crypto'` passed every guard), F2 (a
false PR-body sentence about `TextDecoder`), N1, N2, N3, N4 and N5, with a
rule-6 row for Y7 and residual lines for Y3, Y5b and Y5c. No action on N6
and N7 (information). Round 2 found F1, F2, N2, N3, N4 and N5 met and N1
partly met, which became round 2's F2.

## Round 2 (REVISE over `ecea355b`)

Ruling recorded on `syzygy-bpyt.42`. Taken: F1 (PR-body residual text,
including the spaced literal `node:crypto` import that exports the whole
module past every row), F2 (two lines of `support-purity.test.ts`, lines 60
and 64, replaced with the reviewer's fix files byte for byte, plus rule-6
rows W5, W6 and W7), N1 (a residual line), N3 as a disclosed residual, and
N5 (the battery line). Not taken here: N2 (reader rows and
`propertyWritesOf`), N3's fix and N4 (an AST import-call row); all three are
carried to `syzygy-bpyt.46` with the reviewer's verified tools. N6: no action.
Round 3 found every taken item met: lines 60 and 64 are the fix texts byte for
byte and no other line changed, and W5, W6 and W7 each fail the N1 row alone
in both dist states.

## Round 3 (CONFIRM WITH EXCEPTIONS over `12d70cf0`)

- **N1** (the body's "Alone at the code head" load1 range rests on no
  committed record): repaired in the PR body at landing. The range is
  dropped; the counts on that line stand.
- **N2** (W5, W6 and W7's fragments are checked against no committed
  record): discharged by retention. The round-2 reviewer's
  `tools/r2_mutants.py`, which the lane's `mutants.py` names by sha256
  `3b954d84e97771016b6dcccf2d3e826a9225e46d02330d9c94b23831fb0a5a4f`, is now
  tracked at
  `docs/evidence/support-leaf-guards-review-2026-10-28/r2/tools/r2_mutants.py`
  and hashes to that digest. Round 3 found the edits equal by AST compare. A
  committed fragments record, as round 1's has, can follow under
  `syzygy-bpyt.46`.
- **Information** (the battery line names an untracked tool): the PR body's
  battery lines now name the `PROJECT-STATUS.md` block they run.

## The landing

The landing branch merges main `95c87a52` (PRs #546 and #547) into the
reviewed head `12d70cf0`, and then main `b0d7753f` (PR #551). Main changed
none of the 30 PR paths since the merge base `f7ea8584`, so against main the landing commit differs in exactly
those 30 paths, each byte-equal to `12d70cf0`, plus the three raws, this
record, the retained evidence and the README campaign row. The canonical
battery ran in a clean clone at `12d70cf0`:
`commit=12d70cf09cbb5cf0368f747d9f4245c57d7c6bed commands=114 nonzero=0`.
The battery at the landing commit and hosted `checks` and `node` there are
in the landing note on the pull request.

The PR body changed after round 3, in prose only. The body round 3 read
hashes to
`06fcc977e6891d85f5887c161e6ff93fcbb68f0b0abaeed76d9d844d70f93e31`. The
coordinator then dropped the load1 range (N1), named the battery block, and
added the `12d70cf0` battery line; the file it applied hashes to
`4196c89a6af1288fc6947c19d6ffc323c587a1d9731038fb8a67f1b0183decc6`.

## Retained review evidence

The reviewers' tools and results are kept under
`docs/evidence/support-leaf-guards-review-2026-10-28/`, in `r1/` (59 files),
`r2/` (47) and `r3/` (32). Each raw's cleanup section lists its kept files
with their sha256. At landing, a script checked every row against the
retained copy: 59, 47 and 32 matched, 0 failed, and no retained file was
unlisted. Two Python bytecode caches the reviewers' runs left beside their
tools, listed by neither raw, were not retained. Per the briefs, no
governance, quotation, typecheck or `npm ci` log and no copy of the PR body
was kept; each raw quotes their result lines.

This is an implementation record and binds nothing.
