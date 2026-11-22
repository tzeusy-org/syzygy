# PASS

Exact subject `ee5158f2951bce1ccfedcc9f65b0471f9c7ad44f`
Parent `83136fec7f085bee134dc7c58ae10979a1032f58`
Exact patch SHA-256 `bb299547ce0376ae0206aa8620b694226eec1377b3665df7034b44692283a064`

[Observed] Binding commands from the runtime worktree

```sh
git diff --no-ext-diff 83136fec7f085bee134dc7c58ae10979a1032f58 ee5158f2951bce1ccfedcc9f65b0471f9c7ad44f | sha256sum
git show ee5158f2951bce1ccfedcc9f65b0471f9c7ad44f:packages/polaris-dossier/src/url-ordered-design-session.ts | sha256sum
git show ee5158f2951bce1ccfedcc9f65b0471f9c7ad44f:packages/polaris-dossier/src/url-ordered-design-host.test.ts | sha256sum
git diff --check 83136fec7f085bee134dc7c58ae10979a1032f58 ee5158f2951bce1ccfedcc9f65b0471f9c7ad44f
```

- `url-ordered-design-session.ts` SHA-256 `a8066c130215e1036de08b711b0fd70107174bc5763a0548949c5c4d37573f06`
- `url-ordered-design-host.test.ts` SHA-256 `2da58882cc14b4580b035a93a1b9470ba9831c9584164084fadff2dfe774748f`

[Observed] The two entry points run the existing full currentness await before the exact synchronous product assertion and any worker input assembly. The full asynchronous check first tests continuous authority and immediately tests it again after the await. The synchronous assertion then verifies the product in the same stack as input assembly. Busy ownership spans the await. The screen-operation call-site sweep found three calls, comprising initial and subsequent requests and the response. Each follows this sequence. See `url-ordered-design-session.ts:130`, `:249`, `:272` and `:319`.

[Observed] In the named producer, renewal is limited to a genuinely expired nominal product. An open product whose exact check fails while still open refuses. A retired or unknown product also refuses. The current callback reproduces under the existing operation deadline and requires a checked delivery view from the exact existing delivery receipt before swapping the product. It closes the predecessor and synchronously checks the replacement. The protected delivery reader verifies the active receipt, provenance and product identity. This preserves REQ035's rule to refresh capacity “without extending the recorded original deadline or lowering the ordinary role caps” and its prohibition on “recomputing under a fresh live budget.” See `url-run-ordered-attempt.ts:72` and `:112`, `url-design-product.ts:88`, `url-session-audit.ts:964` and `:1248`, and REQ035 in `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md:291`.

[Observed] The worker still opens its bounded operation at screen entry, checks processing currentness and time during execution, accounts for actual CPU, and checks full currentness after the worker returns and before recording a screen result. Denial follows the existing retirement and audit path. Admission still checks exact request and forwarding identities. The relay synchronously checks its effect boundary immediately before actual forwarding or response release, after its protected audit and currentness work. The tool-reply release also retains its synchronous validation and boundary callback. The patch introduces no await at these effect boundaries. This preserves REQ048's current parent and next-act checks and the existing cutoff and cleanup discipline. See `url-ordered-design-session.ts:152`, `:182`, `:223` and `:249`, `url-ordered-design-host.ts:90` and `:129`, `session-relay.ts:287` and `:335`, and REQ048 in the spec at `:785`.

[Inferred] The four focused cases discriminate request renewal before worker entry, unavailable currentness before any worker work, changed product after worker work and revoked processing before a checked result. The renewed case would refuse on its initial synchronous assertion with the previous request ordering. The adjacent continuous-authority case exercises loss during the currentness await. Existing product tests cover genuine expiry versus changed open or retired products. The four added cases exercise the request entry point. A response-only reversal would need a response expiry-at-entry fixture to demonstrate its independent detection. The symmetric source ordering and downstream response-release checks were inspected for this review. See `url-ordered-design-host.test.ts:162` and `:175` and `url-design-product.test.ts:127`.

[Unknown] Runtime behavior at this exact subject and direct response-entry sensitivity were not exercised in this source review. The exact patch passed `git diff --check`.
