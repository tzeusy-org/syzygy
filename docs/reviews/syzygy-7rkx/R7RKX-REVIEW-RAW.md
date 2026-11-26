# Review: syzygy-7rkx / syzygy-0yit — reconciliation selftest per-run scope and family pool

Verdict: NOT READY
Reviewed commit: e16456299 (origin/agent/syzygy-0yit), diff `origin/main...e16456299`
Subject: scripts/check_spec_reconciliation.py sha256 dda3c14e0813a1b7a27b723d67441f67c826be71e4d5bb5fd9b3acffeb1ad4ea

Reviewer: fresh-context reviewer (r7rkx), 2026-11-27. Full selftest NOT run (as briefed).

## Summary

The change is sound for the verdicts it produces today. No family writes a
shared tree. Every global patch a family makes is restored or confined to the
family, and the witness and stdout pairs are byte-identical. Two things block
landing:

- A `SystemExit`, or a worker that dies, inside a family now hangs the
  selftest forever. Before this change it exited 1.
- The branch no longer merges with origin/main: there is a content conflict in
  the same file, and main has added a new serial family (`figplan_cases`). The
  evidence binds a commit that will not land.

## Criterion 1 — verdicts cannot change

[Observed] No family shares a tree with another.
- Every family copies its own tree under `tmp`. The 56 top-level tree names are
  pairwise distinct: the keys of ENTRY_KIND_CASES, ENTRY_CONTROLS and
  AFTER_REFUSAL_CASES, the FIFO control, the 31 literal family names,
  RAW_READ_CHANGE, TREEREAD_CHANGE, the two scripted names and the four selftest
  starts. They were checked by importing the module and counting duplicates
  (`[]`).
- An AST-scoped scan of the 37 family bodies found no write to `base`,
  `figure_base`, `added` or `adopted`. `poc_d10_cases` only reads `base`.

[Observed] Global writes are restored within their family, so fork isolation
discards nothing a later family read.
- `poc_d10_cases` (8571) saves and restores `_FILES_OVERRIDE`, `_SIGNED_MEMO`
  and `d10_supersession.amendment` in `finally`.
- `term_brief_cases` (11328) uses `patch.object`.
- `_cli_exits` (12413) restores `ROOT` in `finally`.
- `declared_source_composition_cases` only reads `ROOT`.

[Observed] The parent's patches are still inherited by each fork, because the
families run inside `selftest()`'s try block: `ADOPTED_ADDITIONS[ADOPTED]` and
the `adopted_binding` override.

[Observed] Moving `figure_base` creation ahead of the first four families is
harmless. Those four copy `base` and do not write it.

[Observed] Memo granularity is unchanged.
- `scoped_check_outcomes` opens one scope per tree.
- The scope's keys are the same as run()'s: the resolved root, and the
  function plus the root.
- The bare callers mutate no tree within one call. In `_entry_kind_cases` the
  call raises, and the exception is not memoized.

[Observed] The `_REVERSE_CACHE` growth inside a fork is now discarded. This
costs speed only: the cache is keyed by the patch, target and body digests.

[Observed] `--check` passed: "7 of 7 predicates without FAIL; PASS".
`check_governance.py` passed: "22 OK, 17 WARN, 0 FAIL (39 checks)".

## Findings

1. **A `SystemExit` or a dead worker inside a family hangs the selftest with no
   timeout** — `scripts/check_spec_reconciliation.py:12143-12145` and
   `:12170-12174`. Severity: high (blocking).
   - [Observed] Probe `/home/orca/.tmp/r7rkx/probe.py`: `_run_families([ok,
     exit_, ok])`, where `exit_` calls `sys.exit("census refused: x")`.
     - With `SELFTEST_WORKERS=2` it was killed by `timeout 25` (exit 124).
     - With `SELFTEST_WORKERS=1` it exits 1.
     - A plain `ValueError` propagates correctly (exit 1, traceback).
   - [Observed] The cause: `multiprocessing.pool.worker` catches only
     `Exception`. A `BaseException` kills the worker, and `pool.map` then waits
     for a result that never arrives. A worker killed by OOM hangs the same way.
   - [Inferred] It is reachable. `_cli_exits` (`_entry_kind_cases`,
     `_fifo_control`) calls `main(["--regenerate"])` in-process. `main` does not
     catch `regenerate`'s `SystemExit("census refused…")` (12678, 12721). A
     regression that makes that census refuse would have printed the refusal and
     exited 1 under the old serial code; it now hangs.
   - [Observed] `_map_cases` has the same exposure. It predates this change, but
     the change moves roughly 520 s of in-parent work behind it.
   - Repair:
     - In `_run_family`, catch `BaseException` around the family call.
       Re-raise it as a `RuntimeError` naming the family index, or return it as
       a failure so the selftest prints `SELFTEST FAIL`.
     - Use `pool.map_async(...).get(timeout=...)` with a generous bound, so a
       dead worker fails instead of hanging.
     - Add a harness control for both.

2. **The branch conflicts with origin/main, which added a new serial family;
   the evidence binds a commit that will not land** — origin/main `4b86e4285`.
   Severity: high (blocking for landing).
   - [Observed] `git merge-tree --write-tree e16456299 origin/main` reports
     `CONFLICT (content): Merge conflict in scripts/check_spec_reconciliation.py`.
   - [Observed] Main now has `def figplan_cases(tmp, base, witnesses,
     failures)` (main:11241). It is called serially at main:12270, which is
     outside any `families` list.
   - [Observed] The paired and mutation records bind `c9da8e56b` (file sha
     `dda3c14…`). The subject file at e16456299 has the same sha, but the inputs
     merged from main differ. The landed file will be a third file (rule 7, rule
     10).
   - Repair:
     - Merge main.
     - Put `figplan_cases` into the `families` list at main's position: after
       the term-brief group, as `functools.partial(case, tmp, base)`. Check its
       tree name is distinct.
     - Re-run the `full` pair and the rule-6 run at the merged head, and record
       them.

3. **No check that runs guards the new failure and scope properties; both
   reviewer mutants survive** — `docs/evidence/syzygy-7rkx/scope_family_harness.py`.
   Severity: medium.
   - [Observed] Mutant A, family exception swallowed.
     - old: `        _FAMILY_STATE[index](found, failed)\n`
     - new: `        try:\n            _FAMILY_STATE[index](found, failed)\n        except Exception:\n            pass\n`
     - Harness: `HARNESS PASS: 4 of 4 controls held` → **SURVIVED**.
   - [Observed] Mutant B, scope not entered in run().
     - old: `    report = Report()\n    with _run_scope():\n        check_outcomes(root, report)\n        pop = check_census(root, report)`
     - new: the same with `contextlib.nullcontext()` in place of `_run_scope()`.
     - Harness: PASS → **SURVIVED**.
   - Both mutants ran on scratch copies of `scripts/`, under the subject sha
     above. The runner is `/home/orca/.tmp/r7rkx/mut.py`.
   - [Inferred] The full selftest would not kill either mutant.
     - A: no family raises on the clean path, so the selftest still passes. If a
       family did raise, the record would silently drop its witnesses and still
       print PASS, over fewer mutants.
     - B: the memo only affects speed.
   - [Observed] The harness is cited by nothing outside
     `docs/evidence/syzygy-7rkx/` (`git grep -lF scope_family_harness`, 0
     hits). Its four controls are evidence only, so a later edit to
     `_run_families` or `_run_scope` is guarded by nothing that runs.
   - Repair:
     - Add controls for "a raising family fails `_run_families`" (also kills
       mutant A) and for "run() enters the scope". For the second, count
       `is_signed` calls under a stub, as `measure_scope.py` does.
     - Wire the harness into the selftest or a hermetic test tier.

4. **The 30-second collection child in `_after_refusal_cases` now shares the
   CPU with three other families** — `:12590-12600`. Severity: low.
   - [Inferred] Before the change it ran in the parent after the case pool
     drained.
   - Under load, a slow child reads as "collection opened the entry and
     blocked", which is a spurious SURVIVED. That fails closed but is flaky.
   - Repair: note the bound in the families comment, or raise the timeout.

5. **`_run_scope` is not reentrant** — `:6671-6691`. Severity: low.
   - [Observed] A nested entry replaces the outer memos with `{}`, and its exit
     sets them to `None` while the outer scope is still active.
   - [Inferred] Today nothing nests. If something did, it would only go slower
     (fail-safe), but the docstring's "each entry starts empty" hides it.
   - Repair: add `assert _SIGNED_MEMO is None and _RUN_MEMO is None` on entry.

6. **At one worker the "fresh fork" claim does not hold** — `:12141-12142`,
   `_run_families` docstring. Severity: low.
   - [Observed] With `SELFTEST_WORKERS=1`, or without `fork`, the families run
     in-process in sequence, so state can leak between them (as before the
     change).
   - Repair: say so in the `_fork_map` and `_run_families` docstrings, or run
     the serial path with each family's globals snapshotted.

7. **The evidence is re-checkable, with small gaps** — `docs/evidence/syzygy-7rkx/`.
   Severity: low.
   - [Observed] Each pair names its commit, before-ref, file sha, witness sha,
     stdout sha, exit, wall and load. The mutation record names the commit and
     subject sha and stores each mutant's old/new fragments. The pair method is
     sound: one checkout with HEAD unchanged and only the one file swapped, so
     both witnesses carry the same commit.
   - Gaps:
     - The witness files are kept only as digests.
     - `paired_selftest.sh` says "Usage: pair7.sh" and hard-codes
       `/home/orca/.tmp/7rkx` and the main checkout path.
     - The mutation record ran without `--selftest` (`withSelftest: false`), so
       "4 of 4" means killed by the synthetic harness only.
     - The 230 s figure is one sample at load ~4.2 on a shared host.
   - Repair:
     - Fix the usage line.
     - Parameterise the paths.
     - State in the record that the kills are harness-only.

8. **Readability is good, with one comment to sharpen** — `:12032-12056`.
   Severity: note.
   - [Observed] `_fork_map`, `_run_families` and `_run_family` are small and
     mirror `_map_cases` / `_CASE_STATE`.
   - Mixing lambdas with `functools.partial` is fine.
   - The families comment says each family "reads them only". That holds
     (`poc_d10_cases` reads `base` in place), but it is the invariant finding 2
     depends on. Name it as a rule for new families, together with "a distinct
     top-level tree name".

## Criteria results

- C1 verdicts: holds at the subject (above).
- C2 failure propagation:
  - `Exception`: propagates.
  - `BaseException` or a dead worker: hangs (F1).
  - No timeout.
  - Serial path: exits correctly.
- C3 order and capture:
  - [Observed] The order matches the old serial order exactly: first four,
    historical-034 group, edit/poc, base group, scripted, step, qkind.
  - SKIPPED lines are captured per family and re-emitted in place.
  - A probe with a pending parent print showed no duplicate flush from the
    forks.
  - Byte-identical stdout in all three pairs [Observed: record].
- C4 evidence: re-checkable, with F7's gaps; stale against main (F2).
- C5 own mutants: 0 of 2 killed by the harness (F3).
- C6 `--check` PASS; governance 0 FAIL.
- C7 craft: F5, F6, F8.
