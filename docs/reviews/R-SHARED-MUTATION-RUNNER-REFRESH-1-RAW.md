# Independent review — runner R2 with 2026-10-28 source/consumer addendum

Scope verdict: Revise
Recommendation verdict: Revise
Authority-wording-change determination: No change to the R2 proposed authority wording is required for this refresh. Correct the addendum's contradictory migration disposition before offering the composed packet.

[Inferred] Reviewer: runner_authorization_review, 2026-10-28. This review concerns the exact composed owner offering and its freshness evidence. It grants no implementation authority, performs no owner act and establishes no runtime proof.

## Exact binding

Refresh directory: /home/tze/.cache/syzygy-p115-authorization-20261028/runner-next-refresh/
Fresh source subject: 95c87a52b5a03ef4b1842e82b1c1b961cb51daa3
Predecessor source subject: d621bfa267f24ff68f6f83ac7bfba44b81a32a34

| Artifact | SHA-256 |
|---|---|
| runner-next-refresh/MANIFEST.json | 965801d5c5068cb7356cc52ad61cffda9ee7813a6c08ef5b5f5233b94f281eb8 |
| runner-next-refresh/ADDENDUM.md | 44f4a6514c07d6731053098e53e2b43991bf9b7809319a98114947308fd50dd4 |
| runner-next-refresh/REVIEW-BRIEF.md | 6910151de40a9380719d6ea7c4b7eb7e1923edac7630f2fe470c71e75b348871 |
| runner-authorization-r2/FREEZE-r2.json | ca8017387ba4351c16396528968e0a02b8c2d411d74d3312904ce6016ad8d8bd |
| runner-authorization-r2/OFFERING.md | 70517831f25ff27717010df29a6f6596ba34edb10edcb89acef24821733e14a9 |
| runner-authorization-r2/DRAFT-DIRECTION.md | bf60fef15719c823652438307925e1cf395c6acddfe677b8e28fe16c4a3c034a |
| runner-authorization-r2/BEHAVIOR-AND-CONSUMERS.md | df1a44f38822d8f725c9094a79eda8f3af48a33340a430841b3f1e7926292953 |
| runner-authorization-r2/consumer-sweep.json | bad96760953c7221df7dd2098667cdb58eccabbb98e542e7292904385da40a43 |
| runner-authorization-review-r2/RAW.md | cb9a2185127f0fbb38a80efce3a529c4faa0b43d76f345087064b6e99a451be0 |

The R2 paths above are under /home/tze/.cache/syzygy-v1-drive-20261027/. The refresh manifest binds the remaining evidence inputs individually. Prior raw reviews were preserved.

[Observed] Checked both byte length and SHA-256 for the manifest's 43 local entries and six external entries; each matched. Independently compared all 24 retained source copies with Git objects at the fresh subject; each matched. The unchanged R2 hashes preserve the previously reviewed authority language and recommendation tradeoff.

## Required correction RFR-1 — contradictory prompt-runner migration disposition

[Observed] ADDENDUM.md section 4 says that the new explicit locator discovers five ordinary scripts, identifies the fifth as the already named prompt runner, then concludes: “Their retained hashes and source bytes support the disposition; none is proposed for migration.” The corresponding retained list names scripts/polaris_prompt_mutants.py. R2 DRAFT-DIRECTION.md section 5 explicitly includes that script's plan obligations in the migration, and section 2 of the addendum does not remove it.

[Inferred] The literal statement contradicts the composed migration scope. “New to this locator candidate set” does not mean newly introduced migration scope. Although the intended reading is reasonably recoverable from “already named”, an exact owner offering should not make the implementer choose between preserving R2's prompt migration and this categorical exclusion.

Required correction: replace the categorical sentence with an explicit distinction, for example: “The four other ordinary scripts remain outside the migration. The prompt runner remains in the migration already named by R2; this census adds no migration scope.” Update and rebind the addendum/manifest, then obtain a bounded recheck. Do not remove the prompt runner from R2, weaken its per-mutant baselines or introduce a new owner decision. This is the sole required correction from this review.

## Assessment of the remaining composition

[Observed] source.diff shows only comment changes in the generation runner and scheduled workflow; their executable restoration, reporting and exit logic is unchanged in that comparison. plan-and-guard.diff separately captures the repaired outer repair-cap fragment and moved unique guard, plus the new generation-mutation.test.ts. The plan's 12 IDs and 12 mustFail literals remain unchanged. The new guard imports and checks the plan, fragments, emitted JavaScript, IDs, allowed subject location and must-fail titles in the legacy runner's test population. It is a source/plan consumer, not a new evidence-schema reader.

[Observed] The retained PR543 and PR546 snapshots identify their merge commits and MERGED status. Both merge commits are ancestors of the fresh Git subject. The seven selected tracker rows exactly match their rows in the retained 916-record snapshot: kpbq closed, producer and two finding beads blocked, u05.11 open/assigned Tzeusy, vsqr in_progress/assigned lane-b, and bpyt.47 open/unassigned. The retained PR550 snapshot is OPEN at 5cf4223a184baab1a748566b2f46053dcda72e58; its four-file patch set contains the described AST/path/title guard changes. The retained PR549 file set includes package.json and its build-resolution changes. These are facts about the captured inputs, not a claim of continuously current remote state.

[Inferred] Preserving the legacy plan/runner/test boundary is a sound consumer disposition under R2 section 6. The old source guard cannot prove what command the replacement engine executes, and the addendum states that distinction explicitly. R2's existing process-boundary and migration mappings are the appropriate proof for the new engine. No new guard weakening, relocation or retargeting is authorized. Refreshing PR550 and PR549 and reconciling overlap with their actual owners remains necessary even though the old PR543 prerequisite has landed.

[Observed] The retained PR546 disposition says items 5 and 6 stay open because they change runner or gate behavior. The tracker describes these as restoration checking after a throw and two additional reviewerBlocking mutants. The addendum explicitly leaves them separate, excludes a historical outer-finally patch and historical evidence rewrite, and does not authorize increasing the generation plan from 12 cases. It also declines to add a separate workflow behavioral exception.

[Inferred] The new engine still owes R2's integrity/restoration/error behavior. That obligation does not silently close vsqr or authorize historical runner changes. Later landed proof may inform a separate finding disposition. This boundary is appropriate and needs no amendment to R2's authorization wording.

[Observed] Independently repeated the literal locator over Git objects: 7144 blobs, 7132 UTF-8 non-NUL text paths and 189 matching paths. Exact hashes and line/seed records matched consumer-sweep-current.json; git grep -F -I independently reproduced the path set. Independently repeated the published read/access regex pair over the stated code extensions excluding .test.: 1264 code paths and 201 candidates, with exact candidate hashes matching the retained census. Separate git grep -P results for the two expressions reproduced the intersection. All 113 predecessor broad-candidate hashes still match. The explicit predicate yields 94 candidates absent from that older list.

[Inferred] The addendum honestly distinguishes this newly executable locator from the predecessor's prose-only predicate. Candidate counts are not semantic consumer counts. The inspected four non-runner ordinary scripts use governance/reconciliation/probe records or fixed witnesses; the prompt runner is already accounted for by R2. Historical tools remain retained, and new-format outputs are not advertised or supplied to them. The new runner and currency adapter remain the only proposed automatic new-schema readers. External, untracked, dynamic and future consumers remain Unknown. Subject to RFR-1, the coverage and limits are adequate for the proposed bounded offer; they do not remove the requirement for a fresh actual wiring/consumer map at implementation head.

[Observed] R2's revised recommendation still discloses runtime added to already controlled plans, refusal of all selected mutation work when an initial group fails, and preservation of genuine earlier results when a later required baseline fails. The addendum changes none of those semantics. GP-Q0's restriction on unlisted output/refusal changes remains the governing reason an actual runner owner direction is required.

[Inferred] The substantive A recommendation remains supported after this refresh. Correcting RFR-1 is sufficient to make its scope description consistent; no additional owner choice, M0 design or generic refactor waiver is needed. An owner selection must identify the exact reviewed R2-plus-addendum composition. P115 approval cannot count as runner approval. Review clearance itself cannot count as that selection.

## Verification limits and next step

[Unknown] New-engine implementation, synthetic replay/refusal proof, legacy-reader rejection-before-write, real-plan parity, current remote ownership after capture and dispatch readiness remain unestablished. No test suite or mutation runner was executed. The census and hash checks are source/evidence verification, not runtime migration proof.

[Observed] No tracker, source, PR, act or earlier raw review was edited; no observed repository body was read and no live action or owner question was issued. Only this new raw review was written.

[Inferred] Reissue only the corrected addendum and its manifest, preserve this raw, and obtain a bounded exact-byte recheck. Then the unchanged R2 choice may be considered for presentation subject to its remaining owner/freshness gates.
