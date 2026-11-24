# Independent source review — CI placement and selftest profiling
Verdict: PASS
Subject SHA-256: 0a9b36f166e97c1496273f947afe664275f71379398bdced4745fc2268898591
Base commit: 7fa15c9e47b24c10a677e6fbfbc57f4c63cadd03

[Inferred] The frozen three-file proposal meets the supplied source-review acceptance criteria. No revision finding was identified in this scope. This verdict does not establish a passing canonical selftest, hosted CI success, or seven-minute timing success.

Subject and binding

[Observed] The reviewed proposal is the frozen `sources/` tree in `/home/orca/.tmp/f3-native-admission-fixes/hosted-88e122e/actual7fa-review-packet/`, compared with the named base objects in `/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w`. The subject digest above is SHA-256 of the UTF-8 lines below, sorted by relative path, each ending in LF:

5f6b95a12f2003a2b20f1fcffae00008b3331ce2729d0678832b829dd571f2b6  .github/workflows/governance-docs.yml
12252cd5ea432b24acaa29bfd45500b24dfaff09f755a464f63c847e65a93a14  CONTRIBUTING.md
b64c1338d9eec7770b626cb650e87082174326a1da623d0e7c05be40c6b0648f  scripts/check_spec_reconciliation.py

[Observed] The packet's `actual-owned.diff` SHA-256 is `8d0eb172ce348c8e0577762e75efa10e7771f4e0fa3d92de50bb0d496357804a`. Independently computed file hashes and byte lengths match all seven packet manifest entries. Python hashlib and the separate `sha256sum` command agree for the three source files. The review is bound to these bytes; subsequent edits retire it.

Review basis and method

[Observed] I read repository `AGENTS.md`, the heart-and-soul skill and the relevant trust-and-evidence doctrine, and the canonical th-engineering router, engineering-bar and ci-discipline instructions. The acceptance criteria are: move only the v1.6 signoff selftest into the existing readability job; preserve the run commands and required aggregate; preserve the reconciliation families, assertions and gates; make opt-in diagnostics preserve original outcomes despite clock/count/stderr exceptions; preserve CONTRIBUTING's F3/node prose and avoid claiming proven timing success. I independently read the actual diff and relevant source rather than relying on the packet's verification booleans or the prior review verdict.

Preservation results

[Observed] A complete-module AST comparison succeeds after removing only the new `time` import and `_profile_selftest_call` definition, and replacing every profiling call with its original function and positional arguments. This compares the full original module, including fixture bodies, assertions, control flow, call order, exception handling and final witness verdict, against the normalized proposal. The syntactic assertion count remains 70 in each module. The wrapper's added `witnesses=` argument is diagnostic metadata and is not forwarded to the original callable.

[Observed] The base and proposal edition loop each enumerate the same 19 families in the same order: `figure_cases`, `derived_cases`, `ledger_cases`, `kinds_cases`, `manifests_cases`, `repairs_cases`, `maps_cases`, `bounds_cases`, `corr_cases`, `coverage_cases`, `infra_cases`, `findpages_cases`, `subsec_cases`, `reltype_cases`, `hero_cases`, `readers_cases`, `cont_cases`, `model_cases`, `worth_cases`. This was checked by AST enumeration and direct inspection of the unchanged tuple in the diff/source (proposal script lines 10560–10563). The worthKnowing family remains represented by `worth_cases`; its definition is unchanged under the complete-module comparison.

[Observed] Independent line-based and job-block-based workflow enumerations each find 140 run entries before and after, with equal command multisets. The job counts change from governance 136/readability 1 to governance 135/readability 2; reconciliation 1, P115 1 and aggregate 1 remain. The sole command assignment change is `python3 scripts/build_polaris_dossier_local_agent_mode_v1_6.py --selftest`, from governance to readability-selftest. The required `checks` job is byte-identical, retaining its four prerequisites, `always()` condition and four explicit success assertions. Other workflow changes are explanatory comments and `SELFTEST_PROFILE: '1'` on the existing reconciliation selftest step.

Diagnostic outcome analysis

[Inferred] In `_profile_selftest_call` (script lines 10432–10458), the disabled path calls the original function directly. The enabled path catches ordinary clock/count exceptions before the call and falls back to that same direct call. The original function runs once and receives its original arguments. Its result is returned without transformation. Its raised exception is not caught by the wrapper. The `finally` block encloses the second clock read, witness delta, JSON construction, stderr write and flush in `try/except Exception`, so ordinary diagnostic failures cannot replace either return or raised exception. This addresses the reported unguarded-print failure mechanism. The handler does not swallow process-control BaseException signals such as KeyboardInterrupt or SystemExit; preservation here concerns diagnostic Exception failures, not overriding external interruption semantics.

Documentation and timing

[Observed] CONTRIBUTING's bytes outside the governance placement paragraph are unchanged, including the F3/native integration and node-ci prose. The amended paragraph describes four slow selftests across three jobs and explicitly says hosted durations must establish the resulting budget (lines 230–240). It states historical durations rather than claiming a measured improvement or seven-minute success. The workflow retains the 30-minute reconciliation timeout and historical slow-run comment.

[Unknown] Historical hosted duration claims were not independently re-fetched in this source-only review. Fresh hosted timing, full witness totals, full selftest outcomes and achievement of the seven-minute target remain Unknown. The proposal's explicit need for hosted measurement is consistent with that boundary.

Verification boundary

[Observed] Verification consisted of source reads, base-object reads, hashing, Python parsing/AST normalization and command/block inventories. I did not import or execute project modules, execute the helper, run canonical selftests, run npm/build/integration checks, stage or commit, or change proposal source files. The packet's inherited isolated-helper test report was not used as independent runtime evidence. Only this raw review artifact was created.

[Inferred] PASS is a source-review verdict for the frozen subject, with no blocking source finding. Runtime and timing validation remain outside this verdict.
