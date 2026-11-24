# Native88e source restoration observer independent review R1
Subject SHA-256: 8fceb6502c0dd63a39ed708127945e86f28bbb2b486a8e460e952fd1bbb74092
Base commit: c5e41bbddd038ac1d67578e2e5cd5b1d40132661
Verdict: REVISE

[Observed] Subject: frozen `packages/polaris-dossier/src/url-run-composed.test.ts` in `/home/orca/.tmp/f3-native-admission-fixes/native88e-source-observer-review/`. Base subject SHA-256: 170d145f450d19881dc627c23754f44627fc1f5d46e9d1de3a640113073a7803. Patch SHA-256: 3a31f81153730e1dbefd2329e074ec7444a8348fa1e74772a132d2f3e0907c16. review.json SHA-256: 34aa4399b2dbc5aa1a5a5eff02b1c944a70b5a2dee1fcf5ea7718665c8f0c089. These hashes were computed from the actual frozen files; the base hash was independently computed from `git show` at the named commit.

Scope and method

[Observed] This was a fresh source-only review of the frozen observer patch and its existing forwarding test, with the actual production restoration/source-reader/recovery-transfer implementations read from `/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w`. The three production files matched the named commit byte for byte. No source edits, commits, builds, heavy tests, native execution, authority calls, credential reads or fixture reconstruction were performed. Repository AGENTS.md, engineering-bar and test-rigor instructions were applied. The net test-case delta is zero: the existing forwarding case is extended.

Findings

1. [Observed] P2 — Preserve the original open result identity. Frozen subject lines 463–469 call `captured.open()` once but return `{ ...reader, listTree() { ... } }`. The object returned to production therefore differs from the original reader result. This violates the explicit acceptance criterion that original results retain identity. The forwarding case at lines 1782–1784 supplies a distinct original reader object but lines 1817–1818 only check listTree's returned promise, leaving the open-result regression undetected (test-rigor 1 and 3). Preserve that reader result identity while observing its method, or omit the listTree decoration if maintaining it would require changing this guarantee. Assert the open result is exactly the supplied reader object.

2. [Observed] P2 — Classify a successful restoration with missing waits explicitly. At frozen subject lines 584–589, only rejected settlement records a derivation failure. Lines 581–583 retain only unexpected-wait and graph-unavailable mismatches. Lines 598–599 expose expectedWaitCalls and waitCalls without classifying a fulfilled restoration that used fewer than the expected fresh-node-plus-final waits. For example, a one-fixed-node graph whose stub calls current once then fulfills yields one apparent derivation and no mismatch; the missing final wait is left for a human to infer. This fails the explicit acceptance requirement to handle mismatches/final calls explicitly and the engineering-bar expectation that incorrect assumptions surface clearly. On successful settlement, classify too-few waits and retain the first such mismatch beyond run/step truncation. Keep rejected early cuts distinct, because they legitimately stop before the final wait. Extend the current forwarding case with a fulfilled missing-final scenario.

Other acceptance checks

[Observed] Production url-origin-ledger.ts lines 534–579 obtains history.provenance through takeUrlRecoveryProducts, iterates graph.nodes in order, skips composition/source-reply/report/authenticated-provider-output, invokes waitForSamples once before each remaining fresh kind, and invokes it once again after the loop. The observer's six-kind descriptor filtering and graph ordinal preservation correspond to that actual private loop. Distinct restoration invocations receive distinct AsyncLocalStorage contexts and ledger ordinals. Present production sequencing is serial, so its active-step attribution is consistent with that implementation. Source-whole may produce multiple reads under one step, which this observer permits.

[Observed] The capture spy forwards the original input and calls the original capture once. readScreenedBlob forwards the same path, calls only the supplied callbacks at the original source-reader call sites, passes the actual blob object to screen, returns the original read promise, and rethrows the original synchronous exception. The added assertions check the original read promise, screened-result and blob identities, callback rejection identity, and exact stub call counts. There is no added current/wait authority invocation in the observer's bookkeeping.

[Observed] Source reads, per-read callback records and per-run step records retain rolling tails of 32; the observer retains four run summaries. First source failure independently retains the failing read and a copy of the failing callback, and first derivation failure retains a cloned active step. First graph-unavailable and extra-wait mismatches are retained independently. Diagnostic field construction keeps ordinal, kind, enum and timing metadata rather than body/path/error-message values. The forwarding test exercises a guard throw after read-tail truncation, screen rejection, extra/final waits and sentinel-string exclusion. The internal descriptor array retains one minimal ordinal/kind descriptor per fresh graph node; the emitted summary does not expose that array.

[Observed] The actual source reader calls the passed checkTime before blob I/O and calls the passed screen on the actual blob. Private timer checks in the ledger outside that passed callback remain outside this source callback observation. The patch documents this limit.

[Unknown] Native run cause, native source read outcomes, production timing effects and runtime success remain unverified. Source correspondence is not causal evidence of any earlier native failure. No green/full-battery or native-execution claim is made.

Disposition

[Inferred] REVISE the two local acceptance failures above, then review newly frozen bytes under a new raw filename. R1 remains bound only to the subject hash at the head of this review.
