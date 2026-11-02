# The observed-only leaf check off the TMPDIR path: review dispositions, round 1

[Observed] This record gives the dispositions of the one CC-REV-1 review
round of `syzygy-bpyt.4.26`, pull request #559. The change fixes a false
failure in `packages/polaris-dossier/src/review.test.ts`: its observed-only
row asserted that no string leaf of the reviewer's verdict appears in an
Observed holder's JSON, and the block id `p1` matched a TMPDIR such as
`/tmp/r524-p1` inside the run path the holder carries. The row now replaces
the run path in each holder's string values before the leaf check, and a new
row runs the check under a TMPDIR containing `p1`.

The lane's evidence is `docs/evidence/syzygy-bpyt-4-26/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-OBSERVED-LEAVES-1-RAW.md` | `REVISE` | `6d95c626` | `r1-review.diff` sha256 `54240cc14c44be103ac719a6d0cc60820f4e67bb5ab72a1bdedd53044cddf666` | `f33de1ca892ea55230fa960a8b0da8fe631bba3485ecc031b8ac662a323cad72` |

## How the review loop closed

[Observed] Round 1 found the test code sound:
- the whole suite at `6d95c626` with every dist absent passing (256 files,
  5,811 passed, 0 failed, 5 skipped);
- the changed file passing 63 of 63 on a merge with main `f361108c`;
- the lane's 8 mutants as expected, every kill an assertion;
- hosted `checks` and `node` passing.

Its one blocking finding, F1, was PR-body text: the "New test refusals" list
was not exact. A sibling path `<run>-elsewhere` under `os.tmpdir()` is not
refused. A path under `<tmpdir>-other`, which is outside `os.tmpdir()`, is
refused and was not listed. The digest check does not pin the `packetSha256`
field. The reviewer gave exact replacement text and stated that no code
change is required.

The coordinator applied F1's two replacements to the PR body by script, with
no round 2, along with N2's class sentence and N4's wording, and a "Review
round 1" paragraph. The script checked that each old text occurred once
before and each new text once after. A PR-body sentence is not a reviewed
head byte: CC-REV-1 sends back for review only a reviewer-authored
*semantic* fix, and each applied text is the reviewer's own. N1's code fix
was not applied, so the refusal text keeps the reviewer's sentence for the
unescaped comparison. The served body hashes to
`8672e50c547a2ff15b4196517a55cf4b15be2d06940e6172f6c9dd00088c42a8`. No branch
byte changed. Revise-severity findings still open in the code: 0.

## Class and the GP-Q0 ruling

[Observed] Round 1 ruled CC-REV-1 class 3 (deterministic observation, the
deterministic/inferred seam) at the test-oracle level, where the lane had
read class 4. The check refuses two things it did not, and it stops refusing
one: a verdict leaf whose every occurrence lies inside, or straddles the edge
of, the run path. That narrowing is the bead's own acceptance criterion (the
false failure it fixes), and no product gate changes, so the reviewer found
that GP-Q0's stop clause does not fire. The coordinator posts a notice on
`syzygy-bpyt.10` at landing that names class 3, the narrowing and the exact
refusals, as the body's "New test refusals" section now states them.

## Round 1 (REVISE)

- **F1**: applied to the body verbatim, as above.
- **N1** (a TMPDIR holding `"` or `\` makes the new row fail falsely; the
  reviewer verified a two-line fix): `syzygy-bpyt.4.43`.
- **N2** (the class): the reviewer's sentence, applied to the body; the
  notice names class 3.
- **N3** (the first-occurrence-only mutant survives, equivalent at this
  fixture): information, no action.
- **N4** (evidence tools beside "no script changes"): the reviewer's wording,
  applied to the body.

## The landing

The landing commit merges main `e5667689` into the reviewed head `6d95c626`.
That main carries PRs #557 and #558 on top of the merge base `eb6183b5`.
Between the two, main changed none of the PR's 9 paths, so every PR path is
byte-equal to `6d95c626`. The landing note on the pull request gives the
battery result at the landing commit, the hosted `checks` and `node` results
there, and the surface version at landing.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/observed-leaves-review-2026-10-29/r1/`: 14 files. The raw lists
its kept files with their sha256 in its cleanup section. At landing, a script
checked that list against the kept files: 14 matched, 0 failed, and no file
was unlisted. Nothing else was kept: no scratch clone, no governance,
quotation, typecheck or `npm ci` log, and no copy of the PR body.

This is an implementation record and binds nothing.
