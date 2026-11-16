# Review — three-surface-poc-governedby-reference-amendment
Reviewed commit: b81f2cf480e57ce7741b32e9d9a55e713d77ab66
Manifest SHA-256: 7bdec5525110db8728dd06afa09bbf8e0501d43aa15b436d33da2bd459bbff4c
Verdict: REVISE

Reviewer: OpenAI Codex, independent review — 2026-10-21  
Manifest path: `.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt`

### Fresh-reader intent and constraints

[Inferred] This amendment replaces repeated machine-wire `governedBy` values with one complete value per identified observation and an exact local marker on every item. Expansion must preserve distinct item claims, the complete served population, observation/evaluation identity, and the existing human counts, reason, route, warrant statement, markings and narrowing behavior.

It remains a candidate specification amendment with preparation tooling. It grants no implementation, source-read, signing, adoption or release authority.

### Strengths

- [Observed] The frozen inventory matches the exact head/tree, all 16 changed artifacts and their hashes, the manifest file, and all six unchanged baseline subjects.
- [Observed] Independent in-memory reconstruction matches all six proposed manifest-row hashes. Only POC-REQ-014 changes among 26 requirement blocks; the other 25, including POC-REQ-060, remain exact.
- [Observed] The wire contract specifies a closed marker, one-hop resolution, no fallback, complete action metadata, explicit refusal before successful cache revalidation, and separate observed-empty/failed-observation behavior.
- [Observed] The coverage successor preserves Part A’s 147 predecessor rows, including 42 Unknown dispositions, and adds seven bounded consequences. The generated dependency mappings match the proposed declarations.
- [Inferred] The RFC6-14 compatibility argument is reasonable: a total local reference can preserve verbatim semantic state without merging claim subjects. RFC6-22 defines equivalence semantically. This does not establish full RFC6-14 conformance or discharge inherited Unknowns.

### Issues

#### Critical — Must Fix

No critical finding identified within this preparation-only scope.

#### Important — Should Fix

**1. The proposed requirement omits its material owner-direction warrant.**

- **File:** [SEMANTIC-DELTA.md:365](/home/tze/.cache/syzygy-post-ceiling-2026-10-21/p115/fresh-review/clone/.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/SEMANTIC-DELTA.md:365)
- [Observed] The proposed `decisions` declaration remains empty, although the delta’s own Warrant section identifies `OWNER-DIRECTION-MACHINE-CEILING-2026-10-15`, item 2, as the source of the serve-once obligation.
- **Why it matters:** CC-SPEC-2 requires “all material governing warrants.” CC-IMPACT-1 generates dependencies only from those declarations. A narrative citation leaves this recorded product direction outside the generated dependency graph.
- **Fix:** Declare the recorded direction using the repository’s decision-identity convention; regenerate the dependency patch, proposed hashes and manifest. Preserve the direction’s drafting-only limitation.

**2. The preparation oracle accepts violations of the proposed sharing and identity invariants.**

- **Files:** [builder:182](/home/tze/.cache/syzygy-post-ceiling-2026-10-21/p115/fresh-review/clone/scripts/build_three_surface_poc_governedby_reference_amendment.py:182), [builder:210](/home/tze/.cache/syzygy-post-ceiling-2026-10-21/p115/fresh-review/clone/scripts/build_three_surface_poc_governedby_reference_amendment.py:210)
- [Observed] In-memory counterexamples produced no fixture findings after:
  - adding a complete duplicate value as an item’s `governedByCopy`;
  - deleting the evaluation, observation provenance and capture instant;
  - changing the rendered population from `["A"]` to `["A","A"]`.
- **Why it matters:** The oracle checks designated fields and returns bare item IDs. It does not establish the required complete-value occurrence census or evaluation/observation-bound claim identities. Converting rendered IDs to a set also loses population multiplicity. These are central acceptance predicates for this representation change.
- **Fix:** Extend the existing preparation fixtures and oracle with literal bound identities, a complete-value carrier census, and independent rendered-population expectations. Add counterexamples proving each predicate fails. This requires preparation-level checks, not unauthorized runtime implementation.

**3. The impact classifier substitutes declaration matching for consumption assessment.**

- **File:** [builder:257](/home/tze/.cache/syzygy-post-ceiling-2026-10-21/p115/fresh-review/clone/scripts/build_three_surface_poc_governedby_reference_amendment.py:257)
- [Observed] A complete six-class declaration without a direct changed-ID warrant automatically becomes `explicitly-unaffected`. Full requirement text does not participate in that decision.
- [Observed] An isolated synthetic requirement explicitly consuming `POC-REQ-014` and `governedBy` in prose, with complete empty warrant arrays, was classified `explicitly-unaffected`.
- **Why it matters:** The ledger promises full-text examination. CC-IMPACT-2 includes vocabulary consumption, and CC-IMPACT-3 explicitly limits what declaration matching can establish. The file-level citer search does not repair the per-requirement classification.
- **Fix:** Assess consumption at requirement-block level and retain specific semantic dispositions. Unresolved relationships must become undecidable with settling evidence named. Add a focused classifier counterexample. This finding demonstrates an unsound predicate, not a proven missed dependency in the current eight-file population.

All three Important findings block candidate sign-off.

#### Minor — Notes

[Observed] Recorder registration, successor reconciliation, CI recognition and owner-offer preparation are explicitly pending in RECORDING-PREPARATION.md. These are disclosed coordinator gates, not additional defects in this bounded authoring scope. They remain required before an executable owner offer.

### Recommendations

Repair the declaration and preparation predicates together, regenerate affected artifacts, and obtain fresh review of the resulting exact head. Preserve the existing separation between specification acceptance and later implementation authorization.

### Verification and limits

[Observed] Completed:

- Exact inventory, Git population/object, file hash and baseline-subject verification.
- Strict in-memory reconstruction of five patches and verification of six proposed hashes.
- Exact requirement-block and semantic-delta comparison.
- Independent declared dependency-union and Part A coverage checks.
- Isolated execution of the preparation fixture functions: 35 cases matched their literal expectations—four valid and 31 refused.
- In-memory counterexamples described above.

[Observed] Both builder `--check` and `--selftest` stopped because no writable temporary directory was available. Their complete results remain unverified. No production-suite tests changed; the added checks are preparation fixtures/selftests.

[Unknown] Installed behavior, actual consumer compatibility, cache integration, human runtime parity and byte savings remain unverified. The repository-wide content sweep was not independently repeated beyond the permitted reading scope.

No sources or adopted subjects were edited. This raw is returned here; the read-only sandbox prevented saving a `-RAW.md` file.

### Assessment

**Ready to merge? No—fixes required for preparation sign-off.**

[Inferred] The proposed wire design is bounded and understandable, but its warrant declaration, fixture oracle and impact classifier need correction before confirmation. Even after confirmation, coordinator preparation and owner signature remain separate gates; this review authorizes neither implementation nor production use.