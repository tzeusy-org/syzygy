# R-GP-IMPL-TRAJECTORY-DEAD-ARM-1 — implementation review of syzygy-j67q (pull request 699), round 1
Verdict: CONFIRM
Reviewed commit: e5ae00cec3aa98db5b36109fdaf7e06300c52ad2
Subject: PR #699

Reviewer: independent fresh-context reviewer; I did not author or change the change. Merge base
`f60852686def012393b12ed29ef9d4db53c58606`; PR base on main when reviewed `5aea0d37`. All commands ran in
foreground in scratch detached worktrees (after `npm ci`) under `/tmp/r699`, deleted afterwards.

## 1. Is the arm unreachable?

- [Observed] `git grep observedItemCount` at the merge base over `apps packages scripts` returns exactly three
  sites: the interface field (`trajectory-projection.ts:40`) and the two reads in `trajectory.ts:238,240`. No
  producer, in source, tests, fixtures or any other package, assigns it.
- [Observed] The only producer of a `TrajectoryProjection` is `projectTrajectory` (called once, `model-slices.ts:226`).
  Its Unknown return is `{ kind: 'unknown', reason: workItems.reason }` (`trajectory-projection.ts:108`). The other
  literal Unknown trajectory, `routes.test.ts:567`, also carries only `kind` and `reason`.
- [Inferred] `trajectory` is a function of `workItems` alone, so no `buildPocModel` input other than the work-item
  read can reach the field. The arm was dead at the merge base, and the PR's claim holds.

## 2. Is keeping the sentence correct (byte-identical rendering)?

- [Observed] The undefined branch of the old ternary is the only reachable one, so the literal
  `Unknown (work items were not independently observed)` rendered on every Unknown trajectory page. The PR keeps it
  verbatim inside the same template position. `git grep -F "independently observed"` over `openspec/ .syzygy/
  apps/ packages/` finds no spec clause requiring or naming the sentence.
- [Observed] My own before/after differential: a throwaway integration test (not committed) rendered
  `renderTrajectoryPage` at the merge base and at the head over 2 seeds (Butlers; `beadPrefix: 'Bad Prefix!'`)
  x 5 work-item reads (throws, junk, empty, rows, and the default runner) x mount prefix `''` and `/mnt`, plus the
  fixture model at both prefixes: 22 pages, 443,415 bytes each side. After normalizing only the random fixture
  repo paths and 64-hex digests, `diff` was empty (IDENTICAL). 16 of the 22 pages are Unknown and carry the sentence.
  By kind: 4 Observed (Butlers seed, empty and rows reads, both prefixes) and 2 fixture pages, 16 Unknown.
- [Observed] Without normalization the outputs differ in 24 lines, all of them the random temp path and the
  `inputs:sha256` footer digest that hashes it.

## 3. Does the reachability test cover every input combination?

- [Inferred] No test can enumerate every `buildPocModel` input, but the 2 x 4 grid covers the only axis that
  decides the projection (the work-item read: error, unparsable, empty, rows) under two seed sets. Both
  projection kinds are asserted reached (`['observed','unknown']`), so a mutant that makes Unknown unreachable
  fails rather than passing vacuously.
- [Observed] The seed axis does not influence the result in my differential (the 'bad' seed set made every read
  Unknown, the Butlers set made empty and rows Observed); that is not harmful, only redundant with the single
  structural argument in section 1.
- [Observed] The test is in the integration tier (`trajectory.test.ts`, listed in `vitest.tiers.ts`).

## 4. Bead deviation

- [Inferred] Justified. The bead asked to remove the field, the branch and "the denominator sentence" as describing
  an unproduced state. Section 2 shows the sentence is the rendered text of every reachable Unknown state, so
  deleting it would change reachable output, which is a rendering matter and not dead-code removal. The PR
  removes exactly the dead part and says why. The bead's "or keep them with a comment" alternative is not
  needed because the dead part is gone.

## 5. Rule-6 mutants of my own (all at the head, each reverted; file `trajectory.test.ts`, integration tier)

Baseline 15 passed. Each row names the failing test.

| id | mutation (old -> new) | result |
|---|---|---|
| A | `return { kind: 'unknown', reason: workItems.reason };` -> `... reason: workItems.reason, note: 'x' } as TrajectoryProjection;` | 1 failed, the new test (key list) |
| B | `were not independently observed).` -> `were not directly observed).` (`trajectory.ts`) | 1 failed, the new test |
| C | `if (workItems.kind === 'unknown') {` -> `if (workItems.kind === 'unknown' && false) {` | 3 failed, includes the new test (kind coverage) |
| D | same line -> `if (workItems.kind === 'unknown' \|\| workItems.items.length === 0) {` | 2 failed, new test and the existing Unknown-versus-empty test |
| E | `denominator: Unknown (work items were not independently observed).` -> `denominator: 0.` | 1 failed, the new test |

- [Observed] The mutants kill. One class survives by construction: re-adding `observedItemCount?: number` to the
  interface with no producer changes neither types nor behaviour. That is the nature of dead-field removal, not a gap.

## 6. Gates at the head (scratch detached worktree, `npm ci` first)

- [Observed] `npm run typecheck`: exit 0.
- [Observed] `npm test`: 167 files, 3744 passed.
- [Observed] `npm run test:integration`: 88 files, 2550 passed.
- [Observed] `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53 checks). These match the PR body.

## 7. Notes (none blocks)

1. The test pins the exact sentence. Under the test-growth gate an exact-string assertion needs a contract; here the
   contract is the PR's own byte-identity claim, and mutants B and E depend on it. Acceptable.
2. The seed dimension of the grid is redundant (section 3). Harmless.
3. The PR body's differential size (255,583 bytes) differs from mine (443,415) because the matrices differ; both
   are identical across before and after, so nothing rests on the figure.

Verdict word: CONFIRM
