# Effective tsconfig options in clean_build.mjs: review dispositions, round 1

[Observed] This record gives the dispositions of the one CC-REV-1 review
round of `syzygy-bpyt.65`, pull request #558. The change takes three
follow-ups from PR #549's reviews:
- `sync-child-process-guard.test.ts` refuses a `plugins` key in
  `vitest.config.ts`;
- `product-build.test.ts` takes its emitted set from TypeScript's own
  program, so a triple-slash reference is followed;
- `scripts/clean_build.mjs` reads each project's effective options through
  `extends` and refuses what it finds before removing anything.

The lane's evidence is `docs/evidence/syzygy-bpyt-65/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-EFFECTIVE-OPTIONS-1-RAW.md` | `REVISE` | `807024b8` | `r1-review.diff` sha256 `4ebb31a8ad5a7a0590d1b4ed89aed42cc907d1efea7acfa59b43e68a37b6df59` | `72724482962a1a81becc499305f5b310422dd0d4fd09d3fe27aa7c6fcd651aba` |

## How the review loop closed

[Observed] Round 1 found:
- nothing newly accepted, over the lane's 34 trees, 47 of its own and two
  backslash trees;
- real `build` and `build:poc` dists byte-identical against the base script;
- the new emitted-set model equal to `tsc --listFilesOnly`, 247 of 247
  modules;
- the lane's 15 mutants killed by their assertions;
- hosted `checks` and `node` passing;
- in the full suite, one timeout in `start-gates.test.ts` that passes alone
  (104 of 104).

Its three blocking findings were all PR-body text:
- F1: an inherited `null` `declarationDir` or `outFile` is a newly refused
  tree that R3 and R4 did not describe.
- F2: R6 is reachable through a project directory whose name holds a
  backslash, so E1 is not equivalent; the body said the opposite of both.
- F3: R1 said "any `plugins` key", which is broader than the pattern.

The reviewer gave exact text for each, and stated that no code change is
required.

The coordinator applied the three texts to the PR body by script, with no
round 2, along with N1's optional sentence and a "Review round 1"
paragraph. The script checked that each old text occurred once before and
that each new text occurred once after. A PR-body sentence is not a reviewed
head byte: CC-REV-1 sends back for review only a reviewer-authored
*semantic* fix, and each applied text is the reviewer's own. The served body
hashes to `79b164c9bbbb46bc2c2fec760ccb802ec7b67ffbb11d15a1e42d14666db3cc10`.
No branch byte changed, so `mutants-9bec80d5.json` still records E1 under
`equivalent`, with a reason round 1 falsifies; `syzygy-bpyt.4.42` item 1
carries the fix. Revise-severity findings still open in the code: 0.

## Class and the GP-Q0 ruling

[Observed] Round 1 ruled CC-REV-1 classes 3 and 4: what two test guards
refuse (class 4) and what the build script refuses (class 3) change, and
both only refuse more. The newly refused trees F1 found are refusals, not
acceptances, and the body now lists them. The coordinator therefore posts a
notice on `syzygy-bpyt.10` at landing, not a question. The refusal list is
the PR body's "Every new refusal" section, R1 to R7 as amended in round 1.

## Round 1 (REVISE)

- **F1**, **F2**, **F3**: applied to the body verbatim, as above. F1's
  optional header sentence and F2's optional backslash row are
  `syzygy-bpyt.4.42` items 3 and 1.
- **N1** (a missing `typescript` now fails before removal, with a new
  message): the reviewer's optional sentence, applied to the body.
- **N2** (mutant C10 survives every row): `syzygy-bpyt.4.42` item 2, with the
  reviewer's row. MF2 and MF3 are equivalent on today's tree.
- **N3** (a project entry's `extends` path, or a string entry, gets past the
  guard; predates the PR): `syzygy-bpyt.4.42` item 6, with its own owner
  notice when it lands.
- **N4** (`effective_options.mjs` copies the script's predicate):
  `syzygy-bpyt.4.42` item 7. The figure stands; the reviewer's independent
  `tsc --showConfig` sweep agreed 10 of 10.
- **N5** (a third surface version at landing): the landing note names it.
- **N6** (a failed `rejects` leaks `KEPT_OUTSIDE` into the next row):
  `syzygy-bpyt.4.42` item 4.
- **N7** (under `composite`, an X10 reference also fails `tsc -b`, TS6307):
  `syzygy-bpyt.4.42` item 5, optional.
- **N8** (the `start-gates.test.ts` timeout under load): already tracked by
  `syzygy-bpyt.4.33` and `syzygy-bpyt.4.40`.

## The landing

The landing commit merges main `f361108c` into the reviewed head `807024b8`.
That main carries PRs #555 and #557 on top of the merge base `7dfad65a`.
One path is shared, `apps/three-surface-poc/src/sync-child-process-guard.test.ts`,
which #557 also changed. Git merged it automatically, with no conflict: it
took #557's hunks and this PR's. Every other PR path is byte-equal to
`807024b8`, and every other path main changed is byte-equal to main. On the
merge, both changed test files passed, 31 of 31. The landing note on the pull
request gives the battery result at the landing commit, the hosted `checks`
and `node` results there, and the surface version at landing.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/effective-options-review-2026-10-29/r1/`: 21 files. The raw
lists its kept files with their sha256 in its cleanup section. At landing, a
script checked that list against the kept files: 21 matched, 0 failed, and no
file was unlisted. Nothing else was kept: no scratch clone, no governance,
quotation, typecheck or `npm ci` log, and no copy of the PR body.

This is an implementation record and binds nothing.
