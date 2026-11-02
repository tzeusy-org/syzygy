# R-GP-IMPL-SEGMENT-FOLLOWUPS-1 — CC-REV-1 implementation review of syzygy-bpyt.78, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: a26b96a346b54a7457b9dba4ee0926f2e79dcc2a
Subject: git diff b77bae09 a26b96a3 (PR #562, rebased); frozen r1-review.diff sha256 e5b961f15a6688dae1e508c10c8a1601329af82093f8f82ee73f0b2970677d47 (git diff f361108c f04ef68f)

Reviewer: Opus, fresh context, review bead syzygy-bpyt.83, 2026-11-02. A previous dispatch of this round died with no
verdict; no raw for it exists in `docs/reviews/` (only `R-GP-IMPL-SEGMENT-RULES-{1,2}-RAW.md` match `SEGMENT`) [Observed].

## 1. Subject binding

- The coordinator authorized a rebase onto `origin/main` `b77bae09` before review. The branch was rebased
  (`prepare_pr_branch.py --force-rebase`) and pushed with lease: `f04ef68f` → `a26b96a3` (`b0136200` → `9bbc337b`,
  `f04ef68f` → `a26b96a3`; `git range-diff` reports both commits `=`) [Observed].
- `git diff f361108c f04ef68f` hashes to the frozen sha256 above, and equals `git diff b77bae09 a26b96a3` line for line once the
  `index` lines are dropped (11 files, +1291/−5) [Observed]. This review binds that content at `a26b96a3`.
- The retained evidence names the pre-rebase commits (`b0136200`, and the PR body `f04ef68f`). After the rebase they are
  reachable from no branch ref; I re-checked them by SHA (N2).

## 2. Items (bead syzygy-bpyt.78, from `R-GP-IMPL-SEGMENT-RULES-2-RAW.md`, sha256 d3590d5a…, verified by `sha256sum`)

| Item | Verdict | Evidence |
|---|---|---|
| 1, F2 record half | **Met** | The raw's step-2 replacement string occurs byte for byte in the raw and in `syzygy-bpyt-70/tools/build_record.py` (Python `in`, both `True`); `record.json` `newRefusals[3]` carries it [Observed] |
| 2, N1 | **Met** | `differential: {base, head, tool, testkitSha256: {base, head}}` written by the builder. In a clean clone at `f04ef68f`, `syzygy-bpyt-78/tools/build_record.py b0136200 <tmp>` (which asserts the re-run differential equals `differential.json` and that the bpyt-70 record moved only in its three places) passes and leaves `git status --porcelain` empty, so `syzygy-bpyt-78/record.json` rebuilds byte-identical; `syzygy-bpyt-70/tools/build_record.py 52d8b96f` likewise leaves the tree clean [Observed] |
| 3, N2 | **Met** | The raw's proposed expectation occurs byte for byte in the raw and in the key row of `workspace-reach.test.ts` (both `True`). RK3 re-run at `a26b96a3` (testkit `rank: 2,` → `rank: -1,`, 1 occurrence): `Tests 1 failed | 80 passed (81)`, the failing test the key row; testkit restored, tree clean [Observed]. RK2 survives, equivalent in outcome as the round-2 raw says |
| 4, N3 | **Not applied; deviation disclosed** | See N1 below. Not ruled on here |
| 5, N4 | **Met** | Two residuals in `syzygy-bpyt-78/record.json`, matching the round-2 raw's N4 |

## 3. Item-4 deviation: disclosure and routing (not a ruling)

- **Disclosed:** yes. PR body item 4 says the change was made, measured and reverted, and that it "departs from the bead's
  wording", with mutant rows RX4, RX4E, R2, R2E, U0E; `record.json` `items.4` and `n3Printed` retain the printed lines; the
  rows are in both mutant records (9/9 as expected, dist absent and present) [Observed].
- **The measurement reproduces.** RX4 at `a26b96a3` (`'node', 'import', 'require',` → `'node', 'import',`, 1 occurrence),
  `NO_COLOR=1`, default reporter: the `AssertionError` line is truncated (`…require condition ta…`), and the `Expected:` and
  `Received:` lines print both messages whole, ending `which Node refuses (ERR_INVALID_PACKAGE_TARGET)` and `which Node does not
  read` [Observed]. So the round-2 raw's premise ("the output does not show which clause changed") holds for the JSON
  reporter's first line only; the author's claim that equality form prints the same rests on the retained RX4E record, not
  re-run here.
- **Routing:** inconsistent. The PR body says "the review should rule on it", the 2026-10-28 freeze comment on
  syzygy-bpyt.78 says "the reviewer rules on the item-4 deviation", and the dispatch for this round says the owner rules and
  the reviewer must not. No owner-facing record of the question exists in the diff. (N1.)

## 4. Findings

No blocking finding.

### N1 — note. The item-4 ruling has no settled authority

- Evidence: section 3. The bead's own item 4 was the round-2 raw's N3, which that raw classed "information" with "would print
  both in full" as a suggestion, not a required fix.
- Consequence: the bead cannot honestly close on "all items applied" while item 4 is open; the PR's bytes are the same under
  either ruling (applying the equality form later is an additive test edit).
- Proposed: the coordinator records who rules (owner, per the dispatch) and the question, before closing syzygy-bpyt.78.

### N2 — information. Retained evidence names commits the rebase orphaned

- `record.json`, `mutants-*.json`, `suite-absent.json` and `titles.json` name `b0136200`; the PR body names `f04ef68f`. Both
  are now reachable only by SHA (GitHub still serves them; this review fetched `f04ef68f` by SHA). The tree content they
  measured equals the rebased diff (section 1), but the base moved `f361108c` → `b77bae09`, so the 5830-test suite figure is
  for the old base. At `a26b96a3`: `npm run typecheck` exit 0 (0 `error TS`), `workspace-reach.test.ts` 81/81 [Observed];
  the full suite was not re-run here (hosted CI runs it).

### N3 — information. The PR body's head battery has no recorded result

- "Canonical battery: running in a clean clone; its result goes to the coordinator, not into this body." No result is in the
  diff or the bead comments read [Observed]. Hosted CI at the merged head is the remaining check.

## 5. Class and verdict

- CC-REV-1 class: I agree with the author's class 4 (a test guard that refuses more; one new expectation inside an existing
  row, 0 tests added or removed per `titles.json`; the rest is evidence tooling and records). No product module, config,
  manifest, script or workflow changed (`git diff --stat`) [Observed].
- POC surface version unchanged per the PR body (`549402778cdd` at both ends) [Inferred: not re-derived].
- Verdict: CONFIRM WITH EXCEPTIONS — items 1, 2, 3 and 5 met by script; item 4's deviation is disclosed with reproducible
  evidence but its ruling authority is unsettled (N1), which is for the coordinator and owner, not this review.
