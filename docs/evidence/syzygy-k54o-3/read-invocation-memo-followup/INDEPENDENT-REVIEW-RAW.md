# Invocation-local read memo source review
Verdict: PASS
Subject SHA-256: 65ab0c346b962ebe62bac592271181161d877aaaba5fe13e9e09f38c55f6ef51
Manifest SHA-256: 1610b3f5bfc2742ea062a4cd5d14cc82cc75c563173ec16bae83ecb211c6afef

[Observed] Reviewed subject: `/home/orca/.tmp/f3-native-admission-fixes/census-memo-a303/check_spec_reconciliation.py`. Patch SHA-256: a622c694b628d7b0a8bc125c6a8b1b25d5c00c061d2162e9ab79df8e2f4f40f4. Base commit: a303bc56e86f65e252aa13663827d46bdcc104f2. Base source SHA-256: b0886d00ab1d17251a9bc0b0fc7cfa0485125a1d0b9768c0fab38fe90eb0dd67. The base source equals `git show` at that commit in the designated external checkout. All eleven manifest-listed files were individually hashed in this review and match their manifest entries. The review applies only to these frozen bytes.

[Inferred] PASS is a source-review verdict for factoring and extending the existing read-only memo lifetime. It is not a claim that the actual candidate checker passed, improved performance, or meets a hosted time limit. No candidate project module, real checker consumer, build, full selftest, or canonical battery was executed during this review. No primary or candidate source was edited.

Governing criteria

[Observed] CC-PERF-2 states: “When correctness of a cached answer is in doubt, the system recomputes or renders Unknown; it never serves a doubtful cached value as current.” CC-PERF-3 states: “Perf work without before/after evidence is unverified work.” The review also applies engineering-bar biases 2, 5 and 8: simple readable implementation, explicit control flow and risk-scaled verification. Policy source: `.syzygy/governance/policies/craft-and-care/performance-and-visual-discipline.md`, clauses CC-PERF-2 and CC-PERF-3.

Source findings

[Inferred] No actionable source defect identified within the requested scope. The helper at candidate lines 3100–3116 owns fresh dictionaries only when `_RUN_MEMO` is absent; a nested call yields without resetting or restoring the enclosing owner's state. The outer `finally` restores the precise prior signed/run memo objects and D10 function. Setup is inside the protected `try`; an exception from `_per_run` restores the prior state. Import and original-function lookup occur before changing the globals.

[Inferred] Decorator creation is safe before `_RUN_MEMO`, `_SIGNED_MEMO` and `_per_run` are defined: the generator body executes on context entry, after module initialization. `ContextDecorator` creates a fresh context manager per decorated call. The run decorator order keeps the reverse-cache scope outside the read memo. Nested `run`, `check_outcomes`, `check_census` and `census` calls reuse the active read dictionaries and D10 wrapper. `check_census` retains its scope for the work after its nested `census` returns.

[Observed] `_per_run` is unchanged: it bypasses reads and writes with `_FILES_OVERRIDE`, extra positional arguments or keyword arguments; keys by function module/name and resolved root; deep-copies results on every return; and does not insert a binding result when the binding raises. `reference_signed` is unchanged. The new decorators do not catch or translate the fixture's native exception.

[Inferred] The scope boundary discards its owned memo before control returns to a fixture caller. The canonical selftest invokes fixture mutation between reader calls, rather than inside these decorated read entry points. The outer selftest owns only the separate reverse cache. Its `_map_cases` at candidate lines 10665–10673 uses `multiprocessing.get_context("fork").Pool`, or a serial fallback. Prefix, entry and edition workers operate in separate processes, with each read scope ending before the worker moves to the next mutation. The one thread class in the module, `_FifoWriter`, only opens/writes/closes FIFO descriptors and does not invoke a checker or change memo globals. Thus the actual parallel selftest path does not introduce concurrent access to these process globals. This is not a thread-safety guarantee for hypothetical concurrent library callers; the factored policy remains process-global.

[Observed] The supplied static verifier ran and reported 253 unchanged old functions excluding `run`, preserved run check order, four measured original consumers and one invocation per consumer. Independently, this review compared the complete old/new module ASTs after removing only the helper and its three new decorators and replacing the refactored `run` with its predecessor node. Equality held across the complete remaining AST, including module constants, classes, fixtures, assertions, CLI options, skip metadata and witness joins. The supplied generated patch was checked against the full old/new bytes. Together these checks preserve the canonical fixture bodies and declared population and show no normative predicate weakening in the source delta.

[Observed] Read-only re-execution of the extracted-helper harness passed its 16 synthetic checks; its output-writing main block was excluded. The three specified source mutants were independently re-executed and killed: deleting the nested-owner guard, deleting override bypass, and retaining stale memo objects on return. Additional extracted-helper checks held for decoration before later globals are initialized and for nested propagation of the same OSError object with exact type and filename while preserving the owner's memo objects and D10 wrapper. These are source/helper checks, not actual checker proof.

Remaining verification

[Unknown] Candidate behavior in the real original-vs-candidate four-consumer comparison, complete canonical selftest success and full ordered witness parity, prefix-mutant effects, serial baseline, and hosted job/run performance. The retained original measurement does establish its four-consumer denominator and exact existing exception assertions; it does not establish candidate benefit. Preserve those Unknowns until the planned real execution artifacts exist.
