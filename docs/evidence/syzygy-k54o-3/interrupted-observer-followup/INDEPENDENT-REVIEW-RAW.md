# Independent observer scope review
Verdict: PASS
Subject: packages/polaris-dossier/src/url-run-composed.test.ts
Source SHA-256: 3a5c2d45eb9c9bccab65817070aad47102d4a9ea2ce6de1b42f7ae90ff08216b

Base commit: b47cd8290c8d4a981789a6d779054ecaa5f3d14c
Base SHA-256: 80fec1d63bf83009eba30ef8500eb78493c8b26ae7438ebb7ea70f01bd80f22f
Patch SHA-256: fdfb00880b5aa3b20e32c0b6444cae9cf291e3160906580db3572bbb1cf7ed63

[Observed] Reviewed the frozen base, proposed file, observer.patch and review.json, the repository AGENTS.md, and the test-rigor skill. The three packet digests match their declared values. The base bytes match the named committed blob; independently reconstructing the proposed file from the three patch hunks reproduces its bytes exactly.

[Observed] The observer change makes append metadata optional in the async store and enters a scope around each original current callback. It reuses the existing store when the observer instance matches, retaining append attribution. Otherwise it starts an instance-only store. The original callback is still invoked once by the unchanged measure function, which returns its original value or Promise and rethrows its original synchronous error object. The patch adds no production guard invocation, authority call, deadline modification, payload capture, or product-code change. Existing numeric counters, four-instance retention, 32-entry rolling tails, and first-failure storage remain unchanged.

[Observed] The existing forwarding case is extended with a standalone callback whose nested machine-effect guard runs in a Promise continuation. It asserts original Promise identity, the false result, one original callback and one guard invocation, both refusal entries without append metadata, unchanged earlier invocation counts, and preservation of the first refusal. Existing assertions continue to cover overlapping append scopes, synchronous value/error forwarding, rolling tails, and exclusion of private body/path/error markers. The diff adds no test case; a separate declaration scan reports six direct it/test declarations in each frozen file.

[Observed] A small isolated Node harness transpiled and executed the observer and observe helpers extracted from the frozen files. The proposed observer retained the standalone nested machine-effect refusal; the committed-base observer omitted that entry. The same harness checked original Promise/value/error identity, original invocation counts, async same-instance append attribution, callback tail retention after 80 further checks, and preservation of the earlier first refusal. Its assertions passed. This supplies a targeted predecessor counterexample for test-rigor expectation 2 without invoking the native composed suite.

[Inferred] The patch satisfies the stated observation-only objective: the actual nested machine-effect result becomes attributable during standalone current checks, while same-instance append scopes retain their identity. The regression assertions protect against removing the new scope or replacing the active append scope unconditionally. No revision finding within the supplied scope.

[Unknown] The full forwarding case, repository typecheck, composed/native reconciliation, and broader test battery were not run in this independent review, as requested. This verdict covers the frozen observer patch and its targeted isolated checks; it does not establish native reconciliation success or identify lower transport/peer subpredicates.
