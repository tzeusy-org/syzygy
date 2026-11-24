# F3 Fidelity audit composition regression review
Verdict: PASS
Reviewed commit: a7bfb025fbe0a9985b7b5026d7d346ddc6d9990e
Base commit: dfa3453cb3b1d5185a9da34fcce31f6e4ddcc2d0
Combined binary delta SHA-256: 184c176011d30e9f735065be28f83df761303af022aa56f63dea2c4bc46eade7
Reviewed test file SHA-256: e75787cf45679243e8d0fe5e9afdfdeae16aff9c0c871a49b6eada31bf9f725f

[Observed] The unrestricted `git diff --binary <base> <subject>` binding was recomputed and matches the review brief. The changed-file population is one test file, `packages/polaris-dossier/src/url-session-audit.test.ts`, with 98 added lines. The production store and audit bytes match between base and subject. This review applies to the test-only composition delta, not native acceptance.

## Review scope and assessment

[Observed] I read the new test and surrounding fixture/cleanup code, the relevant real store lease/deadline/read/release paths, audit enqueue/write/currentness/publication paths, and the production audit callback composition in `url-run-sessions.ts`. I applied the test-rigor skill to regression value, independent expectations, boundary mocks, determinism, suite growth, and cleanup.

- [Inferred] The two literal elapsed cases isolate the enclosing five-second ordinary effect from each audit append's own fresh five-second budget. The actual machine-peer write advances elapsed time to 1000 ms, usage to 3000 ms, and response to 4000 or 5100 ms. Thus their individual append spans are one second, two seconds, and one or 2.1 seconds. The four-second case must complete; the 5.1-second case must fail despite the response's own append budget remaining open. The real store samples the monotonic elapsed bound; the fixed wall-clock callback keeps wall deadline expiry out of this comparison.
- [Inferred] The composition uses a real allocated and durably published machine-store client, a real matching ordinary Fidelity profile, `store.exclusive`, `lease.read`, `lease.sampleCurrent`, and the real audit writer. It mocks only the clock and a filesystem write boundary, after performing the original write. It does not replace the store or audit implementation with canned results. The active audit callback samples the already-held lease and does not re-enter its lock.
- [Inferred] Matching literal process/channel/instance metadata establishes only a synthetic stored record suitable for this component composition. It does not establish a native peer, authenticated process, native relay, or actual provider response. The test calls the audit APIs directly. No native evidence is claimed here.
- [Inferred] Assertions distinguish physical bytes from acknowledged history: the response row is physically present in both cases, its predecessor links are checked, and the earlier physical prefix remains byte-identical. On expiry, the acknowledged record count, response-admitted count, Fidelity byte count, and global tip remain at the earlier admitted prefix; the audit is poisoned and the store lock remains. The accepted case admits the response and removes the lock. The original 5s store and audit limits are neither overridden nor changed.
- [Observed] Net suite growth is two tests from one parameterized declaration. The nearest existing audit tests cover stale fsync, post-write authority withdrawal, prefix changes, and unacknowledged tails; the nearest store test covers per-profile expiry. [Inferred] This addition earns its growth by composing those real components across several individually valid appends under one parent effect. Those neighboring tests do not exercise that cumulative composition.
- [Inferred] Expected timings and acceptance are literal case values, rather than values imported from the production deadlines or computed by the implementation under test. Prefix and tip expectations are derived independently from the captured physical bytes and prior summary. The write-kind assertion also confirms the intended machine-peer/usage/response schedule actually ran.
- [Inferred] Cleanup is appropriate: the local finally block clears the active effect callback, restores the write and clock spies, and awaits store closure. Existing suite teardown restores remaining mocks and closes retained audit writers; fixture directories use the existing test-kit lifecycle. The refusal path retains its lock intentionally, and the synthetic fixture tree is later cleaned by the existing harness.
- [Observed] An AST comparison of expect-rooted call expressions found 428 at base and 454 at subject; removing only the new parameterized block reproduces the base sequence exactly. The delta leaves existing acceptance assertions and production limits in place.

## Verification

[Observed] I reran only the focused new pair with:

```text
npx --no-install vitest run --project integration packages/polaris-dossier/src/url-session-audit.test.ts -t 'keeps the Fidelity response audit under its enclosing ordinary store lease'
```

[Observed] The result was 2 passed and 115 skipped out of 117 tests; both the 4000 ms and 5100 ms cases passed. The test execution phase took 756 ms and the full focused invocation took 9.51 seconds.

[Observed] I also ran an isolated, process-local Vite transform of that same test, replacing exactly `effectCurrent = () => lease.sampleCurrent() !== null;` with `effectCurrent = () => true;`. This deliberately detaches the audit from its enclosing effect without editing repository source or limits. The transform asserted one replacement target and emitted its application marker. The four-second control passed. The 5.1-second case failed at the summary assertion: expected poisoned true / durableRecords 9 / response-admitted 0, received poisoned false / durableRecords 10 / response-admitted 1. The run reported 1 failed, 1 passed, and 115 skipped out of 117. [Inferred] This demonstrates sensitivity to a plausible parent-effect-gate loss rather than merely to the final store return value.

[Observed] The supplied focused-run log digest was independently confirmed as `6f824da81024c525d265af0a8a2f323115df9ec80570edaa31bbcec2b980bf80`. Its metadata file SHA-256 is `ca00be19778e1e1a052fc0cbc82aafaf79f62a2e5c9261cee649ad24de8ebece`. That metadata names the pre-test base as its head, but its test-file digest equals the reviewed subject's test bytes, and its production hashes match both commits. The independent rerun above exercised the committed subject directly.

## Limitations and changes

[Unknown] This review does not establish native Fidelity process identity, actual relay callback wiring at runtime, provider behavior, real-time scheduling, or complete F3 acceptance. The gate-loss transform targets the synthetic fixture callback; it is not a mutation of production code and does not prove sensitivity to every possible parent-currentness regression. The exact 5000 ms equality boundary is not a case in this addition. No broad suite, typecheck, governance battery, or native scenario was run by this reviewer.

[Observed] The only repository file written by this review is this new raw. Existing raw reviews and semantic source were left untouched. The temporary mutation config lives outside the repository. No review findings require a source change within the stated criteria.

## Patterns

[Inferred] Individually valid child operations can cross a shared parent deadline. A useful composition regression holds the real parent lease, uses the real child writer, advances time at an actual external-operation boundary, and checks both the physical side effect and whether it was admitted. Retaining a physically complete but unadmitted tail, poisoning the audit, and retaining the uncertain lock are distinct consequences worth asserting together. A synthetic record with matching identity fields remains component-test input, not proof of a native process.
