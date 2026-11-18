# Read-only diagnostic review of census timeout E1
Diagnostic verdict: CONFIRM test-tier misplacement; timeout cause remains Unknown
E1 disposition: UNRESOLVED; prior overall REVISE remains
Subject: 80e409087f49dc413b3a57ebbfb9f83466ef82d8
Date: 2026-11-17 Asia/Singapore
Reviewer: OpenAI Codex /root/review_fnry17_guardian_integration

[Observed] This follow-up inspects the single failing census case, the default screen/act-reader call chain, the repository tier definitions/configuration, existing timing tools, and the two newly supplied diagnostic records. It does not amend fnry17-guardian-review-1-RAW.md, re-run the gate, author a fix, or change any source/git/Beads/PR/Orca state. This diagnostic raw is its only file write. The targeted worktree remains at the frozen subject with no tracked changes. I applied test-rigor and its suite-discipline reference in addition to the governing policies already read for the original review.

Finding D1 — integration work is selected as unit work

- Location: packages/polaris-dossier/src/census.test.ts:203-214; census.ts:107-108; screen.ts:113-115 and 216-226; packages/polaris-generation-consent/src/package-reader.ts:54, 89-100, 426-431, 490-492, 509-510, 524-526, 679-685; vitest.tiers.ts:6-17; vitest.config.ts:31-43.
- [Observed] The test injects the observed-target object listing and the visibility decision. It does not inject loadScreen. Its recordsRoot is the checkout's REAL_ROOT, and it awaits loadCensus twice for two placement commits. The default screen loader calls loadDossierScreen, whose policy-act and class-act readers use the real nodeFs adapter.
- [Observed] findActRecords recursively enumerates the local decisions tree and reads its files. walk uses asynchronous readdir on a directory and each child to distinguish files and directories, recursively visiting directories; each family then reads file text and applies its recognition/sweep rules. The policy chain and class-act reader each perform their own findActRecords call. On the successful path, the two screen loads therefore invoke four decisions-tree sweeps, plus policy/module reads and any citation-allowlist traversal those sweeps require. This is a source-derived call count, not a measured syscall count or exclusive performance profile. The frozen commit has 223 tracked paths under the decisions subtree; that count is not asserted to be the exact on-disk traversal population.
- [Observed] The test file also reads the checkout's policy bytes at module/describe setup (census.test.ts:14/178). The timed case deliberately validates default wiring to the real in-force policy and placement rules, rather than only a pure injected-screen transformation. Replacing it with an injected screen would remove that coverage; the neighboring loadCensus tests already cover injected-screen behavior.
- [Observed] vitest.tiers.ts defines integration as “git, a real tree, a local server, a python recorder or another child process”, and directs tests to the lowest tier that holds what they use. The actual gate and isolated diagnostic both select census.test.ts under unit. The unit process/socket guard does not detect this mismatch because filesystem reads and in-process parsing do not require a child process or socket.
- [Inferred, high confidence] This is a genuine tier-placement defect under the repository's real-tree criterion. Classification should follow dependencies and behavior, independent of whether the file happens to finish within 5000ms.

Smallest supported correction

[Inferred] Add packages/polaris-dossier/src/census.test.ts to the sorted INTEGRATION_TESTS list in vitest.tiers.ts, preserving its assertions, two placement cases and real default loader. Tiering is file-based, so the one list entry moves its 23 collected cases together. It adds/deletes no test and changes no product behavior. This is the smallest implementation delta supported by the current evidence. Extracting only the real-tree case into a new integration file is a larger optional organization change; it is not necessary to correct this misclassification. Do not mock away the default loader simply to retain unit placement.

[Inferred] Validate the changed selection through the existing tier partition/collection machinery and a scoped integration run of the unchanged file, retaining its timing and result. The complete required gate must then be assessed on the changed subject. This recommendation is for an implementation owner; I have made no correction.

What that correction does and does not establish

[Observed] fnry17-census-isolated-diagnostic-result.json identifies the same subject and a single-name unit selection in the proof clone. The Vitest JSON reports one passed case with duration 2350.371194ms and 22 skipped cases; exit is 0 and wall time is 8.536556968931109 seconds. The report's “9 passed suites” counts describe/suite groups, not nine test files or nine executed cases. Its sole testResults file is census.test.ts.

[Observed] The earlier full gate timed this case out at 5000ms under the complete 188-file unit selection. The recorded failure is a time bound, not an assertion-value mismatch. The isolated diagnostic supplies neither load measurements nor stage-level timings for filesystem I/O, parsing, regex recognition or worker scheduling.

[Inferred] These observations are consistent with suite-load sensitivity and expensive real-tree reads. They do not identify the dominant cost or prove that concurrency caused the original timeout. A source trace of repeated sweeps is a plausible mechanism, not a measured allocation of the 5000ms.

[Observed] vitest.config.ts applies maxWorkers='50%' at the root for every project; the integration project does not select a smaller worker count. Moving the file removes it from the unit cohort but keeps its default test timeout and real work. The integration cohort can also run concurrently and contend for CPU or filesystem resources.

[Inferred] Reclassification resolves D1, the tier mismatch. It does not, by itself, repair the reader's cost or demonstrate that E1's timing failure cannot recur. It changes the cohort/exposure. I cannot confirm it as a complete root-cause correction to E1 before changed-subject evidence under the intended tier and required gate exists. A passing isolated or later unchanged run does not retrospectively make the recorded full-gate failure pass, and I grant no CC-TEST-4 infrastructure exception.

Existing timing tools and their limits

- [Observed] scripts/measure_vitest_test_durations.py records per-test durations, subject/file identities, exit status and sampled load. Its alone mode measures the whole selected file; full mode runs every project. It raises the default timeout to 600000ms to obtain uncensored durations, so its success is diagnostic evidence, not proof that the normal 5000ms gate passes. Full mode would be another broad run; it was not executed or prescribed as part of this read-only follow-up.
- [Observed] scripts/size_vitest_test_timeouts.py derives explicit per-test timeout candidates from retained measurements, treating a failed duration as a lower bound. Its rule uses worst measured duration x3, rounded to 5000ms steps above a 2500ms threshold. It requires collected-file coverage and a measurement record for every collected test when checking. The single selected-case JSON here is not that complete denominator, and no load readings accompany it. Its rule is labeled evidence tooling, not authority.
- [Observed] scripts/timeout_census.mjs inventories timeout sites/reasons and performs a second-method census. It does not diagnose this execution's slow stage.
- [Observed] scripts/measure_consent_gate_recognition.mjs and differential_line_slot.mjs contain finer reader timing instrumentation for their own characterization workloads. Those workloads include synthetic altered records and worker pools; their timings cannot be assigned to this uninstrumented census run. I did not execute them.
- [Inferred] If timing still fails after correct tier placement, obtain bounded stage timings for this unchanged loader path under the actual failing cohort before selecting a reader optimization or evidence-sized test timeout. Avoid cache/reader rewrites or global concurrency changes without evidence: this reader's complete-tree refusal semantics must remain intact. A timeout budget may be justified by measured legitimate cost, but it is a test-budget decision and does not optimize the product reader.

Conclusion and limits

[Inferred] Confirm the integration classification and recommend the single sorted-list entry as the smallest correction. The evidence supports a classification fix and a plausible performance mechanism, not a proven complete cause/fix for the timeout. E1 remains unresolved and the original REVISE verdict remains unchanged. No wider suite health, guardian pass, infrastructure fault, merge readiness or product completion is established by this diagnostic.

Evidence identities (SHA-256)

- fnry17-census-isolated-diagnostic-result.json: 50a12c42d424d322f9288e538892d81f26987aa5ab5e6ff68914a39929ecc120
- fnry17-census-isolated-diagnostic-vitest.json: c6083e76a69204bda5dd5e309be840e9ae030cd55294ebee8602d34354987aea
- packages/polaris-dossier/src/census.test.ts: 0b8a8f5d92a0d5502676aa08dab5b0b7c9becfc9c2360731cc29fe8a8920daca
- packages/polaris-dossier/src/census.ts: decf2e9c19adc725ce68c006f0dcd44a46f5ab6265e3d637feabdefd8d6fa16a
- packages/polaris-dossier/src/screen.ts: 07ac33d257355c78d6f706f798aa9d68f97b481f68c8289ea7be1dc4079fbab8
- packages/polaris-generation-consent/src/package-reader.ts: 2ea9e08bfa20524b2dc4732025202ff17b0b5c985ce0f40c816d6ee2d023009c
- vitest.tiers.ts: 9a5acc3c10f3d99698e3dbebac70f9c730f12aa9d3c51547d503a7883e5a009a
- vitest.config.ts: 3b677756d41400ea04e50816c4b834d07a96593bef097b67c7d1934d5ca9de22

Supplemental diagnostic evidence received before issuing this raw

[Observed] I also inspected fnry17-census-act-boundary-diagnostic.json, its entry script, fnry17-census-controlled-delay-diagnostic.json, its entry script and the delayed-filesystem shim in bundle-v2, and the provenance record. These are bounded synthetic diagnostics against the same frozen source, not another gate. The earlier CommonJS bundle setup failure is retained separately and supplies no predicate evidence.

[Observed] The boundary diagnostic performs two policy/class reader pairs with the normal asynchronous adapter, then with an asynchronous wrapper over synchronous filesystem calls. Each mode records 904 readdir and 896 readFile calls (1800 operations), with every boundary state ok. Wall times are 1552.18408ms and 1012.987014ms respectively. This supports the existence of repeated real traversal and mixed I/O/parsing cost. It neither attributes the historical timeout nor justifies switching the production reader to synchronous I/O.

[Observed] The controlled-delay entry reproduces the actual loadCensus inputs, synthetic seven-entry listing and injected public visibility decision used by the original test. The inspected bundle shim adds a 3ms await before each package-reader filesystem operation and forwards the same arguments to node:fs/promises. The captured trial scenario reports 900 calls and 3744.121449ms; the other placement reports 900 calls and 3899.495474ms. Both load successfully with the exact expected policy version and placement membership arrays. Recomputed combined time is 7643.616923ms, above 5000ms, while each individual duration is below 5000ms. This is a reproducible counterexample to the combined-case time budget under the stated synthetic delay, not a Vitest gate result or proof that historical filesystem calls each cost 3ms. The original failure has no such historical operation-latency trace.

[Inferred] The proposed narrower repair has sound structural and timing merits: move only the real-default-loader case to an integration test, and express trial/other as two named parameterized cases retaining the same version and membership expectations for each placement. The two placements have independent input/output expectations and no cross-scenario invariant, so each having its own normal timeout is a legitimate scenario boundary rather than skipping work or raising a timeout. This preserves the nearest pure census tests in unit and removes two full real-tree loads from one shared timeout budget. It yields net +1 executable case (one old combined case becomes two), net unchanged assertion/placement coverage, and one new integration file; the change record should state that delta. It is more source editing than the one-list-entry option above, but is the smallest correction that addresses both the tier mismatch and the now-demonstrated shared-budget flaw while leaving production behavior untouched.

[Inferred] Refined bounded recommendation: prefer that focused extraction and parameterization over moving all 23 cases if maintaining the fast unit cohort is the intended scope. Register the new integration file in the sorted tier list; keep both scenarios real, with the exact same default-loader inputs and literal expectations, and avoid a helper that accidentally preloads/caches the screen. Verify the controlled-delay scenario against the split form and verify collection, targeted integration behavior and the exact changed subject's required gate. No new production cache, sync-adapter change, timeout increase or global concurrency adjustment is supported or necessary on this evidence.

[Inferred] This would correct the proven test structure: wrong tier plus two independent expensive scenarios sharing one case budget. It does not reduce the aggregate reader work and does not guarantee one scenario always completes below 5000ms in a concurrent integration run. The controlled counterexample establishes why this structure can time out while each scenario succeeds; it does not establish that this was the exclusive cause of the historical gate failure. E1 remains unresolved until the implementation and changed-subject evidence are reviewed. No infrastructure waiver is granted.

Additional evidence identities (SHA-256)

- fnry17-census-act-boundary-diagnostic.json: 7381d27c8e51698e30c616985b158f6b87702af0a98432c31192f3bc7eb262a8
- fnry17-census-act-boundary-diagnostic-entry.mjs: e4bc123a2b03aa4420ff61f9c111e3ff0169a335d5af598929298005fd2b5e22
- fnry17-census-controlled-delay-diagnostic.json: b52244b83f042778ab468ffda3f9dd14e68af1a1ebd26e1df2c97f395b25f41c
- fnry17-census-controlled-delay-entry.mjs: 9fdbd6b238e3bc0d544b49278749b26a8b1df33b856c9bb99905ab2eb5065246
- fnry17-census-controlled-delay-bundle-v2.mjs: 14d3626e11b0bec0b39e02468058c204ded8eccefbdd968f9f6f64cef526438d
