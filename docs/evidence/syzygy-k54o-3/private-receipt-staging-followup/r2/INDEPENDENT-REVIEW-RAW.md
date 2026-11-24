PASS

Independent review of corrected expanded R2 eligible-private-receipt-staging packet.

Scope and byte binding

[Observed] Reviewed review.json and change.patch against base commit 74dd20378651d366ed53fb7de08fe60ba9d33c67. Scripted SHA-256 checks matched the manifest for both base snapshots, both target snapshots, and the patch. Both base snapshots equal git-show bytes from that base commit. An independent in-memory application of each patch hunk reconstructed the two frozen target files exactly.

- Runtime url-origin-ledger.ts: e96a2783771ae5c22e9ca7403bb40a161a964d7bf603a53a653ebf65786a2a4c
- Tests url-origin-ledger.test.ts: 84c792bdfcf5a6aa0a1c7c8660ce2d9ce9731de26246e7a12962062a19c747ca
- Patch: d549f5d4f05fbafd0f25e63a2c5f9fa9a5fff6f653220f1f4a1c7f7bf7d1f7fb

[Observed] Review used the supplied packet, repository AGENTS.md, heart-and-soul/security doctrine, engineering-bar, the applicable craft security/testing policies, RFC3-16(d).5/.6, and the unchanged source-reader, source-binding, hash, freeze and canonical-JSON implementations. Those supporting implementations have no committed delta from the declared base to the inspected checkout head. No source, index or commit was changed by this review.

Decision and findings

[Inferred] PASS for the exact scoped implementation and test delta. No corrective finding identified in that delta. This is an independent source review, not a claim that the full validation battery or a native dossier run passed.

[Inferred] Relevant risk floors are CC-BAR-5 truth/evidence/security: receipt authenticity/current authority and secret-screened source provenance remain security boundaries. This packet does not introduce a new screening exemption, authority cache, public API, provider route, or source-store profile.

Constructor staging and R1 repair

[Observed] At runtime lines 176-183, each iteration checks checkedFixed.length against limits.receipts before reading the next root body. snapshot receives min(itemBytes, bytes - fixedBytes), and rejects an over-budget length before Uint8Array.from. The captured aggregate increments before safe() and retention. Thus the R1 path that could stage approximately 1 GiB under an 8 MiB ledger budget is removed: retained fixed-body snapshots are bounded incrementally by the aggregate budget, with the item and receipt caps also retained. Empty bodies still consume bounded receipt population. The extra iteration check also covers a fixed array grown during a trusted screening callback.

[Observed] Fixed bodies are screened before the final constructor live() at line 613. The insertion loop at lines 616-620 operates on captured private id/kind/byte records. A failed final authority check reaches no insertion and returns no ledger. The subsequent return exposes only the completed ledger API.

Private publication audit

[Observed] The eight insertReceipt call sites are: issue wrapper at line 137; whole-body helper at lines 347, 348 and 349; span at lines 393, 394 and 396; constructor at line 618. insertReceipt is local and is not returned or exported. Its resource checks precede receipt/metadata allocation. It retains the original count, aggregate-byte, item-byte, declaration consistency, lineage and opaque-receipt handling.

[Inferred] The authority consolidation is safe within these bounded synchronous regions. The issue wrapper still calls live(). The constructor uses its final live(). verifiedSpan retains entry authority, actual reader pre/post authority, and post-await authority at line 381; structure screening finishes before the explicit final live() at line 391. No screening/schema/role/current callback or await occurs between that final sample and its private receipt insertions/result construction.

[Observed] issueWholeSourceBody retains check() after the post-await digest/identity construction at line 338 and check() after safe(structuralBytes) at line 343. The identity-reuse path returns only after that fresh initial check, following the caller's fresh verifiedSource read. The new issuance branch uses private insertion and lookup with checkTime after the first two insertions and before capability publication. Its post-final-check dependencies consume private plain/frozen data; sourceBindingSha256, canonical JSON, hashes and deepFreeze do not invoke an external composition callback for those values. The helper has two private callers; neither supplies an arbitrary callback. sourceWhole retains its subsequent inspectWholeSourceBody authority guard.

[Observed] verifyWholeSourceBody still snapshots caller bytes, independently rereads and screens the pinned full body, and checks exact object identity and byte equality before helper issuance. inspectWholeSourceBody still verifies the origin through entry(). Restore's separate source read followed by public verifyWholeSourceBody is unchanged.

[Observed] The actual source reader still checks current authority and named-store identities before object reading and after body screening. verifiedSource still applies path/class admission, full-body treatment, strict decoding, safe() and operation time checks. sourceOperation retains active/deadline checks and invalidates late asynchronous completion. The adopted 10,000 ms operation limit and tighter caller limit admission are unchanged. A source span's existing read-operation deadline scope is unchanged; this review does not reinterpret it as an end-to-end call deadline.

Regression tests and limits of verification

[Observed] The packet modifies four existing cases. Two source-based counts independently found 27 it declarations in both base and target; net case growth is zero. Added assertions exercise constructor authority brackets and exact root population, final fixed-screen withdrawal without a returned ledger, aggregate exhaustion before screening the excess body or reading later bodies, and population growth refusal before accessing excess bytes. Span assertions exercise the five retained samples for both new and duplicate spans, stable duplicate plans, the tighter read limit, and final structural-screen withdrawal with unchanged plans. Whole-body assertions exercise slow authority within the unchanged operation limit and final structural-screen withdrawal without a capability or new plans.

[Inferred] These are meaningful regression assertions: the original per-root constructor probes violate the two-sample expectation; the unbounded R1 staging screens an excess aggregate body/accesses a dynamically added excess body; the original whole-body helper exceeds the synthetic slow-authority operation deadline; and removing the newly positioned final guards lets structural-screen withdrawal publish state. Existing exact-reread corruption, tail-secret/redaction, store replacement/profile, late-I/O and concurrent-operation tests remain in the file. This predecessor sensitivity is established by source comparison here; it is not represented as an executed predecessor/mutant run.

[Unknown] This reviewer did not rerun the 27-case suite, typecheck, broader battery, or mutation runs; the parent is independently running validation in its private clone. The manifest itself records tests/typecheck as not yet run on the frozen R2 bytes. Review PASS does not supply missing execution evidence.

[Unknown] Native dossier completion, seven-minute completion, real elapsed improvement and end-to-end performance remain unmeasured. Reduced authority-call counts explain the intended optimization but establish no native success or speedup.
