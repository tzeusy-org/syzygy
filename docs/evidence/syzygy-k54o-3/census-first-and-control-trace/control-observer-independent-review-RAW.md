PASS

Subject: test-only control observer patch.
Base HEAD: 447b23e7672fc63e860d03498b08050a7bbc4c9e
File: packages/polaris-dossier/src/url-run-composed.test.ts
File SHA256: b9ace05cd6d1eee02f8af092c6e84a017950d8436a93b429dfe216f87a79c4b1
Patch: /home/orca/.tmp/f3-native-admission-fixes/control-observer.patch
Patch SHA256: a93a1f952a5a4bb6d05557df71eab46e338d5fbecc88c523d33907db374a7da5

[Observed] The actual file diff matches the frozen patch byte-for-byte. Independent source review found no blocking findings within the requested diagnostic-only scope.

[Observed] Lines 277-305 invoke each original callback once, forward the original audit event/failure reason, return the original synchronous value or promise, and rethrow the original synchronous error. The underlying controller also invokes extracted callbacks without a receiver, so wrapping preserves that calling convention. Observation adds no authority callback invocation, deadline change, or production-source change.

[Observed] Entries are capped at 32; the pending map is capped at 32, with at most two additional latest-phase metadata entries in a pending snapshot. Counts and the first callback refusal continue after the entry cap. The first failure copies its in-flight metadata snapshot once. Retained fields contain ordinals, controller IDs, phase/outcome enums, timing, counts, and the typed failure reason; event bodies, paths and error objects are not stored.

[Observed] The patch extends the existing observer case; existing test declarations and native pipeline/Stop assertions remain in place. The extension checks call counts, argument identity, promise identity, synchronous throw identity, post-cap refusal capture, first-failure stability and diagnostic exclusions. git diff --check passed. A textual declaration census is unchanged at four it(...) sites (the scenario loop expands the native cases).

[Observed] The supplied verification JSON reports 3 passed / 4 skipped / 7 total, no native cases, for the focused observer command. This reviewer read that record but did not rerun tests, builds, installs, or native work. This is a source-only independent review, not native acceptance evidence.

[Inferred] The frozen patch is ready for the parent's native rerun after its remaining checks. A later edit retires this verdict.
