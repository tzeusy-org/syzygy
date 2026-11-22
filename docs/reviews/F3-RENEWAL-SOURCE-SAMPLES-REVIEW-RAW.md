# PASS

Exact subject `8f4c7dc9cfdd2141933d2bbbea05d37a8eb9169b`
Parent `752f8f6c7bdb9b4eb7cb5b8fde373b974fa2c2f5`
Exact patch SHA-256 `f60fdddabce651b70b39b2345dca67ed082e340946a5da25cf47825de3173d63`

[Observed] Binding commands from the runtime worktree

```sh
git diff --no-ext-diff 752f8f6c7bdb9b4eb7cb5b8fde373b974fa2c2f5 8f4c7dc9cfdd2141933d2bbbea05d37a8eb9169b | sha256sum
for name in url-design-product.test.ts url-design-product.ts url-origin-ledger.test.ts url-rendered-source-proof.ts; do
  git show "8f4c7dc9cfdd2141933d2bbbea05d37a8eb9169b:packages/polaris-dossier/src/$name" | sha256sum
done
git diff --check 752f8f6c7bdb9b4eb7cb5b8fde373b974fa2c2f5 8f4c7dc9cfdd2141933d2bbbea05d37a8eb9169b
```

- `url-design-product.test.ts` SHA-256 `fef30ca00b8d8dd8bc8846da7309e9b27025e9ae5d6f1159a058fb00e4ccd988`
- `url-design-product.ts` SHA-256 `5b541f2754dd2b809ea35c5d1545e18e989007631d9a52d3fc9d837be64dfe76`
- `url-origin-ledger.test.ts` SHA-256 `bcd93bd7b37e583000ee0ca9f32eabb8e85b141fd4b66d49eeb0499f4ae10e97`
- `url-rendered-source-proof.ts` SHA-256 `b484793eb7e8f8055f35da889372bbb46e23a2850f8a9c855678348e7e9e05b3`

[Observed] The supervised renderer and its ordered reproduction use the same nominal run-bound read context with the existing trusted `waitForProductSamples` hook. `checkUrlDesignProduct` admits only its exact render operation and checked input before forwarding that hook. `beginRunProductReads` retains the same absolute run and operation deadline, and its wrapper yields to the poll queue before testing the lease, awaiting the supervisor sample drain, and checking the same lease again. Refusal cancels that read context and the product check returns null. The actual final render's read contexts omit the hook and keep their existing five-second continuation path and publication checks. See `polaris.ts:1231`, `:1373` and `:1405`, `url-operation-products.ts:39` and `url-design-product.ts:146`.

[Observed] The whole-source loop now drains before each verifier invocation and after verification before nominal inspection. It checks abort after each drain. The cap held across the second await is the ledger's frozen empty object, whose metadata and provenance receipt are ledger-owned and whose inspection rechecks live authority. The callback receives neither the capability nor any source data. Pinned blob reread, screening, ledger source-operation deadline, receipt and byte accounting, complete body and piece equality, and exact pin, policy, source scope and provenance remain enforced. Final product stability rechecks the copied inputs, ledger parents and read lease before publication. The product is refused if a drain or inspection fails. This preserves the REQ035 duty to “independently pin and verify” the renderer and “all actual input origins/classes” and the original bounds and refusal required by REQ048. See `url-rendered-source-proof.ts:21` and `:38`, `url-origin-ledger.ts:256` and `:280`, `url-design-product.ts:182` and `:216`, and `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md:279` and `:795`.

[Observed] The drained promise is the existing finite resource census/currentness operation for each active child. Ordered launch pins its sample callback to the supervisor's `input.current`. That callback uses completed-child settlement, effect checks and the independent run binding. The producer's renewal path, which invokes the sampled reproduction, is a separate callback. There is no wait for rendering, renewal or a worker inside the launch sampler's currentness path. The sample can refuse by itself before the render returns. See `session-launch.ts:392` and `:442`, `url-run-sessions.ts:48`, `:294` and `:378`, and `url-run-ordered-attempt.ts:121` and `:189`.

[Observed] The validator test pins forwarding the exact hook. The whole-source regression uses the actual protected ledger and observes exact drain, verify, drain, inspect order. Its refusal arm throws at the second drain and observes no inspection. The existing source population refusal cases remain. See `url-design-product.test.ts:238` and `url-origin-ledger.test.ts:219`.

[Inferred] The two poll points break up the synchronous verifier and inspector groups so pending census work has an opportunity to finish. The existing sample wrapper also incurs authority checks and the verifier itself still runs synchronous checkpoints. Source inspection establishes a scheduling opportunity with preserved bounds. The trace attribution and net timing improvement require exact runtime evidence.

[Unknown] Runtime behavior at this subject was outside this source review. The exact patch passed `git diff --check`.
