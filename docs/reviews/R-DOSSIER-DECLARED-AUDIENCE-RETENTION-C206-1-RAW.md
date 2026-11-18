# Independent retention review: PR818 / syzygy-fnry.17
Verdict: CONFIRM
Reviewed commit: c206d7bbb68aebc22b4bbe6f72f8e8f0cfc6e597
Review delta SHA-256: 84891967237de1ff22ae4ad88385615dc79a802e4e73e1421a6effbae7dafa76

Reviewer: OpenAI Codex independent subagent `/root/review_fnry17`, same independent reviewer as round 1; authenticated GitHub transport login Tzeusy. Review date: 2026-11-14. Canonical review: syzygy-n535. This is a separate frozen raw, not an amendment of the original review.

[Observed] This bounded recheck reviews the delta from 05216cb11ae7ff6f5f57f72cb7ecbdf766bc23aa to c206d7bbb68aebc22b4bbe6f72f8e8f0cfc6e597, tree 8698fa4dc5eba3bf977f54e6223c12c9bf558d65. The delta identity is SHA-256 of scripted `git diff --binary <prior> <head>`. GitHub's current PR head matched c206d7bbb68aebc22b4bbe6f72f8e8f0cfc6e597 immediately before writing this raw; the PR is OPEN and not draft. My original review worktree remains clean at the prior head; this check reads the new commit's Git objects and runs the campaign check in an isolated temporary clone checked out at the new head. No source fix, lifecycle write, merge/enqueue, provider/dossier/consent operation, or observed-repository body read was performed.

[Observed] The entire commit delta consists of exactly two added mode-100644 files:

- docs/reviews/R-DOSSIER-DECLARED-AUDIENCE-1-RAW.md
- docs/review-campaigns/dossier-declared-audience.md

Both `git diff --name-only` and raw/numstat inspection identify that same two-file delta. I inspected the complete 13-line campaign fragment. Its pattern matches the retained raw; its round-1 verdict citation correctly identifies line 2 as CONFIRM; its scope, resolved R1 disposition, separate landing obligations, partial broader outcome and preserved PR817 owner gate agree with the original raw. It neither adopts intent nor grants merge permission.

[Observed] I independently compared the retained raw's Git blob with my original tmp raw. They are byte-identical, with SHA-256 f3ee0ac57509e387bd1bdc30761652605dd3eeadae6630622094fe44adcfb4e4. The original remains unchanged. I independently enumerated the original base-to-reviewed-head population (13 files) and compared every file's old and current Git blobs byte for byte; all 13 compare equal. Recalculated SHA-256 values match both the original raw's file identities and the implementation owner's retention-equivalence record. That population includes the mutation record, production code, tests, caller changes and source-census correction. The exact two-file tree delta also establishes that no other tracked input changed between these heads.

[Inferred] The original source/evidence review can therefore be reused without repeating unchanged broad source checks. Criteria 1–6 retain their original MET assessment, with the original review's evidence limits unchanged. The resolved risk-declaration record gap remains closed. No new source, test or documentation correctness finding was evidenced by this two-file retention delta.

[Observed] Criterion 7's independent-raw retention and campaign-registration portions are now MET at this head. I independently ran `python3 scripts/check_docs_review_campaign_partition.py --check` in the separate clone at c206d7bbb68aebc22b4bbe6f72f8e8f0cfc6e597; it exited 0 and reported:

```text
second-method PASS: git ls-files=853; git ls-tree=853; exact path sets equal
partition PASS: denominator=853; assigned=853; raw=806; other=47; unmatched=0; overlaps=0; campaigns=152
```

The two path enumerators agree on their exact 853-path sets, not just their totals. Retained checker capture: fnry17-independent-retention-campaign.log; SHA-256 59ca1ba98519336b3ecb3533e775ec89c4bb203fd90f911f9af0e60862c35137. The new campaign is included in the 152-campaign population and the retained raw is included in the 806-raw population.

[Observed] The original source head's hosted node/checks evidence remains retained and relevant to unchanged source. At this recheck, the new retention head's hosted checks are in progress; their final results are not asserted here. The implementation owner also owns the fresh no-open-run runtime census and matching PR statement at landing. These are fresh final-tree/runtime obligations, separate from this content verdict. I did not repeat the full test suite or governance battery for unchanged source, and do not claim those current-head gates have finished.

[Inferred] Exact-current-head content verdict: CONFIRM. Criterion 7's retention/pattern predicate is confirmed; final-tree CI/governance and fresh landing-runtime evidence remain pending outside this bounded recheck. No merge authorization follows from this verdict. This separate tmp raw need not itself trigger another repository retention commit; if retained, register it under the repository's campaign rules.

Scripted unchanged population (SHA-256)

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
