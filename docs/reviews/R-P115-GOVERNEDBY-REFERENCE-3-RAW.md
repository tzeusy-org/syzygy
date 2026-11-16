# Review — three-surface-poc-governedby-reference-amendment
Reviewed commit: 9ef5d35836e722abbd4041900fa27bd02f82e277
Manifest SHA-256: 77e53d37ac42c5db4edb4f99d76d937629df5a80d370ac47751c0e62f27270bd
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: OpenAI Codex, independent fresh review; date: 2026-10-21.
Manifest path: .syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt

## Findings

**Finding 1 — Patch population guard collapses duplicate basenames** (note)

Severity: Minor. File: scripts/build_three_surface_poc_governedby_reference_amendment.py:93.

[Observed] `collect()` keys recursively discovered files by basename before checking the population. In owned scratch, adding an identical `proposed/nested/spec.md.patch` produced six physical patch files, yet collection succeeded, structural findings stayed empty, and the proposed manifest remained identical. The guard therefore does not enforce its advertised exact five-file population. The frozen subject itself contains the correct five patches, so this does not invalidate its proposed bytes.

[Inferred] Compare exact relative paths and physical cardinality before constructing the mapping; reject nested/duplicate entries. Extend the existing selftest with this counterexample. This is preparation-gate hardening, not a demonstrated semantic or authority bypass in the reviewed freeze.

**Finding 2 — One retained source span extends beyond its source** (note)

Severity: Minor. File: .syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/compatibility/COMPATIBILITY-MAP.json:296.

[Observed] The exact-tables definition cites lines 6–90, but its named immutable source at eba011dfbe254c09a88ccc374b3efe5ff5df1762 has 68 lines. Its file hash and Git blob match. The oversized range still encompasses the relevant functions, so the bounded input-separation argument survives, but the stated span is not exact.

[Inferred] Correct the current mapping to the actual function bounds and validate source-span endpoints. Preserve sealed historical evidence rather than rewriting it.

## Semantic assessment and strengths

[Inferred] The proposed contract is understandable and sufficiently closed: one complete Unknown value per observed work-item observation, literal local markers on every item, one-hop expansion within that body, and distinct item claims and existing full records. Observed empty and failed observation remain different cases. Invalid forms refuse before success or cache revalidation; no title-derived warrant, new source read, fallback, or external lookup is admitted. Human rendering continues from the logical model.

[Inferred] RFC6-14 requires verbatim epistemic state; RFC6-22 defines equivalence over “semantics and query results.” Lossless local expansion with preserved subjects is compatible with those obligations. POC060's closed entity/relationship record population remains unchanged. The seven added consequence rows do not establish broader freshness, secondary-annotation, or full-record conformance; inherited Unknown coverage remains open.

[Inferred] The occurrence assessments adequately distinguish affected consumption from textual invalidation within the named eight-specification, 130-occurrence corpus. Both GEN019 convention-preservation limbs remain affected despite the narrower current readers. POC020/022 remain affected with valid unchanged equality obligations. Actual-byte, whole-sink, identity, derived-view and resource-readiness consumers are included. The proposed 15 affected / 115 explicitly unaffected / 0 undecidable classifications are bounded source judgments, not a complete runtime consumer inventory.

[Inferred] A response-only wire-fault `readiness:false` adds neither a retained PWB021 readiness arm nor a PWB022 invalidity case. Existing resource breaches still engage PWB021. A future implementation changing those boundaries needs its proper companion amendment.

## Verification and freshness

[Observed] The required TMPDIR creation/write/read/cleanup proof passed. With Python bytecode disabled, the builder's `--check` and `--selftest`, and the compatibility helper's `--check`, passed. Outputs covered 46 wire cases (7 valid, 39 refused), 15 retained wire counterexamples, two classifier regressions, 42 compatibility counterexamples, and 36 mutation records rejected at their intended predicates. These are new preparation checks; no product tests were added or executed by this review.

[Observed] Independent checks matched 130 requirement-block digests, 139 excerpt mappings, four compatibility governing blocks, 36 source-map objects, and the 483 named static-corpus blob bindings. A separate Node probe restored the complete literal inline projection by expansion and reproduced all 18 byte-threshold expectations: reference overhead was +258 bytes at N=0, +35 at N=1, and −188 at N=2. No all-population saving follows.

[Observed] Final preservation checks matched the initial inventory for all 2,985 tracked byte/object pairs, separately matched all 58 frozen core paths and six adopted baseline subjects, and reconfirmed HEAD, tree and manifest FILE hash. Git remained clean. Historical disposition/outcome files were checked only for preservation; earlier raw reviews were not consulted. Synthetic files and logs stayed under owned TMPDIR.

## Readiness and limits

[Inferred] The bounded candidate amendment and preparation tooling are confirmed with the two minor notes above. This is not production readiness, owner adoption, implementation authorization, or an unconditional merge approval.

[Unknown] Actual serializer/HTTP/cache behavior, failure-envelope bounds, complete product parity, canonical/external consumers and production savings remain unverified. Global registration, successor reconciliation, CI recognition, recorder readiness and owner-offer preparation remain separate coordinator gates. The permitted checks do not discharge them.