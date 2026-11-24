# Combined recovery observer source review

Verdict: PASS

[Inferred] PASS applies to the frozen source and stated source-review criteria only. There are no blocking source findings. It does not establish runtime recovery, native admission, passing tests, or an explanation of the earlier producer refusal.

## Binding and scope

- Base commit: `2c6ff308aaa5d34d2b590ef06bd43ec87fb40948`.
- Subject: `packages/polaris-dossier/src/url-run-composed.test.ts`.
- Frozen artifact directory: `/home/orca/.tmp/f3-native-admission-fixes/combined-recovery-observer-review/r1`.
- `binding.json`: `05e6c6aeb83b1b3d8f7f2ee20cb6799ae6cf56e82b2e88843866485422130a4a`
- `combined.patch`: `b61d76e00cf7d5825047e677ab6f2c9af012f81089a6777d66f7a8d2d68c86f5`
- `url-run-composed.test.ts`: `dd3de76e5c99bfb4ebfbd5c75f0842d332e2badfd10223841f370c00e87e1791`
- `append-criteria.json`: `688ce6e57129079f1ca57cf66e661f1bd5a6055d9677f51e8bae2b5357c6019a`
- `eligible-criteria.md`: `52af1b85e0584fddb3bdbd810de28cd08aed4d713d654eebe60ba334d2cf18d8`

[Observed] A read-only Python check computed these digests, compared the frozen source to the review worktree, compared the frozen patch to the worktree's exact git diff, and independently reconstructed the frozen source from the base bytes and patch in memory. The patch has 11 hunks, 118 added lines, and 14 removed lines, confined to the single test file. Production references were read at that base in `/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w`.

No prior review verdict was consulted. No source edits, builds, tests, native execution, additional authority samples, or storage probes were performed for this review. This report is outside the bound artifact directory.

## Assessment

1. [Inferred] The append callback remains passive. Frozen lines 1179–1198 invoke the original callback once through `AsyncLocalStorage.run`, return its original boolean or promise, and rethrow the original synchronous error. Promise rejection observation installs a side handler and returns the original rejected promise. The append wrapper at 1233–1238 retains a trace only when the existing append context is present, and opens the already existing `currentScope` so `currentPhase` records nested production calls across awaits. Retention is 32 recent entries plus a separately retained first refusal; nested stages keep the existing 64-stage cap. No new authority invocation or physical operation is added. The existing forwarding case is extended, with net new test-case count 0, to cover nested asynchronous scope, exact promise identity, rejection/throw identity, outside-scope forwarding, entry eviction, and first-refusal retention.

2. [Inferred] The passive assertion monitor can observe the intended production call path. Both cold proofs are supplied to `renderRun`/`reproduceUrlRender`; `render.ts:330` calls `designReviewOfRecord`, whose `review.ts:442` assertion uses the imported `url-session-audit` export. Thus the namespace spy observes a real consumer assertion even though the later assertion inside `url-session-audit.ts:314` is a module-local call. The spy does not depend on intercepting that local call. Its first observed assertion delegates to the captured original exactly once; untracked/copied proofs and subsequent assertions also delegate exactly once.

3. [Inferred] The temporary claim spy is confined to the original synchronous assertion and restored in `finally`, including a thrown assertion. The original continuation assertion and its `check` implementation are synchronous; `readStoredUrlRenderWithAuthority` samples the claim before and after the bounded read. Consequently a successful first production assertion supplies the two recorded calls, and the post-Resume assertions require exactly two calls with the exact verified-cut and claim identities for each proof. The preparation observer's scoped claim wrapper finishes/restores before the returned factory is consumed. The outer assertion spy remains active through the scenario and is restored by the existing `afterEach` cleanup. Assertion failures are not swallowed or turned into success by the new monitor; normal production handling of original assertion errors is preserved.

4. [Inferred] The removed fixture-only genuine-proof assertion performed an extra full stored-output walk inside the proof lifetime. The replacement observes an already required production walk. The forged-copy assertion remains a refusal at the original WeakMap lookup and adds no physical walk; the second factory call remains a one-use refusal. The closed original product lease, proof deadline bounds, fresh parents, semantic digests, two distinct cold proofs, no resumed roles/sends/ordered begin, final site, execution-record checks, stale-proof refusal after completion, closed-already result, and unchanged execution-record bytes remain asserted. No production deadline, guard, run budget, or scenario timeout changes appear in the patch.

5. [Inferred] The added revalidation wrapper delegates the original argument tuple once, returns its exact synchronous result, and rethrows the exact error. The production `revalidateRead` is synchronous. The wrapper retains only start/end numbers and accepted/rejected outcome for the latest actual call in the resumed render scope; issuance/return runway is numeric or null. New serialized diagnostics do not retain callback arguments, products, source bodies, paths, claim objects, or errors. Exact claim objects are held only in the local WeakMap/call observations used by assertions, not added to retained diagnostics.

## Governing references and limits

- CC-TEST-1: “A defect fix includes a test that fails on the pre-fix behavior and passes on the fixed behavior.” Source inspection supports the forwarding assertions' relevance; execution and mutation verification remain pending.
- CC-TEST-2: “The claim needs a gate artifact.” This source review supplies no passing-test claim.
- CC-TEST-5: “Verification scope is declared.” Scope here is the frozen test delta, passive forwarding, observer reachability/lifetime, retained assertions, bounded diagnostics, and unchanged budgets.
- Trust-and-evidence doctrine: “An LLM assertion is Inferred, never Observed.” Behavioral assessments above are source-review inferences.

[Unknown] Focused observer results, typecheck results, native completion, the remaining proof/producer runway in a real run, and the cause of the earlier pre-admission producer refusal are outside this review's evidence. PASS does not imply this test-only change fixes production runtime behavior.
