# Reconciliation selftest scope and family pool

## Patterns

- `syzygy-7rkx/R7RKX-REVIEW-RAW\.md`

## What was under review

[Observed] The change to `scripts/check_spec_reconciliation.py` on branch `agent/syzygy-0yit` (beads syzygy-0yit and syzygy-7rkx) at commit `e16456299`, bound by the subject digest in the raw's head: one per-run scope of memos shared by `run()` and the bare `check_outcomes` callers, and the selftest's serial case families run in fresh forked workers, merged in order. The evidence under `docs/evidence/syzygy-0yit/` and `docs/evidence/syzygy-7rkx/` was read with it. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `NOT READY` (`syzygy-7rkx/R7RKX-REVIEW-RAW.md:3`) with two blocking findings (F1, F2) and six others (F3 to F8). All eight were repaired on the same branch and none was overruled:

- F1: a family's `BaseException` becomes one failure naming the family, a pooled task's becomes a `RuntimeError` in the parent, and a lost result fails by `SELFTEST_TIMEOUT` (`PoolTimeout`).
- F2: origin/main merged, and its new `figplan_cases` runs as the last family.
- F3: the controls moved into `scripts/test_reconciliation_pool.py`, which the hosted workflow and the published battery run; both review mutants are among those its rule-6 record kills (`docs/evidence/syzygy-7rkx/pool_mutation.py`).
- F4: the collection child's bound is 120 s.
- F5: a nested `_run_scope` is refused.
- F6 and F8: the docstrings state the one-worker path, and the families comment states the rules for a new family.
- F7: `paired_selftest.sh` takes its paths as arguments, and the records say what killed each mutant.

No review has read the repaired bytes.
