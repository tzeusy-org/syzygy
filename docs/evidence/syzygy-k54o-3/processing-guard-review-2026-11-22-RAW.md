PASS

Independent source review: F3 bounded processing guard

[Observed] Frozen subject: `713f654a539eb2a76af528c70dd64757ac7dd042`. Reviewed implementation delta only: `0bbe23770699221d8b26fdce14909142a8e169f9` against its first parent, plus A-48 in `.syzygy/governance/decisions/AGENT-ADOPTIONS.md:67`. Source bytes were read through `git show 713f654a5:<path>` because the shared checkout had advanced to a later commit. No later code is covered by this verdict.

[Observed] Changed-file digest census (SHA-256 calculated directly from the three frozen Git blobs):

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `packages/polaris-dossier/src/url-ordered-design-session.ts` | 36246 | `995ce5c4626596e6cbd2d91b47186c1225268dfff67789bdd8981e3d9067186e` |
| `packages/polaris-dossier/src/url-run-ordered-attempt.ts` | 15613 | `4ce9198c11cf340e2f06d6aca28dde34e103bad0383d3307bb72e8c94b878e83` |
| `packages/polaris-dossier/src/url-ordered-design-host.test.ts` | 36380 | `2124db69e8a7bb2ee42271af05991bd65a74c4dfc6ae5061ba13856e1d81e4b6` |

Governing criteria

[Observed] Read the frozen AGENTS.md and relevant adopted doctrine and package-256 specification clauses. VIS-2 says “No evidence means Unknown, not success.” VIS-4 reserves to the owner anything that would “weaken secret detection or SEC-5's fail-closed rule”; SEC-5 requires “Unclassifiable content” to be “excluded too: classification fails closed.” This review assesses whether the changed guard preserves those predicates rather than adopting an exception.

[Observed] REQ-polaris-generation-035, proposed/polaris-generation/spec.md:277, requires “Apply the same limits and currentness at every subsequent operation and stop at the first failure.” Its work rule at :291 requires reservation and refresh “without extending the recorded original deadline or lowering the ordinary role caps”; :293 says “Never suppress detector steps because a prior whole or actual branch passed.” Its :307 requires refusal on subject/producer/policy/parent/view drift or revocation. REQ-polaris-generation-048 at :787 rejects cached or queued admission after revocation; :795 retains original deadlines and rejects replay or promotion of incomplete ordered transfers. These are clauses of the A-14 adopted URL package, not authority inferred from a candidate banner.

[Inferred] Acceptance criteria applied: keep actual machine/effect authorization, run closure/revocation, finite CPU/wall/byte/detector bounds, original deadline, full entry/result and release checks, genuine same-delivery renewal, and no dependent output after changed input, failed renewal, fabricated capability or revocation.

Source findings

[Inferred] No blocking source defect identified in this delta. The split has the following load-bearing properties:

- `url-ordered-design-session.ts:128-144` separates `requireAuthority` from the full protected-input check, with the original deadline, relay health, work reservation and session budget still mandatory. `requireCurrent` now permits the genuine asynchronous currentness port to renew first, then immediately rechecks authority and the full input predicate. Optional processing guards default to the previous full predicate.
- `url-ordered-design-session.ts:221-229` substitutes only the per-chunk/worker-poll guard. The trusted worker's input remains the serialized bounded request, and `screenOperation` at :246-267 requires full currentness both before opening work and after the worker returns, before accepting its observation. Detector-count, branch, inverse and operation checks still run; `boundary.finish` rejects an exceeded CPU/wall reservation before an observation escapes. `url-ordered-design-screen.ts:91-98,111-112,125-158` retains bounded serialization, held-image hashing and drift checks, child capacity charging, deadline/poll termination and strict result checks.
- `url-run-ordered-attempt.ts:95-103` keeps closure, current mediated effect, actual run-machine currentness, run budget and initialized delivery/product in the processing predicate. The full predicate additionally retains the product lease and `assertUrlDesignDeliveryViewCurrent`. The latter still checks issued-object provenance, actual view length/hash, protected receipt currentness and captured product inputs (`url-session-audit.ts:124-130`). A copied object cannot supply the registered capability.
- `url-run-ordered-attempt.ts:104-121` renews through `input.reproduce`, then `readDesignDeliveryView` against the same protected receipt. That reader authenticates the candidate product and revalidates the recorded delivery identity (`url-session-audit.ts:958-967,1238-1247`), so a changed product cannot become the proof for the held worker result. Failed reproduction or failed verification cannot return true. The post-renewal full check remains mandatory.
- Provider and tool release still use full currentness. Request admission calls `assertCurrent` (`url-run-ordered-attempt.ts:172-174`); the relay checks currentness before actual forwarding and response delivery (`session-relay.ts:310-319,366-378`); tool release receives `requireNextSend`, which includes `requireLive` (`url-ordered-design-session.ts:145-148,508-510`), and the broker invokes that guard at release (`url-ordered-design-host.ts:135-143`). The delta introduces no new output path, secret detector bypass, active-content bypass, recovery permission or deadline replacement.

Verification and limits

[Observed] Source inspection only. No test, native probe, governance battery or product code edit was performed in this review, as requested. The three new parameterized cases at `url-ordered-design-host.test.ts:160-197` exercise a real bounded worker with injected currentness/processing guards: renewal success, changed-proof refusal and revocation before worker capacity charge. Their guarded state and callback assertions are relevant regression checks, but their `current` callback is synchronous and simulated; they do not themselves exercise production reproduction or independently authenticate a real mutated product.

[Unknown] I did not independently verify the reported three focused passes. Full native normal supervisor completion, actual production latency after this delta, and independent stop/resume acceptance remain unverified here. Later diagnostics about the cost of effect attestation are outside the frozen delta and do not establish either success or a specific correctness defect in these reviewed bytes. PASS is a scoped source verdict, not a native acceptance or performance claim.

[Inferred] There is no concrete blocking reproduction to report from this source review. A later implementation change needs its own identified subject; this verdict describes only the frozen bytes above.
