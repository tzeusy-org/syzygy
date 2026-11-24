Verdict: PASS
Review type: fresh independent source-only review
Subject: packages/polaris-dossier/src/url-run-composed.test.ts
Subject SHA-256: 170d145f450d19881dc627c23754f44627fc1f5d46e9d1de3a640113073a7803
Base commit: 88e122e108e66418196f24d471417bd19cf6dd96
Base file SHA-256: 581b2e379ac015b333e5edc8ef717d4a93e767d19f2bd6f386db8073b9997bec
Packet: /home/orca/.tmp/f3-native-admission-fixes/native88e-audit-observer-review/review.json
Packet SHA-256: 773ba009f49eaae56906f4b65bec20041f37468998a39905d5b37f1197942cf4
Patch: /home/orca/.tmp/f3-native-admission-fixes/native88e-audit-observer-review/observer.patch
Patch SHA-256: 76be294ffc0e408b3635a9190b978cd3cc2ca00e8920b61353f42a1f787993b9

[Inferred] PASS applies to the stated source-review acceptance criteria and these exact bytes. It does not establish execution success or native acceptance. No blocking source finding emerged from review of the 12 patch hunks and their relevant call paths.

[Observed] The three supplied hashes match files read in /home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w. The actual subject diff against the named base is byte-identical to observer.patch. The base-file hash also matches the packet. git diff --check for this subject produced no diagnostics.

Review basis

[Observed] Read the checkout AGENTS.md, engineering-bar and test-rigor skills, and the adopted craft policies engineering-bar.md and testing-and-verification.md. Relevant criteria include canonical engineering biases 2, 3, 5 and 8; test-rigor rules 3, 6 and 10; CC-TEST-1, CC-TEST-2 and CC-TEST-5. CC-TEST-2 states: “Gate claims require retained, resolvable gate artifacts.” This report makes no executed-gate claim.

Source findings and acceptance assessment

- [Inferred] Metadata-only retention is satisfied for the typed audit boundary. Lines 314–384 retain ordinals, timing, outcomes, kind, role, the relay/control event discriminator, configured append limit and remaining run time. They do not retain the original event object, scope, body, callback result, or error. Actual relay/control event discriminators come from closed event types. The extended fixture deliberately adds body/path markers and checks their exclusion from the serialized summary (1709–1757).
- [Inferred] Retention is bounded: last four instances, last 32 callbacks per instance, last 32 appends per instance, last 32 callbacks per append. First callback/append failures survive rolling eviction through separate retained references or copies (324–384). The global firstRefusal survives instance eviction. No unbounded pending-entry registry is added.
- [Inferred] Per-operation attribution is sound in the reviewed call paths. append uses AsyncLocalStorage.run with a distinct instance/append record; current checks instance identity; effect uses that operation's async context (331–375, 380–382). There is no shared active-phase variable. The fixture starts appends 41 and 42 concurrently, settles 42 first, then rejects 41, and checks each callback's append identity and outcome (1720–1744). Replacing the async context with one shared last-append variable would violate these assertions.
- [Inferred] Forwarding preserves original arguments, return values, promise identity, and error objects for the reviewed callback signatures. measure calls its input once and returns its original result; synchronous throws are rethrown unchanged (344–351). append forwards the original event once, and the existing observe helper returns the original promise (374–375, 585–591). No callback receiver is required by these signatures. The fixture checks append promise/rejection identity, synchronous current throw identity, callback totals, and append arguments. It does not execute native authority.
- [Inferred] Spy composition is compatible with observeDesignRun. The new machine-effect spy captures the previous function before installing its observer (1800–1802); observeDesignRun subsequently captures that spy before installing its own (1180–1182). The locally installed @vitest/spy and tinyspy sources show that repeated spyOn installs a distinct spy and leaves the captured prior spy callable. Thus these layers forward to the original once rather than invoking an overwritten spy recursively. Audit factory layering likewise retains its captured predecessor (941–944, 1937–1940, 1988–1991). This conclusion is source reasoning, not an executed composition check.
- [Inferred] The resumed onFailure wrapper records the first reason and forwards the same reason once, returning the original callback result (2495–2499). The added diagnostics reuse existing log/file-writing sites. The patch introduces no additional authority checks, direct filesystem operations, production code edits, or deadline assignments. Date.now and performance.now are used only to record metadata. Observer overhead exists; source review cannot quantify its effect on a timing-sensitive run.
- [Observed] Test-case growth is zero. The diff extends the existing forwarding observer case. Independent counts find three standalone it declarations before and after, and four it call tokens before and after; the fourth token is the unchanged loop over complete, delivery-stop, stop-resume and eligible-stop-resume. The scenario declaration bytes are unchanged. No test is executed by these text counts.

[Inferred] The truth, evidence and inference floors are relevant because diagnostic metadata may inform later conclusions; this patch does not lower those floors. Product security, secret screening, authority, exposure and deadlines are not changed by the reviewed delta. No production acceptance conclusion may be substituted for the Unknowns below.

Explicitly unexecuted verification and limits

[Observed] No tests, typecheck, build, install, native replay, push or commit were run for this review. The live eligible native runtime constraint was respected. Only read-only source/diff/hash inspection and this external raw-report write were performed. The unrelated url-machine-peer.test.ts timer change is excluded.

[Unknown] Whether the extended observer case passes, whether typechecking succeeds, and whether the integrated spy composition behaves as inferred at runtime remain unverified here. After the parent releases the live-runtime constraint, the requested bounded restoration observer case remains the appropriate focused execution check.

[Unknown] The private audit poison/guard leaf and the machine-store 30-second lease start are not directly observed by this instrumentation. Accepted current callbacks followed by an approximately five-second append rejection may support a deadline hypothesis; they do not identify the private guard or prove native acceptance. A false machine-effect sample does not distinguish its transport, clock, lease or peer constituent. No native-acceptance verdict is made.
