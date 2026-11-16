# Review — three-surface-poc-governedby-reference-amendment
Reviewed commit: abd3f6ca2e8e99ad59327fdfc7b38d8bf41b07b5
Manifest SHA-256: 77e53d37ac42c5db4edb4f99d76d937629df5a80d370ac47751c0e62f27270bd
Verdict: REVISE

Reviewer: OpenAI Codex, independent fresh-context review, 2026-10-21.
Manifest path: `.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt`

## Findings

**Finding 1 — The impact sweep incorrectly excludes the final-byte consumer** (revise)

**Severity: Important.** [Observed] [REQUIREMENT-CONSUMPTION.json:816](/home/tze/.cache/syzygy-post-ceiling-2026-10-21/p115/fresh-review-round-2-c3/workspace/clone/.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/REQUIREMENT-CONSUMPTION.json:816) classifies PWB-REQ-006 as `explicitly-unaffected` because its ceiling and refusal semantics remain unchanged. Its supporting excerpt covers containment, omitting the final-output obligation.

[Observed] Adopted PWB-REQ-006 requires: “Final encoded human HTML and machine JSON SHALL each have an explicit byte ceiling,” with verification using exact final encoded-byte counts. CC-IMPACT-3 defines affected requirements as “those a declaration or a consumption ties to the change.”

[Observed] Independently compact-encoding the supplied inline/reference pair produces 3,553 and 3,365 bytes respectively. At a synthetic 3,459-byte ceiling, the inline representation breaches while the reference representation fits, despite identical effective facts. This is a synthetic counterexample, not a production savings measurement.

[Inferred] PWB-REQ-006 consumes the changed representation. Preserving its normative rule establishes compatibility, not untiedness. The generated sweep and ledger therefore understate the affected set; passing preparation checks reproduce that classification without establishing its correctness.

**Remedy:** classify PWB-REQ-006 as affected by consumption, cite its final-output limbs, document why its normative block remains valid, and retain the final-encoded-byte boundary verification obligation for implementation. Regenerate the sweep and disposition totals. A textual PWB amendment is necessary only if an obligation is invalidated.

**Finding 2 — Two passages contradict the current consumption records** (note)

**Severity: Minor.** [Observed] [DESIGN.md:295](/home/tze/.cache/syzygy-post-ceiling-2026-10-21/p115/fresh-review-round-2-c3/workspace/clone/.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/DESIGN.md:295) and [SEMANTIC-DELTA.md:424](/home/tze/.cache/syzygy-post-ceiling-2026-10-21/p115/fresh-review-round-2-c3/workspace/clone/.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/SEMANTIC-DELTA.md:424) still say four consumption relationships remain explicitly undecidable. The JSON and compatibility appendix now propose affected/unaffected dispositions for those occurrences.

[Inferred] This leaves a fresh reader with conflicting descriptions of the pending gate. Replace those passages with “proposed dispositions awaiting independent confirmation,” preserving the review requirement.

## Strengths

- [Inferred] The closed one-hop representation preserves distinct subjects, complete populations, route metadata and observation/evaluation identity without introducing external lookup or warrant inference.
- [Inferred] RFC6-14/22 permit the proposed semantic reading without requiring inline duplication. POC-REQ-020/022 remain affected consumers whose normative blocks can stay unchanged.
- [Inferred] The positive source-projection and separate PWB anchor boundaries support untiedness for both generator-019 occurrences. Broader canonical-adapter conformance remains Unknown.
- [Observed] The tooling keeps application in scratch space and distinguishes preparation evidence from runtime conformance.

## Verification and limits

[Observed] The required scratch create/read/cleanup probe passed. Head, base, tree, manifest-file digest, 39 candidate paths and six adopted subjects matched the supplied inventory.

[Observed] Both scripts’ preparation checks passed, including the builder selftest: 46 wire cases, 42 compatibility counterexamples, 21 semantic/structure mutants and additional manifest/classifier checks. Independent probes rejected 15 additional malformed inputs and deletions from each retained record population.

[Observed] Independent reconstruction reproduced the six proposed manifest hashes, both semantic-delta twins and the 91-authority dependency union. Source bindings, 130 consumption-record excerpts/digests and preserved coverage rows were checked. Product-test delta is zero; runtime, HTTP/cache, browser and production readiness were not exercised. Static parser diagnostics were not independently rerun.

[Observed] Completion checks found 2,966 tracked files unchanged using both SHA-256 snapshots and Git-object comparisons. The candidate and six-subject inventories remained unchanged; Git status was clean.

## Assessment

**Ready to merge within candidate/preparation scope: No.** Repair Finding 1 and review the resulting freeze. The representation design is supportable, but the impact assessment does not yet satisfy CC-IMPACT-3/5.

[Unknown] Production readiness remains unestablished. Coordinator registration, successor reconciliation, CI recognition, recorder preview and owner-offer preparation remain separate gates; this review grants no adoption or implementation authority.