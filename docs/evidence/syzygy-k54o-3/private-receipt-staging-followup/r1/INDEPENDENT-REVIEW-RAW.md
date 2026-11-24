# Independent source review — private receipt staging
Verdict: REVISE
Reviewed base: 74dd20378651d366ed53fb7de08fe60ba9d33c67
Patch SHA-256: 9b2ed3d4633ca05832ff7f859d5b7b80241923482c4dc1e50995795f32218a0a

[Observed] Frozen subjects:

- packages/polaris-dossier/src/url-origin-ledger.ts — SHA-256 acabf7710bfbff58057baaee49cb10a95120326362c4f9f97f7104a7ca2f69e3
- packages/polaris-dossier/src/url-origin-ledger.test.ts — SHA-256 35e6435b0ddab7b8d4dc4d80482441d6254b08b58af078e1269eb162e8261faa
- review.json — SHA-256 58dce401e30a3e92781dcfae4c5820eb27b20c6f852502b5306b497353ebf6df

[Observed] I independently matched each retained base source to git show at the named base in /home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w, verified its declared digest, and reconstructed both frozen sources from the patch in memory. This review covers these frozen source bytes and their test changes. It does not certify runtime completion, performance, the enclosing branch, or later edits.

Finding R1 — preserve the aggregate fixed-root staging bound (material)

[Observed] Frozen url-origin-ledger.ts:174–179 snapshots and retains each fixed body's bytes in checkedFixed before the first insertReceipt call at lines 607–613. The cumulative storedBytes limit is checked only inside insertReceipt at line 143. The baseline instead issued and charged each root immediately after its screen (base-url-origin-ledger.ts:168–173); crossing the aggregate limit stopped that loop before later roots were copied or screened.

[Inferred] The new staging loop can copy and screen the remaining fixed population even after the configured cumulative byte budget has been exceeded. With the declared defaults (1024 receipts, 1,048,576 bytes per item, 8,388,608 aggregate bytes), the retained checkedFixed payload can reach 1,073,741,824 bytes before the 8,388,608-byte aggregate refusal. This is a source-derived upper bound, not a measured allocation. A smaller counterexample is three individually valid roots with an aggregate budget smaller than the first two combined: the patched constructor reaches the third screen, while the baseline refuses during the second root's issuance. Generic refusal and lack of a returned ledger do not preserve the earlier resource bound or stop point.

[Observed] RFC3-16(d).6 requires: “Maintain finite record/instance/client/parse/I/O/lock/output/wall bounds under the original run deadline, rejecting exhaustion”. The brief also explicitly requires unchanged bounds/error semantics. [Inferred] Deferring aggregate enforcement until after population staging violates that requested invariant even though a looser product-of-limits bound remains finite.

Required repair: account for cumulative staged fixed bytes and staged receipt count while gathering the screened roots, and refuse exhaustion before retaining another over-budget population or proceeding to later roots. Keep the final fresh guard and callback-free insertion block. Extend a nearby existing bounds/fixed-root test with a small aggregate-byte limit and a later-root screen sentinel so delayed enforcement is detectable; preserve the no-new-cases constraint.

Other reviewed properties

[Observed] The helper call census contains five insertReceipt call sites: issue's guarded wrapper, three verifiedSpan insertions, and constructor insertion. The helper is lexical and absent from the returned API. At the two newly batched blocks, the final live() follows screening and the following insertion inputs are captured local values; the block contains no await or screen/schema/current callback invocation. The unchanged issue wrapper retains live().

[Observed] verifiedSpan retains entry and post-read live(), structure screening, and final live() before its first insertion. The baseline source reader brackets read/screen with its own check() at url-source-reader.ts:69 and :73. The frozen patch does not modify that reader. Duplicate-plan detection and receipt accounting remain in insertReceipt. [Inferred] Aside from R1, the inspected insertion paths preserve those mechanisms; no runtime claim follows from this source inspection.

[Observed] The test patch extends three existing cases; both frozen test files contain 27 direct it declarations (checked by regex and literal occurrence count), a net change of zero cases. The added constructor and final structure-screen withdrawal assertions test public refusal/no-publication behavior. The slow-authority case also checks the new and duplicate span probe counts and unchanged plans. [Inferred] These extensions are relevant, but do not detect R1's delayed aggregate enforcement.

[Observed] SEC-5 states: “Anything that matches the declared secret-detection policy, or cannot be classified, is excluded”. Existing screening calls are retained in the reviewed delta. VIS-4 places ordinary implementation fixes with agents while reserving weakened secret detection/fail-closed behavior to the owner; this review requests no screening-policy relaxation.

[Unknown] Tests, typecheck, mutation checks, native execution and performance were not run by this reviewer, as instructed while the parent held the active verification slot. The source finding is sufficient for REVISE without a runtime verdict.
