# R-GP-IMPL-RECONCILE-WITNESSES-1 raw review
Verdict: CONFIRM
Reviewed commit: 58ecce61081f39b8e4131fe01c0f69769cf56eb9
Subject: PR #665

Subject: `syzygy-hgkq`, the re-derivation of
`docs/evidence/spec-readability-reconciliation-2026-10-02/selftest-witnesses.json`.
Reviewed against `origin/main` a7c1fa98 (merge base 5f6ff684). Every command
ran in the foreground; the selftest took 16 minutes.

## Claims checked

1. `5ee1c1a1` is reachable from main. [Observed] `git merge-base
   --is-ancestor 5ee1c1a1 origin/main` exits 0. `0bc07cc4` is not an
   ancestor (the same command fails), as the bead says.
2. The checker blob is the same. [Observed] `scripts/check_spec_reconciliation.py`
   is blob `0c0a6fb11c7d84b85cf8c8208a9ee600830182b9` at both `5ee1c1a1` and
   `origin/main`; the README sentence names that blob and it matches.
3. The selftest re-run reproduces the new witnesses. [Observed] In a detached
   worktree at `5ee1c1a1`, `python3 scripts/check_spec_reconciliation.py
   --selftest --witnesses <file>` printed `SELFTEST PASS ... 102 of 102 mutants
   killed ... (commit 5ee1c1a1fa1c)`. The file it wrote is byte-identical
   (`cmp`) to the PR's `selftest-witnesses.json`; 102 mutants, 102 `killed`.
4. The first-run file is the old witnesses. [Observed] `cmp` of
   `git show origin/main:<path>/selftest-witnesses.json` against the PR's
   `selftest-witnesses-first-run-0bc07cc4.json` is identical; both hash to
   `fa412de6d4a1478ddb8e290cd66febf1aec799fd11d1adae9e61fc14bb4b7db5`.
5. The one differing row is explained. [Observed] Comparing old and new
   mutants pairwise, only `addition-aggregate-block` differs (plus the top
   `commit` field). Its `old` fragment is the text before the injected
   `versioned-signoff:polaris-selftest-addition` block, which the selftest
   appends at the end of `ACCEPTANCE-ACT-RECORD.md`. At `0bc07cc4` that file
   ends in `/versioned-signoff:three-surface-poc-governedby-reference-amendment:v1.0 -->`;
   at `5ee1c1a1` it ends in `<!-- PWB-POLICY-SCOPE-V5:END -->`, which is the new
   fragment's prefix. So the row follows the tree's tail; predicate (`R1`) and
   outcome (`killed`) are unchanged. [Inferred: that no checker behaviour
   moved, from the identical blob.]
6. No governed file is touched. [Observed] `git diff --name-only
   origin/main...pr665` lists three paths, all under
   `docs/evidence/spec-readability-reconciliation-2026-10-02/`. Nothing under
   `.syzygy/` or `openspec/`.
7. Rule 10 holds. [Observed] No tracked file at `origin/main` cites the sha256
   of the old README or of the old witnesses (`git grep -F` over each full
   digest returns nothing), and no script, workflow, `.syzygy/` or `openspec/`
   file names `selftest-witnesses`. No binding is retired. The old bytes stay
   verbatim in the first-run file.
8. Rule 11 holds. [Observed] The new JSON names its subject commit and script
   path; the README names the checker blob. The first-run file keeps its own
   `commit` field. The README note is dated and marks the superseded sentence
   in place with the earlier text quoted, as the notes-to-self require.

## Observations (none blocks)

- N-a. The JSON names the checker by path and commit, not by blob digest; the
  blob appears only in the README. It is derivable from the commit, so rule 11
  is met; naming it in the JSON would change the witnesses' bytes and is the
  skipped N-class work.
- N-b. `0bc07cc4` still exists as an object in this clone but is reachable from
  no ref; the first-run file names it as history, which is its stated purpose.
- N-c. Skipping N1 and N2 is sound: changing checker messages would change the
  checker blob and retire every witness.

## Verdict

CONFIRM. All seven claims reproduce; no finding.
