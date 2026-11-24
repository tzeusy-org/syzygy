# Independent frozen source review
Verdict: PASS
Base commit: aac89d9fcf1a275974d12e7573173a1617bff455
Patch SHA-256: 070a4300ddb6fbd204f516744d11192293b214b38d6cebc58ff84943ad1f8c09

Review scope: the frozen two-file eligible-source-budget packet only. This is an independent source review, not adoption or a native performance result.

## Bound subjects

- `packages/polaris-dossier/src/url-origin-ledger.ts`: `3098b2580c67a191a5ce587535b15f8cd349c468f75d37e28c28ae0d5d1262d0` (base SHA-256 `0d7cd92825aea17f91b1642816f4f8ae892e19acd3de8faea6236c31d1f80a5c`).
- `packages/polaris-dossier/src/url-origin-ledger.test.ts`: `143c202cfe2aa5d7bb5ff4af2a3c3ae9f08d0ff365115f8a8bc86face96d7304` (base SHA-256 `2d116b39ab1e1cca5ac210dba06c15ba8ef23c0ba7196a88a58a13596dfceb2c`).

- `review.json` SHA-256: `5eb7443ff058bee42ccee8130a13fb0f680f9933a0deb1107724bbd5e6db4363`.
- `verification.json` SHA-256: `20ed636f16aaf2f54540df27d20f369d9f33d480eb713351d40891ba72146622`.

[Observed] Scripted hashes match the two frozen subjects, the manifest's base blobs retrieved with `git show` from the named base, and its patch digest. The five raw-log digests named by verification.json were independently recomputed and match. No primary source, index or commit was changed by this review.

## Governing constraints

[Observed] VIS-4 permits agents to adopt behavior-changing fixes and requires the adoption row naming the change, reason, commit and revert command. This review makes no adoption claim; the parent task owns that record.

[Observed] SEC-5 states: "classification fails closed." RFC3-16(d), item 5 requires currentness "Before any protected data delivery, reply registration, tool/adapter effect or dependent forwarding"; item 6 requires "finite record/instance/client/parse/I/O/lock/output/wall bounds under the original run deadline" and states "Every source admission, complete request screening, provider declaration, no-observed-code-execution, secret fail-closed rule and owner class remains unchanged". These are the relevant security and boundedness predicates for the patch.

## Findings and reasoning

[Inferred] The source default is a finite 10,000ms bound (url-origin-ledger.ts:20). The existing validation at lines 77–80 still requires safe integers from 1 through the declared maximum, so explicit tighter limits remain honored and callers can now choose values through 10,000. This deliberately admits a longer read, with the run's current-authority callback still responsible for the original deadline.

[Observed] The patch leaves sourceOperation's per-operation start, active flag, race timer, deadline comparison, and final cancellation unchanged (lines 256–265). verifiedSource retains private pre/post timer checks and admitted-only body treatment, followed by secret/body screening (279–294). In the base dependency url-source-reader.ts:67–75, the real read still calls check() before readBlobs and after the synchronous private screen; check() tests current authority plus captured clone/git/object-store identities (98–102). The changed test exercises that reader rather than replacing it.

[Inferred] The restore coalescing is safe within this scope. The fixed/renderer branch uses fresh live() at line 546, then only reads the private frozen history and private maps before lookup/sameSubject (547–551); there is no intervening await or supplied callback. sameSubject now takes the private Entry, preserving the same digest/byte/class/origin comparison. Source-span still calls entry at the original post-await comparison point (553–554). Source-whole retains inspectWholeSourceBody and entry at the original post-await point (556–559). Final waitForSamples plus transfer.revalidate remains at line 580. The removed duplicate authority call does not bridge an asynchronous or callback boundary.

[Inferred] The amended regression is meaningful: the default succeeds after the real reader's two 3,000ms simulated authority costs, while explicit 5,000ms rejects and leaves plannedOrigins unchanged (test lines 192–223). It asserts screening and a post-screen authority check occurred. The deadline counterexample now reaches the exact new 10,000ms boundary, and withdrawal during screening still refuses without publishing a plan (225–246). Existing exact-secret/store mismatch tests and late-I/O/concurrent-operation counterexample remain (177–189, 247–255, 390–418). Test population is 27 before and after, confirmed by independent regex and line-prefix counts: net test-case delta 0.

[Observed] Read retained clone logs: the integration invocation reports 27 passed of 27 in one file (3.62s duration, 983ms test time); typecheck reports tsc with no diagnostics. The one selected old-default mutation fails at the awaited sourceSpan in test line 214, with 1 selected failure and 26 skipped cases. This independently supports the regression's sensitivity to the 5,000ms predecessor. I did not rerun heavy tests or alter the verification clone.

[Inferred] No blocking finding in the scoped delta. The two changes retain the reviewed fail-closed mechanisms and the changed timeout behavior is protected by a predecessor-failing regression.

## Limits

[Unknown] Native run completion, seven-minute CI success, full repository battery, and broader performance improvement are not established by this packet. The 6,000ms cost is simulated with performance.now while real fixture I/O and screening execute; it is not a wall-clock throughput measurement. Direct restoreFrozenOrigins behavior is source-reviewed here, not separately exercised by the selected 27-case ledger run. Any later change to the two bound subjects retires this verdict.
