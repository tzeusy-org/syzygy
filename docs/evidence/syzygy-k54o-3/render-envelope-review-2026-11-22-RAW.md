REVISE

Independent source and governance review of the URL render operation envelope

[Observed] Subject: commit 953cd18b3124a06978b51ac9d4988984faadf2ae, relative to parent 9512e16c88b24f91428de5f49c885f5e99b4a18d. The ten changed files are identified by the scripted SHA-256 manifest below. Each reviewed working-tree file matched the corresponding committed bytes when checked. Scope: this delta, its direct read/producer/product/runtime callers, the named governing clauses, A-14, VIS-4 and the adopted craft/testing bar. This review makes no claim about native completion or full repository correctness. No tests, build, native run, governance battery or mutation execution was performed by this reviewer, as instructed. Reported prior passing runs are not independently rerun evidence here.

Finding F3-ENVELOPE-1 — P2, regression coverage required at the actual URL producer boundary

[Observed] render.ts:373-397 changes a separate executable limit: URL producer reproduction/admission now receives the remaining genuine read deadline instead of its former unconditional five-second timer. The new tests in url-run-artifacts.test.ts:896-936 exercise the adapter/backend read lease and original-deadline clipping; url-design-product.test.ts:113-125 exercises the validated-product lifetime; url-run-machine.test.ts:154-164 exercises source numeric drift. None of those four newly added test cases invokes the changed render producer race. The existing nearest producer budget case, render.test.ts:278-289, prepares an ordinary run and checks the ordinary RENDER_PRODUCER_MILLISECONDS branch only.

[Inferred] Consequently a regression that restores only the producer's five-second timer/expiry budget can keep the added lease/product/runtime assertions passing while reproducing the observed defect at producer admission. Likewise the new tests do not distinguish a producer that receives a fresh thirty seconds after initial drawing from the intended remaining original operation deadline. This is a meaningful missing regression for the accepted fix, rather than a request for a broad integration rerun.

Governing anchors:
- CC-TEST-1, .syzygy/governance/policies/craft-and-care/testing-and-verification.md:16: "A defect fix includes a test that fails on the pre-fix behavior and passes on the fixed behavior"; the clause permits only recorded infeasible-reproduction exceptions. A controllable clock and held admission boundary are available here.
- Adopted test-rigor rules 2 and 3, .codex/skills/th-engineering/subskills/test-rigor/SKILL.md:58-63: regression coverage and first-class edge/failure paths.
- REQ-polaris-generation-035, openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md:277: "under these and any stricter existing role/broker/request limits and original deadline/operation wall bounds" and "Apply the same limits and currentness at every subsequent operation and stop at the first failure."
- REQ-polaris-generation-048, same file:795: "positive finite startup, relay, bridge, broker, request/response/SSE buffer, output and child-process limits recorded before use"; breached limits stop dependent work without counting review/readiness/close.

Required repair: extend the existing render test seam with an actual URL-mode render and genuine reads. Demonstrate that a producer admission which finishes after the former five-second allowance but before the same thirty-second context deadline can succeed; hold admission beyond a shorter original/shared deadline and assert refusal, aborted admission signal and no site storage; consume time before producer admission and show that admission receives only the remainder. Exercise synchronous expiry before a timer callback as well as timer-driven expiry, and retain the ordinary five-second behavior. Expected deadline boundaries should be literal clock instants. The producer regression control should fail when only its budget is restored to five seconds; the no-reset control should fail when only its producer timer is changed to a fresh thirty seconds. This repair belongs in the current change.

Source and governance assessment

[Inferred] This is an ordinary agent-class runtime-capacity adoption under VIS-4, not a new owner decision. VIS-4, vision.md:172-198, says agents decide everything outside the four owner classes, including behavior-changing fixes, and requires the landing adoption row naming what changed, why, commit and revert command. A-14, AGENT-ADOPTIONS.md:32, adopts the URL 2.1 behavior and credential amendment; their preserved candidate banners are not a new gate. The reviewed delta changes an implementation-selected finite operation duration, with no doctrine edit, screening weakening, foreign-repository write, widened exposure, release or multi-user activation. Record this exact repair in the landing agent-adoption row; A-14 is its governing behavior authority, not a substitute for reporting the new change.

[Observed] URL_PRODUCT_READ_MILLISECONDS is a frozen dependency-free leaf with exactly five own numeric entries: render 30000; review-packet, review-check, inventory-check and author-check 5000. The four new importing production modules depend on this leaf, which imports nothing and cannot add a back-edge or package dependency. The operation type is derived from its own keys; backend input validation uses Object.hasOwn, finite safe-integer deadline validation, future-only deadline and the selected operation cap (url-run-artifacts.ts:1111-1119). This changes no implementation/governance namespace write path.

[Observed] beginRunProductReads computes min(supplied original run deadline, Date.now()+operation cap) once, passes that same absolute value to the backend, publishes it on an Object.freeze object, and authenticates the object through the existing WeakSet (url-operation-products.ts:33-63). The backend independently owns the context in its WeakMap, binds immutable state.deadline, schedules its original timer and retains one-way terminal state (url-run-artifacts.ts:1063-1122). The production supervisor supplies its original run deadline (polaris.ts:378-390,1199-1213); final continuation callers additionally clip to their existing five-second continuation deadlines (polaris.ts:1227,1252).

[Observed] render.ts:373-400 calculates the URL producer's remaining duration from that immutable deadline and caps it at the declared render maximum. It uses that duration for both its timer and its monotonic performance.now expiry, samples the absolute wall deadline and genuine lease in expired(), and checks expiry after awaited admission before storage. The ordinary producer still uses RENDER_PRODUCER_MILLISECONDS. No timer is reissued inside the reproduction sequence. Backend expiry/retirement state and final storage lease checks remain in place. These facts support the intended source behavior, subject to the regression gap above; they do not claim that timers interrupt synchronous JavaScript.

[Observed] url-design-product.ts has only a comment change in this delta. Its existing validation takes initial.metadata.deadline from genuine revalidated reads, and existing product/lease WeakMaps, cheap synchronous deadline checks, backend-state checks and irreversible retirement continue to apply. Extending the render lease intentionally extends this product's nominal lifetime to the same absolute deadline; it does not mint a copied proof or revive a retired token. Reproduction identity comparison's existing deadline normalization is unchanged and compares two independently inspected operations; it does not authenticate an operation or issue permission.

[Observed] url-runtime.ts includes the limits source in PROFILE_SOURCES and adds the numeric table to the profileRegistrySha256 input (lines 26,191-192); build_dossier_runtime.mjs:23 includes the same source in its captured profile list. Runtime admission verifies captured source input digests before selecting the runtime (url-runtime.ts:163-180). Old installed runtime manifests therefore fail after this source change rather than inheriting the new limits. The new machine test mutates the actual source numeric literal and expects runtime refusal before selection; this review inspected its assertions but did not execute it.

[Observed] The complete ten-file diff contains no changes to detectors, origin species/classes, parent coverage, identity rules, operation currentness, CPU-budget charging, sampling cadence or inspection bounds, byte/node/depth bounds, audit continuation limits or render continuation limits. Existing waitForProductSamples and withinCpuBudget paths remain called from genuine read waits; the shared run CPU budget remains process CPU usage plus charged native work (url-run-sessions.ts:231-234,290,378 and url-run-cpu-budget.ts). The longer wall allowance is not extra CPU capacity. REQ-polaris-generation-025:21-25 still requires complete independent source/renderer/parent reproduction and unchanged complete secret checking; no corresponding predicate is removed here. RFC3-16(d).6, credential amendment:362, requires "finite record/instance/client/parse/I/O/lock/output/wall bounds under the original run deadline" and unchanged safeguards; this delta preserves that rule rather than changing its closed credential class.

[Unknown] Native four-role end-to-end success, actual recovery completion and further platform scheduling headroom are outside this source-only review. The reported 65 checks / 3.32 seconds, 173 artifact+render checks, 58 product checks, typecheck, and numeric-drift 1 pass / 5 skips remain supplied report facts for this review. REVISE is solely for F3-ENVELOPE-1; the inspected source design and ordinary agent-adoption classification are otherwise coherent.

Scripted subject-file SHA-256 manifest

```json
{
  "subject": "953cd18b3124a06978b51ac9d4988984faadf2ae",
  "parent": "9512e16c88b24f91428de5f49c885f5e99b4a18d",
  "files": [
    {
      "path": "packages/polaris-dossier/src/render.ts",
      "bytes": 96741,
      "sha256": "4e3d8cb6f23748af6f4195ecba7f9b4ca9b3bed938c2efa8a83da5b5a680942f",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-design-product.test.ts",
      "bytes": 42675,
      "sha256": "be9f90323256d0ad5efcaf41577a42faeedb43c00b7ca748f3bcc68bca949a3f",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-design-product.ts",
      "bytes": 19946,
      "sha256": "af45237606eecd398186fd69f6621641c5655ce2d4499967507b8ae853e4926c",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-operation-products.ts",
      "bytes": 7206,
      "sha256": "953cfca08add8e2c760aa8969b58d6884dd48a8207d064deda0d2a27b040f8fd",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-product-read-limits.ts",
      "bytes": 416,
      "sha256": "cbdeb9abac5d87fbe7217877e076bfd33b0f6beabeedc0df71a050eff0fd3728",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-run-artifacts.test.ts",
      "bytes": 129841,
      "sha256": "609ebde6282d18b0749ba6eef82798f224ee14cee78c369c735f94822dff19fd",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-run-artifacts.ts",
      "bytes": 125075,
      "sha256": "6a72c3b74211058c77ee06ee0e10493776ee06aef2c158d3718c232cd21ae071",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-run-machine.test.ts",
      "bytes": 21087,
      "sha256": "681026543715d35534fb9536ee7baac349c125ac13ab9ca8d971d36e132345ea",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-runtime.ts",
      "bytes": 17611,
      "sha256": "9faf6710e6f0fe71e72446d6cafbb8068df6de859ba2a138b29f65d490e4d64f",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "scripts/build_dossier_runtime.mjs",
      "bytes": 12022,
      "sha256": "b3ce22917a82f107687f98c9f73ecf6fc5e96fa5eb7032184d114bb7ceac4093",
      "worktreeMatchesAtReview": true
    }
  ]
}
```
