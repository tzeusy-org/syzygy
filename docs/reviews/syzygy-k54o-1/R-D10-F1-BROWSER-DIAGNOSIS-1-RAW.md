# CDP queue milestone timeout diagnosis — raw bounded finding

[Observed] Subject: reviewed commit 3c31e749897416c68179734d6980e25332570d96, tree 1c12e9c04fd26dbe7df4601fe30576a3e9335f2e; predecessor 26b2ef360431ab71c02dcde47643665dc153b8c7. Queue b2f9082dd392ba934eb14e341e50cdbee762ee67 is not an available local Git object. Its tree equality is retained in d10-f1-queue-watch-result.json, not independently reconstructed from a fetched queue object here. subjects.json binds exact source blobs and raw CI logs by SHA-256; environment.json binds local browser executables/version strings. Captured source, standalone instrumentation, harness and per-sample raw stdout/stderr are retained alongside this report. No repository source/spec/test edits.

[Observed] Five source files are byte-identical between predecessor and reviewed head: cdp-browser.ts, cdp-browser.browser.test.ts, temporary-directory.ts, test-fixtures/browser-parent-death.py, scripts/poc_browser_lifetime.py. This eliminates a change in these files as an introduced startup regression. It does not eliminate environmental/input effects elsewhere.

[Observed] Queue failure is fixture line335 select(stdout,30), before any worker-directed SIGTERM. SIGTERM vs SIGKILL mode changes behavior only after ready. Worker ready follows launchBrowser, seven page-creation/enabling CDP requests, and Page.navigate/load event. Endpoint/request/event deadlines are each30s, starting later than the fixture deadline; WebSocket.open has no explicit own timeout. Parent can fail and recover the family before the worker emits a stage-specific30s error. runLifetimeScenario captures stdout but its failing exit assertion includes only stderr; structured recovery report is consequently hidden.

[Observed] CI logs use different browser patches: successful prequeue157.0.8103.78 versus failed queue157.0.8103.50. Local experiments use official CfT builds with matching version strings, not asserted byte identity with the CI google-chrome binary. Neither local version spontaneously reproduces the queue timeout in this bounded sample.

## Ranked hypotheses

HYPOTHESES.md was written before scratch instrumentation. H1 page/navigation stall: mechanism reproduced with injected delay, historical cause unproven. H2 cold startup/resource pressure: measured, not enough to reproduce select timeout. H3 stdout/handshake opacity: timeout masks stage and report, proven; a lost ready write was not observed. H4 baseline/head source regression: eliminated for the five compared files. H5 Chrome patch effect: not established by these negative local samples.

## Results

| Experiment | Samples | Full original successful-report assertions passed | Worker ready time range ms | Guardian exit codes |
| --- | --- | --- | --- | --- |
| chrome148-normal | 4 | 4 | [421.634, 1200.138] | [0, 0, 0, 0] |
| chrome157-50-delay-navigation | 2 | 0 | None | [] |
| chrome157-50-delay-navigation-page-only | 2 | 2 | [670.649, 684.437] | [0, 0] |
| chrome157-50-normal | 8 | 8 | [580.33, 2501.952] | [0, 0, 0, 0, 0, 0, 0, 0] |
| chrome157-50-same-core-eight | 2 | 0 | [4843.269, 5021.883] | [120, 120] |
| chrome157-78-normal | 4 | 4 | [451.761, 507.119] | [0, 0, 0, 0] |
| delayed-navigation | 2 | 0 | None | [] |
| delayed-navigation-launch-only | 2 | 2 | [312.275, 386.977] | [0, 0] |
| exact-base | 2 | 2 | [342.168, 389.877] | [0, 0] |
| exact-head | 2 | 2 | [243.47, 289.388] | [0, 0] |
| same-core-eight | 4 | 0 | [3278.628, 3474.096] | [120, 120, 120, 120] |
| tagged-normal | 4 | 4 | [337.559, 398.363] | [0, 0, 0, 0] |

[Observed] 38 samples total. Four injected-navigation samples fail with the same line335 assertion, two on Chrome120 and two on157.0.8103.50. The actual Page.navigate send alone is postponed40s; no browser code is replaced. The fixture30s timeout preempts the send/event30s diagnosis and completes recovery at31.2–31.3s. Same157 injection with worker retaining newPage but omitting navigate passes2/2 full original report assertions at ready671–684ms: exactly one real network-service helper, exactly one guardian with allowed exit0, independent /proc and ps after-censuses empty, decoy preserved and every refusal control unchanged. The omission means the injected method is never reached; this proves isolation from an unnecessary navigation dependency, not repair of a historically identified navigation stall.

[Observed] Eight same-core own CPU burners plus two private workers raise ready to3.28–3.47s on120 and4.84–5.02s on157.0.8103.50. None hits the30s select timeout. All six stressed cases instead report guardian exit120, so they FAIL the original full TS report assertions despite fixture exit0. Their own /proc and ps post/recovery family censuses are empty. This is a distinct stress/stdio/cleanup failure; its cause was not isolated in this bounded task and it must not be counted as a pass or attributed to the queue failure. Extra tagged stderr instrumentation may perturb this outcome.

[Observed] Every one of38 retained recovery reports has an empty own-family /proc census with denominator0 and independent ps family census empty. validate.py checks both, and all original TS report predicates for fixture exit0, enumerating guardian120 failures. No foreign-process signals. All harness sessions and CPU burners completed; tests were data: pages only.

## Narrow prevention and limits

[Inferred] Remove only the unnecessary navigate call from the death-worker fixture; retain newPage, ready protocol,30s fixture budget, real-helper non-vacuity check, guardian identity/status checks, SIGSTOP/SIGTERM/SIGKILL conditions, refusal controls, decoy and both census paths. The fixture asserts no document/DOM/navigation property. newPage still exercises an actual CDP connection and creates an active page; Chrome launches with about:blank. Preserve already-captured stdout in the failed fixture assertion alongside stderr so recovery/family evidence survives CI failure. The same injected stall has measured red→green for this narrow worker change on the failing browser version.

[Unknown] Actual historical queue stalled await; runner CPU/memory/process-pressure telemetry; CI browser executable digest; whether browser patch difference contributed; why stressed guardian exits120. Do not claim a transient runner deficit, a proven navigation bug, or repaired historical root cause. No timeout increase justified. Neither browser version has been shown universally reliable. Remaining launch/newPage stages can still fail or consume30s; retaining phase information would help a future occurrence.

[Inferred] Prevention routing: avoid unrelated setup dependencies in lifetime tests (test-rigor); retain emitted failure evidence deliberately (engineering-bar observability). The same-loop regression seam is the death-worker setup plus the unchanged real Python fixture, with one Page.navigate send delayed40s. Production resolver/browser/guardian semantics need no change for this narrow prevention. Root owns any implementation and verification.
