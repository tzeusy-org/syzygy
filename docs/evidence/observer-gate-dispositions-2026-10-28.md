# Observer gate prefixes: review dispositions, rounds 1 and 2

[Observed] This record gives the dispositions of the two CC-REV-1 review
rounds of `syzygy-bpyt.56` (pull request #556). The change carries out the
owner's GP-B2 Q3 answer "B"
(`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`, section "Q3").
It adds `packages/polaris-generation-core/` and
`packages/polaris-generation-consent/` to `pocObserverInputsAreClean` in
`apps/three-surface-poc/src/git-observation.ts`. It also replaces the list
test with a derived equality test, and plants both observed edits as rows.
The lane's evidence is `docs/evidence/syzygy-bpyt-56/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-OBSERVER-GATE-1-RAW.md` | `REVISE` | `5d73176a` | `r1-review.diff` sha256 `8446d71666e1f44713cc6f753894c56dd8ca15137dce8736a384502513991297` | `274b95a7230da53edab1749143ceb009c9e7d09fe05eda8fa02a17214eda56fd` |
| 2 | `docs/reviews/R-GP-IMPL-OBSERVER-GATE-2-RAW.md` | `REVISE` | `8994af16` | `r2-review.diff` sha256 `8029aa4156b7f84fd11d478500f24034ecdb13063d2616548ade73e118c08944` | `5422465f9066f0f87bd22dfe20d7fbc2133efb5b7f081fc2c6c6ea6770174f31` |

## How the review loop closed

[Observed] Round 2 found no blocking finding in the branch at `8994af16`:
- every round-1 item was met, with all ten exact-text checks verbatim;
- the gate blob was unchanged since round 1;
- all 14 lane mutants died as recorded;
- the full suite with every dist absent passed (253 files, 5,783 tests);
- the battery passed, and hosted `checks` and `node` passed.

Its differential over 8,081 paths found 86 newly refused, all under the two
new prefixes, and 0 newly accepted. The lane's figures (7,921 paths, 61
probes, 74 newly refused, 72 of them tracked) re-derived exactly. Its one
blocking finding, F1, was the PR body's list of new test refusals, which
omitted one: a tsconfig reference written as a file, a form TypeScript
accepts, now makes the equality and extends rows throw `ENOTDIR`. The
reviewer gave an exact replacement bullet.

The coordinator applied that bullet, and the reviewer's own N2 sentence, to
the PR body by script, with no round 3. The script checked that the old
bullet occurred once before and 0 times after, and that each new text
occurred once. A PR-body sentence is not a reviewed head byte, since CC-REV-1
sends only a reviewer-authored *semantic* fix back for review, and each
applied text is the reviewer's own. The served body hashes to
`601f14f036c2614277ad90d471b8f2852561d6e672245fc842958f24916ea236`. Its added
"Review round 2" paragraph says the same. No branch byte changed.
Revise-severity findings still open in the code: 0.

## Class and the GP-Q0 ruling

[Observed] Both rounds ruled CC-REV-1 classes 3 and 4, and 1 indirectly, as
`R-GP-IMPL-OBSERVER-SUPPORT-1` ruled for this gate. The gate refuses more and
accepts nothing new, and it does so on the owner's own answer. So at landing
the coordinator posts a notice on `syzygy-bpyt.10`, not a question. That
notice names the 74 newly refused paths, the derived test's refusals as now
listed in the body, and the build script's own refusal of both planted forms.

## Round 1 (REVISE)

- **F1** (a false body bullet and test comment saying `clean_build.mjs` does
  not stop the inherited-`outDir` form): the reviewer's texts, verbatim. Met
  in round 2.
- **N1** (class 3 and 4, 1 indirectly): the reviewer's sentence. Met.
- **N2** (the extends row checked only a chain's last link; R5 survived): the
  reviewer's assertion and comment. R5 now dies. Met.
- **N3** (no probe with a protected prefix mid-path; R2 survived): the
  `docs/<dir>/a.ts` probe, 49 to 61. R2 now dies. Met.
- **N4** (D1 and D4 equivalent on today's tree): D1t added as a lane mutant
  row. Met.
- **N5** (mismatch direction, length pins): each mismatch is now labelled
  `accepted` or `refused`, and the two pins carry messages. Met.
- **N6** (`syzygy-bpyt.6.16`'s text named the removed drift guard): the
  coordinator rewrote that bead's text at landing.

## Round 2 (REVISE)

- **F1** (an unlisted test refusal): the body bullet applied verbatim, as
  above.
- **N2** (the round-1 records at `5877559c` name tool digests that the tree no
  longer holds): the reviewer's sentence, in the body's Evidence section.
- **N1** (thin rule-11 identity in three records), **N3** (one comment line
  of 156 columns) and **N4** (an optional completion of the equality row's
  comment): carried to `syzygy-bpyt.6.16`.

## The landing

The branch head `8994af16` already merges main `c672492c`, which is still
main at landing. The battery at the landing commit, hosted `checks` and `node`
there, and the surface version at landing are in the landing note on the pull
request.

## Retained review evidence

The reviewers' tools and results are kept under
`docs/evidence/observer-gate-review-2026-10-28/`: 12 files in `r1/` and 15 in
`r2/`. Each raw lists its kept files with their sha256 in its cleanup section.
At landing, a script checked both lists against the copies: 12 and 15
matched, 0 failed, and no file was unlisted. No scratch clone, and no
governance, quotation, typecheck or `npm ci` log, was kept, nor any copy of the
PR body.

This is an implementation record and binds nothing.
