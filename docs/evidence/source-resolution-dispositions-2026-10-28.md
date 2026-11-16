# Source resolution and the product-only build: review dispositions, rounds 1 to 3

[Observed] This record gives the dispositions of the three CC-REV-1 review
rounds of `syzygy-bpyt.4.2` (pull request #549). The change loads every
`@syzygy/*` package from source in tests, the typecheck and the no-egress
bundle, through a `source` export condition; makes the product build emit no
tests; replaces `tsc -b --force` with `scripts/clean_build.mjs`, which removes
the dist of every project `tsc -b` will build and then builds; and drops
`build-output.test.ts`. The lane's evidence is `docs/evidence/syzygy-bpyt-4-2/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SOURCE-RESOLUTION-1-RAW.md` | `REVISE` | `2f249d2c` | `r1-review.diff` sha256 `ff10494fa6ec239e0eb7b34da96c5723d37ff64d6e78ba311340dfa80eda6c73` | `5d3e29ddbcc8a67a23ffcc3ffab962cdb8333565b9f61d73c17d636980a181ae` |
| 2 | `docs/reviews/R-GP-IMPL-SOURCE-RESOLUTION-2-RAW.md` | `REVISE` | `a607bb62` | `r2-review.diff` sha256 `5f9cd4e044e3d37ff936ec071613d5560b4942c5ca737ea431723dab0b5f004a` | `3c02336d308a6478008c2d683c82145f6f2d07639b93224c05f9e35b78a2e95f` |
| 3 | `docs/reviews/R-GP-IMPL-SOURCE-RESOLUTION-3-RAW.md` | `REVISE` | `a607bb62` | `body-r2-to-r3.diff` sha256 `57d593cef8eb9d5ed221ba865aac07dd6db23854a240d082f46b69c7f322bfb3` | `f3eb9974ed5ee2cfdd00664be7477ebc1681fb46c5e5e1989c4a1d8671057e46` |

## How the review loop closed

[Observed] Round 2 found no blocking finding in the code at `a607bb62`: the
full suite with every dist absent passed (251 files, 3 skipped; 5,564 tests,
5 skipped), the typecheck exited 0, all 32 recorded mutants were killed, and
the S10 bundle was byte-identical at main and head. Its four blocking
findings were PR-body sentences, each with exact replacement text. Round 3
was narrow, over the body change only: it found round 2's four replacements
applied verbatim and true, and two body clauses still over-broad (one of them
round 2's own replacement text), again with exact text.

Round 3 was the last round the brief allowed. The coordinator applied round
3's text without a fourth review, and records that choice here. The head has
been `a607bb62` since round 2, which cleared the code. A PR-body sentence is
not a reviewed head byte (CC-REV-1 sends a reviewer-authored *semantic* fix
back for review), and each applied text is the reviewer's own, copied by
script. The coordinator checked the served body (sha256
`10347adcc30eb192bec78d25f573248161e0d40b8e00c126ae77915968b745f5`): each
round-3 replacement occurs once and each replaced text 0 times. Revise-severity
findings open in the code: 0.

## Class and the GP-Q0 ruling

[Observed] Rounds 1 and 2 ruled CC-REV-1 class none, once round 1's F2 was
repaired as a restoration. Class 4: the S10 driver bundle is byte-identical
at main and head. Class 6: no export entry is added. Class 3: the POC
observer-input gate refuses exactly one more path than before,
`scripts/clean_build.mjs`, because the build definition moved there from
`package.json`, which the gate already refused dirty (round 2 class ruling).
That one more refusal restores what the gate covered before, so the
coordinator posted a notice on `syzygy-bpyt.10` at landing rather than a
question.

## Round 1 (REVISE)

[Observed] Round 2's section 6 rules every round-1 item taken:
- **F1** (test support still in the product build), **F2** (the gate admits
  a dirty `clean_build.mjs`), **F3** (an undeclared `cli.d.ts` change),
  **F4** (`clean_build.mjs` refuses less than it says), **F6** (missing
  disclosures and stale lines): met.
- **F5** ("refuses a config that loads packages any other way" is broader
  than the check): partly met; the remainder is round 2's F2.
- **N1, N3, N4, N5, N7, N8, N10**: met.
- **N2** (load-sensitive timeouts, pre-existing): `syzygy-bpyt.4.40`.
- **N6** (no guard on the bundle's `source` condition): closed by PR #545's
  `sourcesOnly` guard, merged here.
- **N9** (stale build guidance in the M12 funnel and the u2a plan):
  `syzygy-bpyt.67`.

## Round 2 (REVISE)

- **F1** to **F4** (four false PR-body passages): applied verbatim; met in
  round 3.
- **N1** (the lane's round-1 mutant tool cannot run at the head; the
  round-2 run `mutants-r2-a607bb62.jsonl`, 32 of 32 killed, is the one to
  cite): `syzygy-bpyt.66`.
- **N2** (a tsc-side refusal still lands after the dists are removed;
  unreachable today): `syzygy-bpyt.65`, with round 2 F2's and F3's
  hardening (X9, X10).
- **N3** (a bare `TypeError` on a `null` tsconfig): `syzygy-bpyt.50`.
- **N4** (the surface version moves again at landing): below.

## Round 3 (REVISE)

- **F1** (the `sourcesOnly` sentence claims every resolution; it checks only
  `@syzygy/*` specifiers) and **F2** (the round-2 paragraph's count): applied
  verbatim, as above.
- **N3** (align line 107 with F1): applied verbatim. **N2** (a trailing blank
  line): removed.
- **N1** (a single-quoted plugin name trips the text check by accident): no
  body change; the `plugins` refusal is item 1 of `syzygy-bpyt.65`.

## The landing

The landing commit merges main `8d5d4bab` (PRs #550, #552 and #544 among
others) into the reviewed head `a607bb62`, with no conflict. Of the PR's 38
paths outside its evidence directory, main changed only `AGENTS.md` since the
last merge base `a1b9bde2`, in other bullets, so the merge kept both edits.
Every other PR path is byte-equal to `a607bb62`. The battery at the landing
commit and hosted `checks` and `node` there are in the landing note on the
pull request, with the surface version at landing (round 2 N4).

## Retained review evidence

The reviewers' tools and results are kept under
`docs/evidence/source-resolution-review-2026-10-28/`: `r1/` 37 files, `r2/`
31 and `r3/` 15. Each raw lists its kept files with their sha256 in its
cleanup section. At landing, a script checked all three against their raws:
37, 31 and 15 matched, 0 failed, and no file was unlisted. One round-1 file
is kept under a changed name, with its bytes unchanged: the file the raw
lists as source-entry-identity.json is stored as
`r1/source-entry-identity.json.txt` (sha256
`8e3b98a4306b99c07bcabf1381dc90649e0723e0a4194fb64e73ab49c1ef0556`, the digest
the raw lists). Its JSON `source` keys name two POC source paths, and the
PWB-REQ-014 authority sweep (`polaris-authority-sweep.test.ts`) refuses such a
key in any swept `.json` file outside the raws. The `.txt` suffix takes it out
of the sweep without editing what the reviewer wrote. No governance,
quotation, typecheck or `npm ci` log and no copy of the PR body was kept.

This is an implementation record and binds nothing.
