# Support-leaf guard follow-ups: review dispositions, rounds 1 and 2

[Observed] This record gives the dispositions of the two CC-REV-1 review
rounds of `syzygy-bpyt.46` (pull request #554). The change takes follow-ups
from PR #545's review: an identifier allowlist for the owner-act drafter's
purity guard, reader rows and destructuring writes for the support purity
guard, an `import()` row, the S10 bundle's entry derivation moved into
`workspace-reach.testkit.ts` with a `/../` refusal, and an `AGENTS.md`
sentence naming the support purity guard. The lane's evidence is
`docs/evidence/syzygy-bpyt-46/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-1-RAW.md` | `REVISE` | `2f48eefa` | `r1-review.diff` sha256 `ce0af702af566ededd4598b0534a5dc6b16de32a530163282225191c1f0f4b0a` | `821c32644954fbb36a7b3755beeb41699ed0405ff601f6d15c74d5674770b10a` |
| 2 | `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-2-RAW.md` | `REVISE` | `330dd894` | `r2-review.diff` sha256 `872b63c7003d7e978213e2326aef58898cadf5cc777bf53c0321ddd70139d7ae` | `6123e526349a6ffefd2ffd99f7de794ac842b506b225fa80b6d07230cbdc816b` |

## How the review loop closed

[Observed] Round 2 found no blocking finding in the code at `330dd894`: the
whole suite with every dist absent passed (254 files; 5,644 tests, 5
skipped), the lane's 34 mutants ran as expected in both dist states with
every kill an assertion, the built dist was byte-identical to the merge base
(990 of 990 files), and the battery passed. Its one blocking finding, F1, was
six PR-body passages still written against `1a8864d9`, with exact
replacement text in its `tools/f1_body_edits.py`.

The coordinator applied those six replacements by the reviewer's script,
with no round 3, and records that choice here. A PR-body sentence is not a
reviewed head byte (CC-REV-1 sends a reviewer-authored *semantic* fix back
for review), and each applied text is the reviewer's own. The script checked
each old text occurred once before and each new text once after, over the
served body (sha256
`91d1b7ee7831d361fc25c712bead93cc32344157d730f2859c2ea402c3d4317c`, which
also carries a short "Review round 2" paragraph). Revise-severity findings
open in the code: 0.

## Class and the GP-Q0 ruling

[Observed] Both rounds ruled CC-REV-1 class 4: the change tightens the test
guards on `@syzygy/support`, the drafter and the S10 no-egress bundle. No
product, workflow, `package.json` or `vitest.config.ts` byte changes, and
every changed file is a test or a test-support module imported only by tests.
The guards refuse more and nothing less, so the coordinator posted a notice
on `syzygy-bpyt.10` at landing rather than a question. The refusal list is
the PR body's "Refusals this adds" section, five items after round 2.

## Round 1 (REVISE)

- **F1** (five false body sentences): applied, partly met in round 2; the
  remainder is round 2's F1.
- **F2** (the `/../` row pinned only a string entry): the reviewer's fix
  file, byte for byte; met in round 2.
- **F3** (the root-alias oracle ignored Vite's first-prefix alias match) and
  **F4** (an unlisted refusal): superseded. PR #549 (`syzygy-bpyt.4.2`,
  merged as `a15b6a04`) replaced the root alias map with a `source` export
  condition and refuses an alias key, so merged with it the oracle
  `root-vitest-aliases.test.ts` failed at file level. The coordinator ruled
  item 3's oracle superseded; the lane dropped it, its refusals and its
  mutant rows. Round 2 found the ruling sound: #549's guard and its load and
  source-first rows refuse every wrong alias and every resolution that
  leaves `source`, so no protection was lost.
- **N1** (reader rows): the reviewer's four fix files, byte for byte; met.
- **N2** (E4 should be a uniform `/../` edit): applied, but undone in effect
  by #549 (round 2's N1).
- **N3** (the entry reader against Node's segment rule), **N4** (the
  guards' own comparisons): `syzygy-bpyt.70` items 2 and 3.
- **N5** (item 4 unblocked): done in this PR.
- **N6** (the testkit's dist module imports `typescript`): moot since #549,
  whose build emits no test-support module (round 2).

## Round 2 (REVISE)

- **F1** (six body passages written against `1a8864d9`): applied verbatim,
  as above.
- **N1** (E4 no longer pins the `/../` check; add E4S and E1E4S), **N2**
  (the object-rest write arm has no row; the reviewer's fix file), **N3**
  (the `types`-only `/../` refusal has no row), **N4** (information:
  #549's alias-key text check misses a shorthand `alias`):
  `syzygy-bpyt.70` items 5 to 8.
- **N5** (bpyt.70 items 1 and 4 moot since #549): recorded on the bead. The
  lane's run of round 1's alias-shadow probe loads both dossier subpaths in
  both dist states (`docs/evidence/syzygy-bpyt-46/alias-shadow-probe.json`).

## The landing

The landing commit merges main `29db2b11` (PRs #553 and #548) into the
reviewed head `330dd894`, with no conflict. Of the PR's 15 paths, main
changed two since the merge base `a15b6a04`, each in other hunks:
`AGENTS.md` (#548's `isRecord` sentence in the same `packages/support`
bullet, before this PR's purity-guard sentence) and
`support-purity.test.ts` (#548's five allowlist names). Every other PR path
is byte-equal to `330dd894`. At the merge, after `npm ci`, the PR's four
changed test files, `is-record.test.ts`, `sync-child-process-guard.test.ts`
and `product-build.test.ts` passed: 7 files, 186 tests, 1 skipped.
`npm run typecheck` exited 0. The battery at the landing commit and hosted
`checks` and `node` there are in the landing note on the pull request, with
the surface version at landing.

## Retained review evidence

The reviewers' tools and results are kept under
`docs/evidence/support-leaf-followups-review-2026-10-28/`: `r1/` 47 files and
`r2/` 46. Each raw lists its kept files with their sha256 in its cleanup
section. At landing, a script checked both against their raws: 47 and 46
matched, 0 failed, and no file was unlisted. A Python bytecode cache in
round 1's `tools/`, which its raw does not list, was not kept. No
governance, quotation, typecheck or `npm ci` log and no copy of the PR body
was kept.

This is an implementation record and binds nothing.
