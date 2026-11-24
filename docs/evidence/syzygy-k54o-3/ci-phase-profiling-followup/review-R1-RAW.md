# Independent source review of CI placement and selftest profiling proposals
Reviewed commit: 88e122e108e66418196f24d471417bd19cf6dd96
Subject: two frozen proposal patches and their binding JSON files, identified below
Verdict: REVISE

[Inferred] The placement proposal passes source review. The profiling proposal needs one repair to meet its explicit result/exception preservation criterion. This verdict concerns source only, not execution, adoption, merge readiness, or the seven-minute CI budget.

Reviewed bytes

- Placement patch SHA-256: `4eb15a4ef1f36607e1d0c5a164f5f02f2ffa96d1342f48fedd36ecbd37a311e5`.
- Placement binding SHA-256: `1797ddf8a61d1c304a090484ecebc467e2b47085adf8781b2e56a0eca4e3c66a`.
- Profiling patch SHA-256: `4b1636280a7d6b5580587256a2f783037bf4aebb9d54e0d8862a0c529729971d`.
- Profiling binding SHA-256: `dee2f6898a42ff9dc2e5e9555c5f330e64f18ccc8c6c0e4f431ecc34788e8f0e`.
- Hosted summary SHA-256: `e41abb9e5a5ddee6c4af4618fcb5b6609b9d4e19b464a69f21e68562d75a3e13`.

[Observed] The files above are under `/home/orca/.tmp/f3-native-admission-fixes/hosted-88e122e/`. Their hashes were independently recomputed. The reviewed worktree HEAD is the commit named above. Its pre-existing modifications to `packages/polaris-dossier/src/url-machine-peer.test.ts` and `packages/polaris-dossier/src/url-run-composed.test.ts` are outside this review. The reviewed proposal source files match their supplied source digests. Proposed file digests were independently reconstructed in memory:

- `.github/workflows/governance-docs.yml`: `1c78c31b9c8559378a550cb0501ad46cb1bc52c894ee1a46cf9cf173053a7f99`.
- `CONTRIBUTING.md`: `12252cd5ea432b24acaa29bfd45500b24dfaff09f755a464f63c847e65a93a14`.
- `scripts/check_spec_reconciliation.py`: `a9673d42d17536738a80abd94f4868f7d1a848f156fe09007196be46fb6b5a76`.

Governing references and acceptance criteria

[Observed] Read repository AGENTS.md, the canonical th-engineering router and ci-discipline subskill, heart-and-soul routing, trust-and-evidence.md, CC-PERF-1/2/3, and testing-and-verification.md. CI Discipline requires evidence reuse on the same tree and balancing the critical path before condensing coverage. CONTRIBUTING.md, CI time budget, requires retained job durations when relocating checks. CC-PERF-3 says, "Perf work without before/after evidence is unverified work." The review brief additionally requires unchanged commands, fixtures, assertions, global-state and exception behavior; closed opt-in metadata; and no tests/build/install/push/commit in this session.

Finding F1 - profiling output can replace the wrapped result or exception

Severity: P2. Confidence: high. Location: proposed `scripts/check_spec_reconciliation.py:10162-10170`, `_profile_selftest_call` finally block; patch `proposed-reconciliation-profile.patch`, first helper hunk.

[Observed] The helper invokes `function(*args)` inside try and unconditionally constructs and prints flushed metadata to `sys.stderr` in finally when profiling is enabled. The print is not protected from output errors. The helper's docstring promises to preserve the result or exception.

[Inferred] With `SELFTEST_PROFILE=1`, a closed stderr stream produces ValueError and a failed output sink can produce OSError/BrokenPipeError at print or flush. Such an exception replaces either the function's pending return or its original exception. For an early setup/check call this can prevent the remaining unchanged fixtures from running. This contradicts the brief's exception-preservation acceptance criterion. This is a source-derived counterexample; it was not executed.

Proposed fix: make diagnostic clock/count construction and emission best-effort, preserving the wrapped call's return or exception when metadata emission fails. Keep the wrapped function outside the diagnostic-error handler so genuine selftest exceptions are never swallowed. When execution is authorized, verify a returning callable and a raising callable with an erroring stderr sink, in addition to default-disabled behavior. No change to assertions, fixture populations, deadlines, or worker policy is needed.

Placement assessment - PASS

[Observed] A source-only patch applicator checked every context line while reconstructing proposed bytes in memory. Independently counted workflow run lines before and after: 140 and 140, with identical strings and multiplicities. A second comparison found identical non-comment executable-line multisets and identical remaining executable-line order after removing only the moved v1.6 step. The patch adds that step after readability's existing selftest, preserving the aggregate required job, its complete needs list and result assertions, triggers, checkout configuration, Python version, timeouts, and native prerequisites. CONTRIBUTING.md is updated with the placement policy. No test coverage, assertions or test deadlines are changed.

[Observed] The destination already supplies full-history checkout and Python 3.11. Independent AST traversal reproduces the binding's 19 local import-statement modules and their digests; their external imports are standard-library modules. Inspected v1.6 selftest, its fixture construction, predecessor battery calls and git-apply scratch helper. Its fixture roots are temporary directories. Existing hosted git plus Python and checkout suffice for this relocation.

[Observed] Precision note: the 19-module binding is an import-statement closure, not an exhaustive dynamic-import closure. For example, `scripts/d10_supersession.py:31-36` dynamically loads `scripts/record_governance_simplification_d10.py`; that recorder was inspected and uses standard-library imports. This does not add a destination prerequisite or block relocation. Do not describe the 19-module list as proof of every possible dynamic import.

[Observed] The retained hosted summary identifies subject commit 88e122e108e66418196f24d471417bd19cf6dd96 and run 45466219373, with governance 436 seconds, the moved selftest 67 seconds, readability 193 seconds and reconciliation 908 seconds. Its retained tested-merge identity reports matching branch/tested-merge trees. These are metadata observations, not a rerun or fresh certification of every hosted result.

[Inferred] Subtracting/adding the single measured step predicts governance 369 seconds and readability 260 seconds. Those arithmetic estimates remain explicitly inferred in the binding/recommendation. [Unknown] Actual durations after relocation and seven-minute time-to-green: the proposed arrangement has not run, and reconciliation independently exceeds 420 seconds in the retained run.

Profiling assessment aside from F1

[Observed] Independently parsed original and proposed ASTs. Removing only the new time import/helper and mechanically replacing each profiling call with its original function and positional arguments yields an AST identical to the original, without location attributes. This covers the whole source file, including fixtures, predicates, call order, global-state restoration, cache scopes, prefix-worker handling, final controls, witness construction and CLI branches. No additional worker pool or parallelization is proposed.

[Observed] The disabled branch returns directly before clock sampling or metadata emission unless SELFTEST_PROFILE equals literal 1. Added emitted data is restricted to internal phase labels, monotonic elapsed milliseconds, returned/raised outcome, and witness-count deltas. Fixed phase labels and the edition loop's known internal function names do not include arguments, source text, error messages, paths or witness bodies. The original selftest's own existing output is unchanged by the patch. The canonical workflow --selftest command remains unchanged and does not enable profiling.

[Inferred] AST equivalence after unwrapping establishes preservation of the original program text, but cannot establish transparency of the newly inserted helper; F1 is precisely a new helper behavior outside that equivalence.

Verification boundary

[Observed] Performed file reads, digest calculations, static import/call inspection, in-memory patch reconstruction and AST comparison only. No project module import, test, selftest, build, installation, commit or push was performed. Neither repository files nor proposal files were edited. This raw is newly created outside the repository. [Unknown] Runtime correctness and performance of proposed bytes remain unverified.
