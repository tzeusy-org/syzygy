# Independent review: PR818 / syzygy-fnry.17
Verdict: CONFIRM
Reviewed commit: 05216cb11ae7ff6f5f57f72cb7ecbdf766bc23aa
Review content SHA-256: 411c20165e75f39519a17fd1a23588a230d923d9459e3e2e6c6afd3dc5d226c7

Reviewer: OpenAI Codex native independent subagent `/root/review_fnry17`; authenticated GitHub login `Tzeusy` (shared transport identity, not claimed independent human authorship). Review date: 2026-11-14. Canonical review: syzygy-n535. Worktree: /home/orca/orca/projects/syzygy/.worktrees/parallel-agents/review-syzygy-n535, branch review/syzygy-n535.

[Observed] Subject is PR818 at the reviewed commit against base 5be0fce2e872563b581a56399e8be5f6880a19cc; reviewed tree 8509e1e80615bf06044b04e3fc9445dc97b511b0. The content identity above is SHA-256 of `git diff --binary <base> <reviewed commit>`, calculated by script. The complete diff contains 13 paths, listed with scripted file identities below. Local HEAD and the remote PR head matched immediately before this raw was written. Runtime-context helper passed, the review worktree was clean, and the complete thread helper returned thread_count=0/unresolved_count=0. This reviewer authored no source/test correction, changed no Beads/GitHub lifecycle state, and performed no merge/enqueue action.

[Inferred] The reviewed source satisfies the released audience slice. No outstanding source/test finding was evidenced in the 13-path diff, its relevant production callers, configuration validation, supervisor start/resume seams, or packet-rebuild/review-identity paths. This is a content verdict, not authorization to land or a claim of full generator/product completion.

Governing references and scope

- [Observed] POLARIS-GENERATOR-IMPLEMENTATION-AUTHORIZATION-ACT.md authorizes the implementation goal while leaving project reads, provider egress and writes separately admitted.
- [Observed] REQ-polaris-generation-002's understanding-amendment overlay states: “The editorial plan SHALL identify the central reader question, supported thesis, progression of explanations, material tensions, stopping-depth obligations and reasons for diagram, glossary and deep-dive selection for the chosen audience.” This review addresses only the declared-audience propagation defect, not those wider proof obligations.
- [Observed] docs/pursuits/2026-11-09-vision-pursuit.md's `pursuit-2026-11-09-release` owner-decision row releases `.17` as P4 slice 1 while keeping the broader gate open. The PR changes no governed/spec/standards/guidance bytes and does not enter PR817/fnry.19's round-3 gate.
- [Inferred] Medium complexity/risk is appropriate. I confirm the amended change record's CC-BAR-5 floors 2 and 3: criteria participate in the evidence identity used to count a design review, and the declared audience remains explicitly Inferred. CC-REV-1 class 6 applies to the CLI refusal and brief/packet consumer interface. These declarations waive no floor or review. The inference label is preserved and the new missing-audience path refuses before setup effects.

Acceptance mapping

1. [Observed] MET: brief.test.ts:134 extends the existing four-topics case using run.json's literal Redis audience. It isolates `What the dossier answers` and asserts both the quoted audience on its own line and the literal reader qualification naming RS-2, readability, voice and the newcomer bar. brief.ts:130 calls the shared helper with `declared.audience`.
2. [Observed] MET: brief.test.ts:175 exercises a multiline audience containing LF, a line beginning `# `, CRLF and a tab. It asserts the expected one-line quoted text within the section and equality of the complete heading-line arrays, which is stronger than equality of their counts. audience.ts:5 collapses every JavaScript whitespace run and trims the result before surrounding it with double quotes.
3. [Observed] MET: BRIEF_VERSION is v7; brief.test.ts:82 and :108 pin that literal. Scripted base/current comparisons confirm the reader-standards source plus both skill references unchanged. The DOSSIER_GUIDANCE, READABILITY_GUIDANCE, their versions and VOICE_RULES declaration blocks compare unchanged to base. The retained exact-content tests cover byte-equal standards copies, guidance digest and pure rendering. Audience is a separate per-run qualification; standards/guidance were not reworded.
4. [Observed] MET: designCriteria accepts and includes the audience and shared qualification. render.test.ts:1428 pins both texts as literals; design-review.test.ts:46 changes only audience and asserts a different packet digest. The two renderRun packet builds and buildStoredDesignPacket pass the validated stored `declared.audience`; packet validation therefore rebuilds the same criteria-bearing subject instead of relying on a separate audience store.
5. [Observed] MET: polaris.ts:288-289 refuses a new supervisor without a declared nonempty audience before Screen/setup. polaris-launch-guidance.test.ts:14 exercises absent, whitespace-only and missing-resume-state forms at the CLI boundary and asserts refusal plus an empty temporary state root. The existing start prompt/forwarding behavior is retained; an actual stored supervisor can resume without repeating audience input. A fixed-string source sweep and independent Python count both find no `'unspecified'` literal in polaris.ts (one-file denominator).
6. [Observed] MET as retained mutation evidence: docs/evidence/syzygy-fnry-17-audience-mutations-2026-11-14.json names commit, runner, exact old/new fragments and source/test SHA-256 values. I recalculated the five named source/test file hashes at both the mutation subject commit and reviewed head; each matches the record, and each old fragment occurs once in current source. The runner hash also matches. The two recorded mutants fail the intended brief and criteria literal assertions respectively; the retained unmutated control reports 109 passing cases. Mutants were not re-run in this read-only snapshot; source/test equivalence and final-head hosted CI support reuse without mutating the reviewed checkout.
7. [Observed] PARTIALLY MET; LANDING EVIDENCE PENDING: retained npm-check-2.log reports typecheck plus 183 unit files, 4308 passing tests and 1 skipped, with the temporary-directory supervisor's successful result and 183-file expected population. Hosted node-ci run 43573447956 and governance-docs run 43573447957 both report success for this exact head. Independently downloaded node logs confirm unit 183/4308+1 skipped, integration 94/2842+7 skipped, e2e 15/140+2 skipped and system 11/53. The pre-retention campaign partition check passed: both enumerators agree on 852 paths, 852 assigned, 805 raw and 47 other, with unmatched=0 and overlaps=0. Retaining this raw and its campaign pattern, re-running that check on the retention tree, and a fresh no-open-run census plus PR statement at landing remain the implementation owner's work. They cannot be established prospectively by this source review.

Verification and evidence assessment

[Observed] The complete 13-path diff, changed test cases and relevant callers were inspected. The new helper is a small pure formatter with no import/dependency/effect. Test growth is plausible: two new behavior cases (multiline heading isolation and supervisor refusal) plus the new helper's generated network-import census case; five existing cases are extended, with the remaining edits maintaining caller fixtures. The PR states Tests: +3 ~5 -0. Distinct acceptance literals are intentional contracts, rather than source-text mirroring.

[Observed] I examined the retained original npm-check.log failure: its sole failing case is the pinned source census, whose received population contains audience.ts absent from the expected list. Commit 4ed8f87f adds that entry; the later retained CLI run reports 86 passing cases and the full rerun reports success. This was a diagnosed correction, not an unexplained retry or an infrastructure reclassification. The final-head hosted runs independently cover the corrected tree.

[Observed] I independently ran `python3 scripts/check_governance.py` in the review worktree: 32 OK, 21 WARN, 0 FAIL over 53 checks. This does not claim the full PROJECT-STATUS battery was locally repeated. Required hosted checks cover that broader final-head scope. The local checker emitted existing Python escape/deprecation warnings, with no failed governance predicate.

[Observed] For the amended documentation record, fixed-string rg and independent Python counts over the three named files (.claude skill, .codex skill, DOSSIER-REDIS-RUNBOOK.md) found no occurrence of `What the dossier answers`, `polaris-dossier-brief-v6` or `designCriteria(`. This is an exact bounded 3-file by 3-term census, not a broader documentation-absence claim.

Resolved review item

- R1 — low severity, high confidence; location: PR818 body / fnry17-packet.md change record (no source-code location). The initial change record omitted CC-BAR-2(4)'s explicit touched-floor declaration. Reproduction was inspection of those records against that clause, which requires: “The change record states which risk floors (CC-BAR-5) it touched, or ‘none’.” Sent directly to the implementation owner. [Observed] The owner amended the remote PR body and packet without changing source head; the remote body now records medium risk, floors 2/3 and class 6, with the bounded documentation check. [Inferred] The declaration is appropriate and this recordkeeping item is closed. No outstanding correction remains from it.

Limitations and readiness

[Unknown] Whether no run will be open at landing is not yet knowable. run-state-pre-pr.json reports five run directories with five closed execution records at 2026-11-14T07:56:20Z and a second file-count method; I inspected only this projected metadata record and did not open live run bodies. It is pre-PR evidence, not a fresh landing attestation.

[Observed] Merge-readiness helper reports OPEN, draft=true, CLEAN, required_non_green=0, unresolved_count=0, merge_queue=true, merge_ok=false with reason draft. Root owns raw retention, campaign registration, PR readiness, runtime census and queue/landing lifecycle. The raw's content verdict may be reused after an evidence-only retention commit when the implementation owner proves unchanged reviewed source/test content; changed semantic content needs review of its delta. No observed-repository bodies, provider calls, dossier runs, consent interactions or credentials were read/executed during this review.

[Inferred] Final content verdict: CONFIRM. Unmet source criteria: none evidenced within the reviewed scope. Unverifiable/pending criteria: criterion 7's future landing runtime and post-retention campaign/required final-tree gates. Do not reinterpret this verdict as merge authorization.

Scripted file identities (SHA-256)

```json
{
  "docs/evidence/syzygy-fnry-17-audience-mutations-2026-11-14.json": "31816cc15ac0278ab9bc13e70134ee8d590a225efa953169be11e54bd7dd0f87",
  "packages/polaris-dossier/src/audience.ts": "8876e28ba61be04c2337d729f0fc9e71a19a0ce3ead7fad3fbf5a58f6440befb",
  "packages/polaris-dossier/src/brief.test.ts": "b5e42dcb0abdacdb4a3b04435857e6e2062bdc4844d4fb7e92ee82127cb65f3c",
  "packages/polaris-dossier/src/brief.ts": "21d22295dcf34c34fbc1820a877ccd682d2ace8811389f5db94921fbd345f0ee",
  "packages/polaris-dossier/src/cli.test.ts": "0987064fc0d49ceb0c66b635c9adacff552bfd021df59264e3ab6389b3175ff7",
  "packages/polaris-dossier/src/design-review.test.ts": "0687aeddf68086b575a7bbe8fb34c9f4207e946d1123911229a41b330112e8f1",
  "packages/polaris-dossier/src/design-review.ts": "d536122563346dcf89ccfb3316ef8559ec5a940355d4a98d60722ee962195a85",
  "packages/polaris-dossier/src/polaris-launch-guidance.test.ts": "cb8e3f986fbdbe5f985966c94467566707845c30c28699e26852adce291d5f3e",
  "packages/polaris-dossier/src/polaris.ts": "ced5f03e891031af5f2111e20b55c7f7d4300829f8b0fcc4bff941e966be55c4",
  "packages/polaris-dossier/src/reader-standards.test.ts": "a42448bb24af14d98ad1df535dbd0962a196139a2f7720ae2996516e912f10bd",
  "packages/polaris-dossier/src/render.test.ts": "febb43ea7a4f3247f9dbb2b979f2b99d9c9890ccedabaa99e2cb2f303d359ff8",
  "packages/polaris-dossier/src/render.ts": "82980bdf67925352c52bfe284a07118c160f502c5e7ef338395f8819f4c59f35",
  "packages/polaris-dossier/src/review-packet.ts": "7565afdbe5737f0d2309e59e6c4197d8a25f5fd2c4383b1a7793357d29c2d48a"
}
```

Retained verification captures in the dispatch tmp directory (SHA-256)

```json
{
  "npm-check.log": "1a832a7619f95fa59739cdd3e2a609e01db3c5313e65132a292d6d44b2ca6651",
  "npm-check-2.log": "d7cdadbd200aa903122c703e9e6d1641feef337d5bce020904810f3a4354536c",
  "focused-unit.log": "8d3b2dcf5697c184c395b74a93192faee3d50338a0d2e635449cab3405f5026a",
  "focused-integration.log": "99f5cb9eff379864311914e45ac01555e4cbf052fc22cb626f0159888899d594",
  "cli-unit.log": "0bf0872426be1fa4af9061ef4c9dd3c621d441b92f549ae9cda27f6cc41231b5",
  "governance-evidence.log": "0cf01ba87db1ce220982b3e5953564e037c5c13a09b6c5c2379bcf71319d66fa",
  "fnry17-independent-node-ci.log": "116e1fa761e603ee0da08fc36bae19c404a7a4f93ea977533b97adbb1e950b7a",
  "fnry17-independent-governance.log": "0f323426c1d2a1fce921e969578515df2f37034cba346b245b72cb8edabb9490"
}
```
