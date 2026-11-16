# Spread-to-loop repairs: review dispositions, rounds 1 to 3

[Observed] This record gives the dispositions of the three CC-REV-1 review
rounds of `syzygy-bpyt.1.18`, pull request #555. The change replaces two
`push(...spread)` calls with loops, one in `markdown-code-context.ts` and one
in `project-shape-extraction.ts`. Before the change, a closed fence or an item
list of about 125,000 lines or more threw a `RangeError`. Now the shorter-input
decision is reached instead. It carries out the owner's GP-B2 Q1 answer
(`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`, sections "Q1"
and "Q1 follow-up"). The lane's evidence is `docs/evidence/syzygy-bpyt-1-18/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SPREAD-LOOPS-1-RAW.md` | `REVISE` | `241b28ff` | `r1-review.diff` sha256 `2646d106f93b070761ae38a59ddc740c98a64cd13c84e7d0c8d6f71ac1f993e6` | `81ac6cf85fa53efa569750b565845d69ee9ddd23e8ee207f398606b330b8dc1e` |
| 2 | `docs/reviews/R-GP-IMPL-SPREAD-LOOPS-2-RAW.md` | `REVISE` | `45f7d855` | `r2-review.diff` sha256 `a7949274db66cdbbc8c03e5fde06c20be7520e1931a26866bdc4f6354685d132` | `83dd4c0b59bafd5c0784ce3fc22baa3738d8285e89795c655d49b41638b5e248` |
| 3 | `docs/reviews/R-GP-IMPL-SPREAD-LOOPS-3-RAW.md` | `REVISE` | `bca6482f` | `r3-review.diff` sha256 `c2eccf9a4dbe52d450dabd723860387cf7178d5e8512eeb71ff11ea1da66e1b7` | `72153488800be1767e72f3753a228b6de5644fd80250f6b642da8118439414e1` |

## How the review loop closed

[Observed] Round 3 was the last round under the stopping rule set before
round 1. It found every round-2 item met, each checked by script against
round 2's exact text. It re-ran these checks at `bca6482f`, and each passed:

- the rule-6 run: 8 of 8 mutants killed. R10 and R11 are each killed only by
  the new line-order assertion;
- the four canaries: they pass under the default pool, and under
  `--pool=threads` with the base production lines exactly those four fail;
- the record: rebuilt, its digest unchanged;
- the full suite with every dist absent: 5,808 passed, 5 skipped;
- the battery, the typecheck, and hosted `checks` and `node`.

Its one blocking finding, F1, was two sentences of the PR body, and it gave
exact replacement text for both.

Under that stopping rule, a finding that is PR-body text only takes the
reviewer's exact text by script, with no further round. The coordinator
applied both replacements. The script checked that each old text occurred
once before and 0 times after, and that each new text occurred once. The
served body hashes to
`2a0a4f361e8fdd98af963b579f7b3b248868304a435178453f18f36a3fdb35c2`, and its
added "Review round 3" paragraph says the same. No branch byte changed.
Revise-severity findings still open in the code: 0.

## Class and the GP-Q0 ruling

[Observed] All three rounds ruled CC-REV-1 classes 4 and 3. The two loops sit
under the content-class and active-content screens, and on the extraction
path that writes the shape. The only output that changes is a throw becoming
the decision the shorter input already reached. The owner ruled that in GP-B2
Q1, so at landing the coordinator posts a notice on `syzygy-bpyt.10`, not a
question. Round 1's N7 asked that the notice name all five callers of
`scanActiveContent`, including public-source screening before provider
egress, and the effect of a 503 response, and it does.

## Round 1 (REVISE)

- **F1** (UTF-16 code-unit counts published as bytes, and no retained tool
  for the ceiling figure): the reviewer's six steps were applied. Met in
  round 2.
- **N1** (the tests were blind to the regression under a worker-thread pool):
  canaries were added to the mask and extraction files. Met; round 2's N1
  extended them.
- **N2** to **N6**, **N8** and **N9**: applied with the reviewer's texts. All
  were met in round 2, which accepted the `ENDS` and `readOne` hoist that N5
  needed and found the `~6` inventory figure true (round 2's N3).
- **N7** (the five screen callers): carried to the owner notice.

## Round 2 (REVISE)

- **F1** (the 130,000-item test's order oracle was the module under test; R10
  and R11 survived): the reviewer's four-line line-order assertion
  (`tools/order-assertion.patch`). Met in round 3.
- **F2** (two false sentences, in `build-record.py` and in the body): applied
  verbatim. Met.
- **N1** (no canary in the reader and model files): applied. Met.
- **N2** (`countsAt` on the record's test rows): applied. Met.
- **N3** (the `~6` comes from `test-inventory.mjs` resolving tables only at
  file scope): `syzygy-bpyt.74`.
- **N4** (the extractor canary's margin is 3.7%): information, recorded
  here. A future canary failure is read as a stack change, not as a flake.

## Round 3 (REVISE)

- **F1** (two body sentences): applied verbatim, as above.
- **N1** (no long-fence mask test pins line order; R13 survives) and **N2**
  (the record uses "codeCommit" for two commits): `syzygy-bpyt.77`.
- **N3** and **N4** (information about intermediate commits): no change.

## The landing

The landing commit `9edd898e` merges main `7dfad65a` (PRs #554 and #556)
into the reviewed head `bca6482f`, with no conflict. Main `c672492c` was
already in the reviewed head. Between `c672492c` and `7dfad65a`, main changed
none of the PR's 31 paths, so every PR path is byte-equal to `bca6482f`. The
battery at the landing commit, hosted `checks` and `node` there, and the
surface version at landing are in the landing note on the pull request.

## Retained review evidence

The reviewers' tools and results are kept under
`docs/evidence/spread-loops-review-2026-10-28/`: 23 files in `r1/`, 15 in
`r2/` and 11 in `r3/`. Each raw lists its kept files with their sha256 in its
cleanup section. At landing, a script checked all three against their raws:
23, 15 and 11 matched, 0 failed, and no file was unlisted. No scratch clone,
no governance, quotation, typecheck or `npm ci` log, and no copy of the PR
body was kept.

This is an implementation record and binds nothing.
