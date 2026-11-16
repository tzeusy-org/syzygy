# Independent P115 implementation owner-offering review

Reviewer: independent agent `/root/p115_implementation_owner_review`.
Date: 2026-10-27.
Review type: fresh scope and recommendation review of the owner offering and sealed implementation preparation, not implementation review, owner approval, or runtime verification.

Scope verdict: Pass
Recommendation verdict: Pass

## Exact subjects

- Questionnaire: `/home/tze/.cache/syzygy-v1-drive-20261027/p115-owner-r1/QUESTIONNAIRE.md`.
- Questionnaire SHA256: `fcaa5a2f5995f754a2c86990eed08dbb6895bb16706dc5797f6a0d71cfd08db8`.
- Packet directory: `/home/tze/.cache/syzygy-v1-drive-20261027/p115/preparation-973965a-20261027T1332/`.
- Packet ID: `p115-implementation-packet-2026-10-27-r1`.
- MANIFEST.json SHA256: `2a4b38fbae2034e83141425454fcce0a8c0f33c20e3c5e8cb47eddaa22e2ee3a`.
- Initial source head: `973965a82f82d9b90af05e4b96524aae0d9dbec4`.
- Refreshed source head and observed repository HEAD during review: `d621bfa267f24ff68f6f83ac7bfba44b81a32a34`.
- Signed specification tag: `three-surface-poc-governedby-reference-amendment-v1.0`; signed commit `d38d7a3ce632a34c2a41bdb77ad323ba0b05b777`.

All unqualified packet filenames below resolve within the exact sealed directory. Repository source citations resolve to the refreshed source head; inspected producer/reader/identity bodies were also verified against their retained copies.

## Findings and rationale

1. **Severity: none; authority boundary is sound.** [Observed] The signed act expressly states “It authorizes no implementation of the signed semantics” (THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md:42–46). Questionnaire:17,21,40–42 treats the present A as a new implementation/migration decision, requires canonical recording before dispatch, and excludes signed-byte edits. The proposed direction, held bead metadata and packet agree. [Inferred] This is an implementation authorization below the existing signed contract; it neither silently amends the specification nor introduces a new read/consent policy. VIS-4 says “Shape-defining changes always need the owner's sign-off”; that boundary is preserved.

2. **Severity: none; the implementation gap and atomic migration are supported by source.** [Observed] POC-REQ-014 requires one exact shared Unknown and exact local item refs (spec.md:462–485). Actual routes.ts:236–245 still serializes the served logical model; work-items.ts:33–66 still constructs complete per-item logical values. The named TypeScript readers parse current responses directly (fresh-checkout-demo-main.ts:405–407; polaris-accessible-names-main.ts:101–116), and the two Python operators parse retained whole responses before deriving measurements. [Inferred] One producer/owned-reader/parity/cache PR is coherent. The narrow application-boundary module preserves the one logical PocModel; the core work-items edit is expressly comment-only (packet:102). The 30-path allowlist is appropriate to the proposed outcome.

3. **Severity: none; fail-closed and cache semantics are carried through.** [Observed] POC-REQ-014:486–509 requires producer validation before success or cache revalidation, explicit bounded 503, consumer rejection before claims/totals, and the observed-empty/Unknown distinction. The draft direction, matrix, and bead acceptance criteria preserve these requirements, including checking full logical values before pooling, action metadata and key sets, invalid successor after valid predecessor, unchanged evaluation, and no global/default/cross-body resolver. Actual response-identity.ts accepts an unknown complete object; no algorithm change is needed to hash the actual wire object. Actual routes.ts already bounds the full serialized representation before evaluating conditional 304. [Inferred] The proposed insertion order is feasible within the named files and prevents an old inline ETag or matching invalid-response validator from bypassing the new contract. The final UTF-8 ceiling and cause-correct resource refusals remain separate from the wire fault.

4. **Severity: none; verification is proportionate at the authorization stage.** [Observed] The existing governing-intent sweep owns denominators and falsifiers; routes.test.ts already contains independent identity canonicalization, credential admission, conditional response, parity and concurrency seams; response-limits.test.ts owns encoded-byte bounds. The packet replaces claimed machine-model surrogates with real route answers, requires a literal independently written reference oracle, preserves separately served claim/entity identities and human counts, adds Python entry-point admission tests, and requires targeted guard mutations with executed-test denominators (packet:104–110; BEHAVIOR-AND-VERIFICATION-MATRIX.md; TEST-DELTA-PLAN.json). [Inferred] This is sufficient as a reviewable implementation plan. Its planned block counts are not evidence of passing behavior; implementation review must judge actual assertions and expanded cases. Reusing a shared admission routine does not itself prove entry-point wiring, so the prescribed whole-PR review and actual reader fixtures remain material completion gates.

5. **Severity: none; future provenance is kept outside this decision.** [Observed] POC-REQ-014:511–520 admits no new work-item input and says an edge to a warrant needs a further amendment. Doctrine v1.md:83–95 calls V1 provenance directional. The separately inspected charter `/home/tze/.cache/syzygy-v1-drive-20261027/provenance/CHARTER.md` explicitly binds nothing and proposes a real successor to the closed P115 contract; its inspected SHA256 was `853410d3cb8743a29beebd384d4b6537e9dab6c4263e6ebb51cd5e875e9f2d1e`. Questionnaire:24,36,42 properly prevents importing that richer lineage, new record map, supported-encoding negotiation, warrant edges or input authority into P115. [Inferred] A future possible successor does not make this bounded current-spec implementation unsound. Option B accurately offers deferral if the owner prefers to accept the present gap.

6. **Severity: none; operational unknowns are disclosed and held.** [Observed] Packet:112–120 and questionnaire:24,40–42 preserve Unknown external clients, live conformance, active service state and actual savings. The packet requires fresh ownership, canonical dedupe/dependency and actual PR-file overlap checks; title-only overlap evidence is not promoted into clearance. Fixture-only completion excludes private body reads, live probes, providers, restart/deployment and unattended coordination. Source rollback is complete and explicitly restores a specification gap rather than masquerading as a conformant downgrade. [Inferred] These are appropriate gates, not reasons to silently enlarge the requested authority.

## Independent checks performed

[Observed] I read the questionnaire, packet, draft direction, behavior matrix, owned-file list, test plan, Markdown and JSON bead draft, current-source refresh, signed subject list and relevant retained source. I applied heart-and-soul and consulted the engineering-bar skill. I read the relevant VIS and evidence doctrine, V1 provenance passage and the signed POC-REQ-014 directly; author summaries were not used as substitutes for those clauses or source bodies.

[Observed] Read-only scripted checks independently established:

- The questionnaire and manifest hash to the exact subjects above.
- The manifest's 750 declared payload file paths equal the filesystem payload population after its two explicit metadata exclusions. Every declared payload byte length and SHA256 matches the retained file; membership was independently enumerated through the filesystem.
- All 652 current-source population bodies match both their declared hashes and `git show d621bfa...:<path>` bytes. A separate NUL-delimited `git ls-tree` enumeration using the seven declared extensions yields the same 652 paths.
- Re-running the five recorded regex predicates over the retained source yields the same 59 candidate paths. This is a source-census result within its stated extensions/roots, not proof about external or dynamically constructed clients.
- Each of the six signed subjects matches both its signed-tag body and declared hash at the refresh commit.
- Direct old/new Git-body comparison across the 26 existing owned paths finds the declared docs/README.md drift; the other 25 compare equal. The allowlist names four new paths.

[Unknown] I did not independently refresh canonical Beads or remote PR ownership, run product/governance tests, inspect external consumers, or inspect any live service. Those results are not claimed by this review. No product source, governance artifact, Beads record, signed packet, or historical evidence was mutated. This raw review is the sole review output.

## Permitted administrative finalization

This Pass permits only administrative questionnaire state and review-record updates to report this review, with decision ID, question, recommended option, all options, packet binding and authorization boundaries unchanged. Preserve this raw review verbatim and keep the owner decision pending until the actual answer. Any semantic correction to the decision, options, recommendation, scope, files, verification obligations or boundaries requires an independent review of the exact revised offering; this verdict must not be transferred to changed semantic bytes.

The review grants no implementation or owner authority. A is sound to offer; only the owner's actual selection and subsequent canonical recording can open the described implementation gate.
