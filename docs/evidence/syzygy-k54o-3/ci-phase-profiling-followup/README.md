# CI placement and opt-in profiling follow-up

[Observed] Source commit `5d967d2626456d97ebf41065259fbd82910bab1e` moves only the v1.6 signoff selftest into the existing readability job. All 140 workflow run commands and the required aggregate are retained. Optional `SELFTEST_PROFILE=1` emits best-effort elapsed/outcome/witness counts for the original reconciliation phases; all 19 edition families including worth-knowing remain in the serial canonical check. Diagnostic clock/count/output failures preserve original results and exceptions.

[Observed] Independent R2 source review records `PASS`; R1 `REVISE` is retained verbatim. Python compilation and whitespace checks passed. The 16 synthetic helper results and an exact-source AST-only reproducer are retained; no full project selftest or measured timing success is claimed here.

[Unknown] Hosted seven-minute acceptance. At the predecessor, reconciliation took908 seconds and governance436 seconds. Moving the 67 second signoff step is a placement repair; reconciliation profiling supplies evidence for its subsequent parallelization.
