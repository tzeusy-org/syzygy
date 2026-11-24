PASS

Independent source review of the frozen CI split

Subject base commit: 0f207ac34637db46ebe848be307931b5c559f90c
Patch SHA-256: 31b1fcae798a0e0af647de12ae784f077fd78a8b54e31f41e800bc9b4ced31ae
Freeze record: /home/orca/.tmp/f3-native-admission-fixes/ci-split-review-freeze.json

Reviewed exact file SHA-256 values:
- .github/workflows/node-ci.yml: 8bfaf1f607e8d25a26ca9be63861834e8c011e8beb8ae0397a3f5285e3f7808a
- scripts/run_integration_lane.mjs: abb7ead193281304676f96f5bb3909e589392de37a3617efe96508c8de514380
- CONTRIBUTING.md: 5095009d5ebdea2024efd70318f85c4753bf520e2a0d21c16c48adb6ca4bd2f8

[Inferred] No material finding in the three-file patch against the supplied acceptance criteria. This verdict judges source correctness and routing preservation; it does not certify test execution or hosted duration.

[Observed] The runner's --check completed successfully against actual Vitest discovery and actual per-lane selectors:

    integration routing: 140 files; 7 composed cases; core slices 46+46+47; 7 lanes

This exercises the full integration file discovery, the composed-case discovery, and each generated command's file or test-name selection. A separate Python census of INTEGRATION_TESTS found 140 files, one composed file, and 139 non-composed files partitioned into 46/46/47 with equal multiplicities. Source inspection of url-run-composed.test.ts identifies the three bounded observer cases and four native scenarios. The population comparison at scripts/run_integration_lane.mjs:39–57 checks exact file multiplicity, exact workflow/routing lane names, composed command counts, exact native case identities, three observer matches, and the complete composed-case multiset. An unrouted composed case cannot silently disappear.

[Observed] `node --check scripts/run_integration_lane.mjs` and `git diff --check` passed. `node scripts/run_integration_lane.mjs --selftest` emitted:

    integration routing selftest: control + 14 rejected mutations

The fixtures reject omitted/duplicated files, observer/native selections and matrix cells, a new unrouted case, missing/extra receipts, a foreign commit receipt, matrix exclusions, and fail-fast. The permitted discovery check emitted a MODULE_TYPELESS_PACKAGE_JSON warning for vitest.tiers.ts and exited successfully.

[Inferred] The receipt path is fail closed: lane commands and TMPDIR controls must succeed before `wx` writes the receipt (runner:147–153); artifact upload requires a file; the aggregate requires successful unit/integration/e2e results and checks exactly seven receipt filenames with exact lane and GITHUB_SHA contents (runner:93–96; workflow:278–311). A skipped, missing, failed, cancelled, or foreign-commit lane cannot satisfy the reviewed aggregate path. Artifact download is scoped to the current workflow run by its default invocation.

[Observed] An independent parsed-YAML comparison with the base confirms preserved triggers, concurrency, permissions, execution platforms/dependencies, the complete integration prerequisite step sequence, and the e2e job. The matrix has exactly three core and four native lanes, with fail-fast disabled. The required aggregate remains `node`. Its added checkout disables credential persistence. Native package/runtime pins, snapshot verification, SSH-listener safeguards, native CLI provisioning and prerequisite checks are unchanged. Package scripts and test files are outside this three-file delta; the local full integration command remains unchanged and is explicitly asserted by checkedPlan. No test assertions, runtime limits, case budgets, or test files were changed by this patch. Test-file growth: 0.

[Inferred] The split touches the evidence floor by changing how the hosted integration denominator is assembled; the reviewed exact-population checks and commit-bound receipts preserve that floor. No security-floor weakening appears in the three-file delta. CONTRIBUTING.md documents the new placement and leaves hosted timing to measurement.

[Unknown] Runtime results, hosted critical-path duration, and whether the seven-minute budget is met. No heavy tests, builds, installs, npm ci, pushes, repository edits, commits, or tracker mutations were performed for this review. The concurrent native recovery run was not touched.
