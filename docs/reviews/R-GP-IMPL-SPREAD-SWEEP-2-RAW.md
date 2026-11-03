# R-GP-IMPL-SPREAD-SWEEP-2 — review of PR #679 (syzygy-bpyt.54, argument-spread sweep), round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 9757b35431f686fcc6b1ab6728a7de6023b43a52
Subject: PR #679 (round 2)

Reviewer: independent fresh-context reviewer (Claude Opus 5.5, agent `w-rev-679` under review bead `syzygy-5081`). I did
not author the change and did not change it. No observed-repository content was read. Every check below ran in two
detached scratch worktrees: one at the reviewed commit `9757b354`, one at `e405d03e` (main, the commit the records name).

Scope: round 1 (`docs/reviews/R-GP-IMPL-SPREAD-SWEEP-RAW.md`, verdict REVISE, findings F1, F2, F3) and the repair commit
`9757b354` on top of `964e7194`. I checked whether F1 and F2 are closed, recomputed the totals, checked the records'
subject fields, and diffed the classification against round 1's `aed323e9`.

## Verdict reasons

The in-tree deliverable is repaired. F1 and F2 are closed in the evidence records, every total re-derives by script,
no other row changed, and all three records rebuild byte-identically at the commit they name. The one exception is
outside the tree: the PR body still carries the falsified bound that F1 asked to withdraw (F4). It must be rewritten
before merge. That edit touches no reviewed bytes, so it does not retire this review.

## F1: closed in the records

[Observed] In `spread-classification-e405d03e.json`, row `packages/polaris-dossier/src/state-directory.ts:71` now reads
`bounded: false`, `boundClass: unbounded`, `ceiling: null`, `disposition: held: GP-Q0`, with a `whyHeld`. Its `bound`
text no longer claims a ceiling and drops the 1.5x margin sentence. `build_classification.py`'s `GP_Q0` table gains the
same site.

Totals, recomputed by script from the `sites` array (51 rows) and compared field by field with `totals`:

| | lines | calls | bounded | unbounded | fixed | held (GP-Q0) | matches record |
|---|---|---|---|---|---|---|---|
| all | 51 | 55 | 46 | 5 | 0 | 5 | yes |
| shipped | 34 | 35 | 29 | 5 | 0 | 5 | yes |
| scripts | 17 | 20 | 17 | 0 | 0 | 0 | yes |

The shipped and scripts rows add up to the all row. The five held sites are `polaris-accessible-names.ts:336`, `:338`,
`check.ts:206`, `state-directory.ts:71` and `discovery.ts:339`. All are shipped, and every unbounded row is held. This
matches round 1's requested figures and the author's report (46 bounded, 5 unbounded, 5 held, 0 fixed).

## F2: closed

[Observed] `sweep-mutants-e405d03e.json` and `sweep-selftest-e405d03e.json` now carry `ranAtCommit`
(`e405d03e5320256581772ed015a7f723ef07ba65`), `tool` and `toolSha256`. The harness derives them from
`git rev-parse HEAD` of the clone argument and from the sha256 of `spread_sweep.py`. Neither value is hand-typed.

- `toolSha256` is `808d6225e5d48c6dba773e09c018a3ce62563c57201d472154d99bdf58d52b93` in all three records. `sha256sum`
  of `spread_sweep.py` at `9757b354` returns the same value, unchanged since round 1.
- `e405d03e` is reachable from `origin/main` and is an ancestor of `9757b354` (`git merge-base --is-ancestor`).
- [Observed] The tool does not exist at `e405d03e` (`git cat-file -e` fails). `ranAtCommit` names the swept tree, and
  `toolSha256` names the tool. `git diff --stat e405d03e 9757b354` lists only the 6 files under
  `docs/evidence/syzygy-bpyt-54/` (1,109 insertions), so the swept implementation bytes are identical at both commits.
  This pairing is re-checkable. Round 1's objection was that the commit appeared nowhere in the record, and that is now
  answered.

Re-runs [Observed]: with the tools taken from `9757b354` and the clone argument set to a worktree at `e405d03e`:

- `build_classification.py` exits 0, and its output is byte-identical (`cmp`) to `spread-classification-e405d03e.json`.
- `spread_sweep_mutants.py` exits 0 and kills 7 of 7. Its output is byte-identical to `sweep-mutants-e405d03e.json`.
- `spread_sweep_mutants.py --selftest-record` exits 0, and its output is byte-identical to `sweep-selftest-e405d03e.json`.

The builder asserts that the classified set equals the sweep's hits. A clean rebuild at `e405d03e` therefore also
re-confirms the 51-line population there.

## No silent reclassification

[Observed] A script diffed `spread-classification-e405d03e.json` against `aed323e9`'s
`spread-classification-66837559.json`:

- The site sets are equal (51 against 51).
- Exactly one row differs, `state-directory.ts:71`, in the fields `bounded`, `boundClass`, `ceiling`, `bound`,
  `disposition` and the new `whyHeld`.
- The only top-level fields that differ are `commit` and `totals`.

The source diff `aed323e9..9757b354` under the evidence directory agrees. It changes that one `ROWS` entry, adds one
`GP_Q0` entry, adds subject fields to the harness, and renames the three records to the new commit. The round-1
`sweep-selftest-66837559.json` is deleted rather than kept. It named no commit, so nothing cites it as a bound record.

## F3: no repair was asked

Round 1 asked for no repair, and none was made. The record still calls the population `shipped` without the caveat
F3 described. This remains a note.

## F4 (exception, new): the PR body still states the withdrawn bound and the old totals

[Observed] `gh pr view 679 --json body` at review time:

- Opening paragraph: "re-derives the argument-spread sweep at `66837559`" and "All four unbounded sites are GP-Q0 holds".
- It cites `sweep-mutants-66837559.json` and `spread-classification-66837559.json`, which no longer exist at the head.
- The table row reads `shipped src | 34 | 35 | 30 | 4 | 0 | 4`. The record says 29, 5 and 5.
- "Held for the owner (GP-Q0)" lists four sites and omits `state-directory.ts:71`.
- "Remainder worth a note" still says `state-directory.ts:71` "is bounded only by OS limits: at most 67,584 components",
  and that "gives a margin of about 1.5x". F1 showed this claim false, and round 1 asked for it to be withdrawn.

Repair needed before merge: rewrite the PR body from the record. Use the `e405d03e` filenames, the 29/5/5 shipped row,
five holds including `state-directory.ts:71` with its `whyHeld`, and a remainder section with the 67,584 and 1.5x
sentences removed. These bytes are not in the tree, so the edit does not retire this review.

## Battery

`python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0, at both `9757b354` and
`e405d03e` [Observed]. No implementation code changed, so I ran no test suite.
