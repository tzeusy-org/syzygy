# Node segment rules for workspace entries: review dispositions, rounds 1 and 2

[Observed] This record gives the dispositions of the two CC-REV-1 review
rounds of `syzygy-bpyt.70`, pull request #557. The change takes the
follow-ups from PR #554's reviews. Its main part is that the S10 workspace
entry reader (`workspace-reach.testkit.ts`) now refuses every `exports` or
`main` target that Node 24's invalid-segment rules reject or deprecate, in
every condition. It also adds:
- a shorthand-alias row in `sync-child-process-guard.test.ts`;
- an object-rest write row in `support-purity.test.ts`;
- a `types`-only `/../` row.

The lane's evidence is `docs/evidence/syzygy-bpyt-70/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SEGMENT-RULES-1-RAW.md` | `REVISE` | `9fd03a8e` | `r1-review.diff` sha256 `80408eda50f1c8fd2feec1dc34a4cf142d8751387a967c8cc5ccf866609d2e7a` | `72272f4b6f8724d29403f96dad64990ffcec820312c0f2d0da418be62c1f7fd6` |
| 2 | `docs/reviews/R-GP-IMPL-SEGMENT-RULES-2-RAW.md` | `REVISE` | `b218990f` | `r2-review.diff` sha256 `24f54b62fb04fd82ae352ec41e4563bec85f46784906feb1f349ad1efea11c3c` | `d3590d5a21ae915e3226713837afeaf5eb40ed15f75cf528261fa401c2c11bff` |

## How the review loop closed

[Observed] Round 2 found every round-1 item met, each exact text checked by
script. It also found:
- nothing newly accepted, over 156 + 16 differential rows plus a proof by
  construction;
- the lane's 33 mutants as recorded, in both dist states;
- the whole suite passing with every dist absent (256 files, 5,801 tests);
- the battery passing, and the product dist byte-identical.

Its two blocking findings were both sentences of the PR body:
- F1: "every changed file is a test or test-support module", although 12 of
  the 16 changed files are this bead's records and tools.
- F2: refusal 4 named only `types`, `source` and `main`, and omitted a
  segment-faulted target under any other condition Node does not read, such
  as `browser`.

The reviewer gave exact text for both, and stated that the body edit alone
clears F2.

The coordinator applied both replacements to the PR body by script, with no
round 3, along with F2's optional third sentence. The script checked that
each old text occurred once before and 0 times after, and that each new text
occurred once. A PR-body sentence is not a reviewed head byte: CC-REV-1 sends
back for review only a reviewer-authored *semantic* fix, and each applied
text is the reviewer's own. The served body hashes to
`74eee1ef08e31ee9c781727b7f8a9044fdaa23cbbd30e0d68e5cc0e7321e6b2b`. It also
carries a "Review round 2" paragraph saying the same. No branch byte changed,
so `record.json` `newRefusals[3]` still names only `types` and `source`; it
is incomplete rather than false, and `syzygy-bpyt.78` item 1 carries the fix.
Revise-severity findings still open in the code: 0.

## Class and the GP-Q0 ruling

[Observed] Both rounds ruled CC-REV-1 class 4. `entryModulesIn` derives the
S10 no-egress bundle's alias map, and this change widens what it and the
suite-config guard refuse. Those test guards refuse more and nothing less.
Round 1's N2 found one narrowing, a condition key containing `/../`, and the
lane restored that refusal, so the differential's "accepts" bucket is 0. The
coordinator therefore posts a notice on `syzygy-bpyt.10` at landing, not a
question. The refusal list is the PR body's "What the test suite now
refuses" section: six items, with item 4 as amended in round 2.

## Round 1 (REVISE)

- **F1** (a trailing `/` target called one "Node loads"): the code fix, with
  "loads" becoming "accepts" in the guard's message, plus a trailing-`/` case
  row the pin tool measures. Met.
- **F2** (an index-pinned `globalSetup` anchor as an unlisted refusal): the
  raw's narrower any-project assertion, listed as refusal 6. RX7 now passes.
  Met.
- **F3** (no class stated): the raw's section, verbatim. Met.
- **N1**, **N4**, **N5**, **N7**: residual lines and wording, plus a "Node's
  rules" section quoting both regex literals. Met. N4's CI follow-up is
  `syzygy-bpyt.76`.
- **N2** (a narrowing): the condition-key refusal was restored, with a row
  and mutant K1. Met.
- **N3** (RX3 and RX4 survived): the `%4E` case row and the `require`
  severity row. Both mutants now die. Met.
- **N6**: information. The plugin residual is true.

## Round 2 (REVISE)

- **F1** and **F2**: applied to the body verbatim, as above. The record half
  of F2 is `syzygy-bpyt.78` item 1.
- **N1** (`differential.json` names no subject), **N2** (RK3 survives),
  **N3** (truncated `toThrow` output) and **N4** (an incomplete "Node's
  rules" section): `syzygy-bpyt.78` items 2 to 5.

## The landing

The landing commit merges main `eb6183b5` into the reviewed head `b218990f`, with no
conflict. That main carries PRs #556 and #555 on top of the merge base `c672492c`.
Between `c672492c` and `eb6183b5`, main changed none of the PR's 16 paths, so every
PR path is byte-equal to `b218990f`. The landing note on the pull request gives the
battery result at the landing commit, the hosted `checks` and `node` results there,
and the surface version at landing.

## Retained review evidence

The reviewers' tools and results are kept under
`docs/evidence/segment-rules-review-2026-10-28/`: 27 files in `r1/` and 29 in
`r2/`. Each raw lists its kept files with their sha256 in its cleanup section.
At landing, a script checked both lists against the kept files: 27 and 29
matched, 0 failed, and no file was unlisted. Nothing else was kept: no scratch
clone or scratch package, no governance, quotation, typecheck or `npm ci` log,
and no copy of the PR body.

This is an implementation record and binds nothing.
