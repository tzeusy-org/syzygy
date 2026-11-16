# R-GP-IMPL-NODE-SEGMENT-CI-1 — CC-REV-1 implementation review of syzygy-bpyt.76, round 1
Verdict: CONFIRM
Reviewed commit: 733226d9
Subject: r1-review.diff sha256 b510de1c354e5ae446498e3ece6ce5cac1473fb36a2be443bc0c2c854a8d5353

Reviewer: beads PR-review worker (review bead `syzygy-z8ny`), fresh context, GitHub login Tzeusy. PR #564, head
branch `agent/syzygy-bpyt.76`. Subject: `git diff origin/main...HEAD` at `733226d9`, which is the author's head
`9b794052` rebased onto `origin/main` `43dfd9b0` by the reviewer (owner-authorized, no conflict). The rebased diff equals
the pre-rebase diff (sha256 `fb63115f…` over `e5667689...9b794052`) except one hunk header in `node-ci.yml`
(`@@ -83,6` → `@@ -85,6`, the two `merge_group` lines #567 added above it) and the `index` lines [Observed].

Governing references: the bead's description (acceptance: "a mutated regex copy fails the CI step; the step passes at
main"; "make a removal fail loudly with a clear message, not a pass"); N4 of `docs/reviews/R-GP-IMPL-SEGMENT-RULES-1-RAW.md`
(lines 258-266: node-ci floats `node-version: 24`, ran v24.21.0, and nothing in the suite notices a Node upgrade).

## 1. What changed

- `.github/workflows/node-ci.yml`: one step after `install (npm ci)`, `node scripts/check_node_segment_rules.mjs`.
  No new permission, action, secret, or network use; `permissions: contents: read` unchanged [Observed].
- `scripts/check_node_segment_rules.mjs`: a copy of `docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs` (left
  unedited, its sha256 is named by that bead's record), which compares the testkit's two regex copies with the literals in
  the running Node's `internal/modules/esm/resolve` source, and runs every `CASES` row of `workspace-reach.test.ts`
  through a real child `node` import. Exit 1 on mismatch, exit 2 with a stated reason when the Node source is unreadable.
- `docs/evidence/syzygy-bpyt-76/`: record, mutant table, suite and test-title records, and their tools.

## 2. Checks run by this reviewer

| Check | Result |
|---|---|
| Unmutated, local Node v24.6.0, at `733226d9` | exit 0, `v24.6.0 regexes true true cases 15/15 mismatches 0`, 1.27 s wall [Observed] |
| Hosted node-ci run 40790991519 (event `pull_request`, head `9b7940522e5d…`) | step ran under `node: v24.21.0` (setup-node line), printed `v24.21.0 regexes true true cases 15/15 mismatches 0`; step 23:59:11Z → 23:59:12Z [Observed] |
| M1: `INVALID_SEGMENT` copy loses its `/i` flag | exit 1; regex row and three case rows (`NODE_MODULES`, `%2E`, `%4Eode_modules`) printed as mismatches [Observed] |
| M2: `process.binding` replaced by a throwing function (`--import` preload) | exit 2, stderr names Node version, the thrown message and what must change [Observed] |
| M3: `process.binding('natives')` returns `{}` | exit 2, stderr "holds no internal/modules/esm/resolve source" [Observed] |
| M4: one `CASES` expectation flipped `refuses` → `loads` | exit 1, the row printed with Node, reader and test outcomes [Observed] |
| `merge_group` trigger (#567) after rebase | present, `node-ci.yml:29-30` (`merge_group:` / `types: [checks_requested]`); the PR touches no trigger line [Observed] |
| `CASES` population | 15 rows in the test's block (counted by `['` openers); the tool's parsed count must equal it or it throws [Observed] |

Mutations were made in the worktree and reverted with `git checkout --`; `git status` clean afterwards apart from the
untracked `.beads.gate.lock` [Observed].

## 3. Findings

No blocking finding.

### N1 — note. Runtime cost is about one second

The hosted step took about one second (step timestamps above) and runs before `build`; it adds no measurable runner
minutes against the saturated pool [Observed for one run; Inferred for the general case].

### N2 — note. Two further failure shapes exit 1 with a stack trace, not exit 2

A `CASES` block the tool cannot parse throws `unreadable CASES`, and a Node that cannot import the `.ts` testkit (type
stripping) fails at the top-level `import`. Both exit non-zero with an uncaught error, so neither passes; they are just not
the documented exit 2. Fail-closed holds [Inferred from the source; not mutated here].

### N3 — note. The hosted evidence is at the pre-rebase head

Run 40790991519 ran at `9b794052`, before the `merge_group` lines existed on the branch. The rebased head re-runs node-ci on
push, and the merge queue re-tests under `merge_group`. The step itself is code-identical across the rebase [Observed].

### N4 — note. `process.binding` deprecation

DEP0111 is documentation-only by default (no warning without `--pending-deprecation`), so today's run is silent; a Node
that removes or throws from it is handled as M2/M3 show [Observed for v24.6.0 and v24.21.0 logs].

## 4. Acceptance

- "a mutated regex copy fails the CI step": met (M1, and the author's G1/G2 rows) [Observed].
- "the step passes at main": met on v24.6.0 locally and v24.21.0 hosted [Observed].
- "a removal fail[s] loudly with a clear message, not a pass": met (M2, M3) [Observed].
- No gate decision changes: the step adds refusals only; tests 5838 → 5838 per the author's `titles.json` [Observed in the record, not re-run].

Verdict: CONFIRM
