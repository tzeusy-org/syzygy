REVISE

Independent source review of F3 render timer regressions and the policy 3.0.0 integration

[Observed] Frozen subject e10a56f763c3e1dac7961e59a17d523900b518c1, composed over main 499fc07debd11df37729b5c88a956a28d1effa28. Scope includes the response to F3-ENVELOPE-1 from the review of 953cd18b3124a06978b51ac9d4988984faadf2ae, the unchanged operation envelope, and the retained host policy-binding integration. This is a source review. I inspected historical test outputs and verified their file identities. I did not build, run tests or mutations, conduct a native run, or run the governance battery.

## F3-TIMER-ISOLATION-1 (P2)

[Observed] The three new cases share a promise inside render.test.ts:264–274, which calls buildComposedRuntime. The separate url-run-composed.test.ts:109–112 also calls that helper. Both files belong to the integration project (vitest.tiers.ts:23,106,139), which runs multiple workers under vitest.config.ts:27–40. Each helper call recursively removes the same checkout-relative dist/runtime directory before building (url-run-composed.testkit.ts:70,77–84). The builder then creates the directory and writes each output and the manifest exclusively at that same path (scripts/build_dossier_runtime.mjs:132–149). Renderer load and subsequent currentness checks repeatedly read the installed files at that path (url-runtime.ts:141–184,212–221,232–238).

[Inferred] In a normal parallel integration run, overlapping builders can fail on exclusive creation, and a second build can remove or partially recreate the installation while another worker is loading, verifying, or using it. The per-file promise provides no cross-worker isolation. Running the new tests alone cannot reveal the interference. The source-level race is a reproducibility defect under the adopted test-rigor rule 6 and compromises CC-TEST-1's requirement for a dependable fixed-behavior reproduction.

Required repair: give the render timer cases and the existing composed cases one runtime installation owner, or provide independently isolated installation roots. One direct option is to run the timer cases from the composed test file with its existing runtime setup. Keep the real renderer verifier and both integration files eligible for the normal parallel test command. Verify both files together under the ordinary worker configuration after the repair.

## F3-ENVELOPE-1 coverage

[Observed] The exact render function from original fix 953cd18b3 is preserved at this subject. Its URL branch derives the producer timer and monotonic limit from the one immutable product-read deadline, refuses expired admission and checks lease currentness before storage (render.ts:373–419). The adapter clips the supplied original run deadline once and creates a genuine backend lease (url-operation-products.ts:33–65). The same implementation contains the ordinary five-second branch, and the three nearest ordinary admission controls in render.test.ts:471–512 match the pre-fix test bytes. The committed change to render.ts below the timer concern comes from main's secret-path repair. Each of the nine other files in the original envelope delta matches the original fix's bytes.

[Observed] The three added tests call renderRun on a URL-mode effective declaration with the real source-reader binding, a verified installed renderer, the origin ledger, the live artifact backend, a protected brief and authentic committed draft/check receipts. The fixture composes fixed host metadata and passes a controlled producer-admission callback. The local Git clone supplies screened source bytes, while no native role or network provider participates (render.test.ts:264–374). The public render path requires the nominal renderer and reads before reaching admission (render.ts:194–222).

- A held admission remains live at six seconds with the lease open and the site absent. Releasing it yields a successful render (render.test.ts:399–417). The historical five-second mutant failed at the signal assertion.
- The initial phase consumes six seconds of an eight-second deadline. At 1,999 ms into the remaining window the signal is live. One more millisecond aborts it, the still-held render refuses and the site is absent (render.test.ts:420–441). The historical fresh-cap and restored-six-seconds mutants failed at the abort assertion.
- With wall time still six seconds into that original deadline and the lease still open, the admission callback reaches exactly two seconds on the monotonic clock. Its affirmative response is followed by a render-stage refusal and the site remains absent (render.test.ts:444–468). Each historical monotonic mutant reached successful storage behavior and failed the refusal assertion.

[Observed] Both timer manifests name per-predicate old/new fragments and exact tested commits. Their recorded source and test hashes match Git at their respective tested commits 5b3450f7312f7478591d2179458d2e4a78679c8c and b97d0cc7f9ab3097862b0f94993314f9d05123e1. The six recorded baseline and typecheck log bindings match their referenced bytes, and each of the five mutation logs shows the intended selected assertion failure. The complete timing fixture and all three cases match the second tested commit byte-for-byte. The enclosing test file and render.ts differ because the assembled subject includes main's additions. The retained mutations establish those predecessor runs. The assembled integration record contains a selected two-timer run before e10a56f76 added the monotonic case.

[Inferred] This closes the behavioral coverage gap identified as F3-ENVELOPE-1. The tests preserve REQ-polaris-generation-035's requirement for limits and currentness to apply at every operation under the original deadline and REQ-polaris-generation-048's requirement for finite limits and stop on breach. The new isolation finding prevents accepting this test revision.

## Policy 3.0.0 integration

[Observed] The adoption log preserves the full set of 44 main adoption rows byte-for-byte. The 22 premerge F3 rows A-43 through A-64 appear as A-45 through A-66 with linked F3 references adjusted to follow the shift. A-67 records the additional registry integration and its revert command. The policy v1, v2 and v3 documents match main byte-for-byte. A-14 binds URL 2.1 and its governing amendment. A-42 binds the 2.13 re-admission and policy 3.0.0. Their version tags resolve locally. REQ-polaris-generation-046 at the adopted readmission spec lines 19–21 requires new runs to bind 3.0.0, preserves each earlier named binding, and requires refusal if a step of an earlier run can no longer read that policy as its binding.

[Observed] url-mode-registry.ts:24–38 reads only the exact allowlisted path, policy ID and version pairs, with independently retained commit and digest fields. The existing bounded owned-file slot check and exact schema remain in force (lines 83–116). The registration path separately requires current 3.0.0 before any exclusive slot creation (lines 64–80). The decoder returns the same deep-frozen expected base policy in the context. effective-run-record.ts:198–214 passes that context into declaration verification. The registry diff grants no runtime rebind and changes no policy bytes or screening predicate. policy-snapshot.ts:173–175 still requires the current policy path in the pre-existing URL runtime currentness guard. This review establishes retained host metadata readability, while native recovery of earlier installations remains outside its scope.

[Observed] The policy registry test covers current registration and exclusive replay, read-back of exact 2.0.0 and 1.0.0, refusal and no slot creation for new earlier registrations, and marked URL refusal on missing authority (url-mode-registry.test.ts:47–99). The two mutation logs are digest-bound to a1f348d48144b8e8fdc486155f4f49669fec2551, whose registry source and test bytes match the final subject. Dropping retained v2 fails at its read assertion. Removing the current-only registration check fails at predecessor registration. The retained restored log reports five tests passing. Review finding count for the narrow registry integration: no findings.

[Inferred] VIS-4 (vision.md:172–198) assigns these finite test/runtime and metadata-reader changes to the agent under A-14 and A-42. A-66 and A-67 record the respective decisions. Neither change alters detector policy, doctrine, repository write permissions or exposure. [Unknown] Native completion, native recovery, and the assembled integration run under concurrent workers are outside this source-only review. The isolation finding is inferred from the verified source paths and does not rest on a claimed failed combined run.

## Scripted SHA-256 binding

```json
{
  "subject": "e10a56f763c3e1dac7961e59a17d523900b518c1",
  "files": [
    {
      "path": ".syzygy/governance/decisions/AGENT-ADOPTIONS.md",
      "bytes": 75766,
      "sha256": "9d75e503140a65632249e49decc5a6b6ef4d015b2d5aec535361269c973aa226",
      "worktreeMatchesAtReview": true
    },
    {
      "path": ".syzygy/governance/doctrine/vision.md",
      "bytes": 20380,
      "sha256": "733ae1c7e1bcc11649cd0304f29346a6a5a557e23fb69c0f52f8c4c62e287583",
      "worktreeMatchesAtReview": true
    },
    {
      "path": ".syzygy/governance/policies/craft-and-care/testing-and-verification.md",
      "bytes": 10937,
      "sha256": "8157c0c63ff27341365c9c29e0f620bd7eb7b986fd40432e9c5a30891d3e0782",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/binding.json",
      "bytes": 2780,
      "sha256": "9eaa1fb3c65335b8add218461afd9ccfd87eaed7a6e23e461315609a7c460028",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/f3-main-499-assembled-typecheck-final.log",
      "bytes": 37,
      "sha256": "396901319daac4a4413b23478852db3c572014f86c71d148273565f0f3332696",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/f3-main-499-url-timers.log",
      "bytes": 635,
      "sha256": "37fc7bf916e17e8c81eed802799387bd5590db9c5df86c9150c009eda8784756",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/f3-policy3-registry-after-fixed-fixture.log",
      "bytes": 363,
      "sha256": "607e04df3f7846708a1c8dcbe50b9102d55c2cd2beecd8977dcda27f4b2cdfb0",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/f3-policy3-registry-mutant-allow-new-earlier.log",
      "bytes": 3020,
      "sha256": "9d37bbb3dba6abbb22507dfa0d9f89faf76738c979321ac0ee82aa302fe1e2f2",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/f3-policy3-registry-mutant-drop-retained-v2.log",
      "bytes": 2178,
      "sha256": "9b160bdb319564ef2675e2e93a41eb0773abb6776385c48eff17a98b48e30c26",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/f3-policy3-registry-regression.log",
      "bytes": 2177,
      "sha256": "d7f93f79054da6e3f1ad807f45f60f39a29e5133dd4bbafb28edd03056c1c8c5",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/f3-policy3-registry-restored.log",
      "bytes": 365,
      "sha256": "473870e3fcd442f48e723c44add02fc633d6b4017518aa5d03e0cfe612f95da4",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "docs/evidence/syzygy-k54o-3/policy3-main-integration/f3-policy3-registry-rule6.json",
      "bytes": 1385,
      "sha256": "5bc97da7de9d1742171fa5700fca1b0d1fa72f368149e360d7bbd677b939fa06",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "openspec/changes/dossier-declared-source-readmission/proposed/polaris-generation/spec.md",
      "bytes": 26128,
      "sha256": "494dcd81b3bb8d0638c5a517e9fa1005720cac8b39cba34751f5f6ee62eeb018",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md",
      "bytes": 213529,
      "sha256": "e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/effective-run-record.ts",
      "bytes": 17578,
      "sha256": "53193552d044b19b321b2670faf4eab3c8bafe947433042560c0bdb5acf87715",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/policy-snapshot.ts",
      "bytes": 15078,
      "sha256": "16e5751856768c2c56c88226e233f9e71259ee1bcee2aff488fec451144d0bc0",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/render.test.ts",
      "bytes": 221335,
      "sha256": "42f55e9286eb3c09fc51212221601b9528017380e510aac6726546d7a06a8af4",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/render.ts",
      "bytes": 97257,
      "sha256": "53cd99c6cc5613a8739cf48ed64548cbd68c0f3183b88c0f04b9ca669f0b1e1b",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-design-product.test.ts",
      "bytes": 42675,
      "sha256": "be9f90323256d0ad5efcaf41577a42faeedb43c00b7ca748f3bcc68bca949a3f",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-design-product.ts",
      "bytes": 19946,
      "sha256": "af45237606eecd398186fd69f6621641c5655ce2d4499967507b8ae853e4926c",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-mode-registry.test.ts",
      "bytes": 9210,
      "sha256": "a007ab72ef0ebbbd640d927eaaded172f7f40133727752887d00bb6037c59b3d",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-mode-registry.ts",
      "bytes": 9786,
      "sha256": "9ecd069ae4963dc5b8290503530cfffe2ffec43238fc8114abbe0ba388fd0832",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-operation-products.ts",
      "bytes": 7206,
      "sha256": "953cfca08add8e2c760aa8969b58d6884dd48a8207d064deda0d2a27b040f8fd",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-product-read-limits.ts",
      "bytes": 416,
      "sha256": "cbdeb9abac5d87fbe7217877e076bfd33b0f6beabeedc0df71a050eff0fd3728",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-run-artifacts.test.ts",
      "bytes": 129841,
      "sha256": "609ebde6282d18b0749ba6eef82798f224ee14cee78c369c735f94822dff19fd",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-run-artifacts.ts",
      "bytes": 125075,
      "sha256": "6a72c3b74211058c77ee06ee0e10493776ee06aef2c158d3718c232cd21ae071",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-run-composed.test.ts",
      "bytes": 39847,
      "sha256": "2c7f712b30d0f146bf18ba3e31ed964db8446ead8079b91fd58ff75e75560682",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-run-composed.testkit.ts",
      "bytes": 17166,
      "sha256": "a5f2fd9e220252673562e463c1d9a52e193216444ed5770d27ccc81e35ba984f",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-run-machine.test.ts",
      "bytes": 21087,
      "sha256": "681026543715d35534fb9536ee7baac349c125ac13ab9ca8d971d36e132345ea",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "packages/polaris-dossier/src/url-runtime.ts",
      "bytes": 17611,
      "sha256": "9faf6710e6f0fe71e72446d6cafbb8068df6de859ba2a138b29f65d490e4d64f",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "scripts/build_dossier_runtime.mjs",
      "bytes": 12022,
      "sha256": "b3ce22917a82f107687f98c9f73ecf6fc5e96fa5eb7032184d114bb7ceac4093",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "vitest.config.ts",
      "bytes": 2589,
      "sha256": "3b677756d41400ea04e50816c4b834d07a96593bef097b67c7d1934d5ca9de22",
      "worktreeMatchesAtReview": true
    },
    {
      "path": "vitest.tiers.ts",
      "bytes": 15423,
      "sha256": "aa73dd2ee4429bda9571ea79311d35f0372decbc84fb229b73c49d1407f76e57",
      "worktreeMatchesAtReview": true
    }
  ],
  "externalEvidence": [
    {
      "path": "/home/orca/.tmp/f3-render-envelope-review-RAW.md",
      "bytes": 12189,
      "sha256": "2a26c48fb7b540c6c01c827ac1e6cc0a7133b18bdccc42817aeebdcffa45b416"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-full.log",
      "bytes": 10877,
      "sha256": "d34834b5f290cf6f16277d16e285b9c82daf6687163b034bdecfc58c2168fd44"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-mutant-drop-shared-deadline.log",
      "bytes": 17039,
      "sha256": "6f4fd17b7578ec2c0c52d4c172bfbd11e65448efaad8b595c3fbbee1c889040b"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-mutant-ordinary-five-second-cap.log",
      "bytes": 17035,
      "sha256": "7aa2c9a9dac3f705b711cc58b7abe40a801c6945033172ef09de3a63ca6aac70"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-mutant-reset-initial-six-seconds.log",
      "bytes": 17039,
      "sha256": "4e95a2349abeb816690bee5a71fdf68d049f39a7731e28c5adff99573fceab24"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-rule6.json",
      "bytes": 1993,
      "sha256": "81d2634573d25823c6cd69d5945f64689ac68483e271d37a74e8271798059122"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-sync-mutant-omit-monotonic-sample.log",
      "bytes": 17342,
      "sha256": "40c678e658aa103987e8094b63848bf015b7aedd8228bae25333a5602df3ef74"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-sync-mutant-reset-monotonic-to-declared-cap.log",
      "bytes": 17342,
      "sha256": "48d272c46668fa3e67f6452084500ac34c2dd0d7258eb3ff9168457844369f70"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-sync-restored.log",
      "bytes": 745,
      "sha256": "502578004c12036d7bc86972030b21b6fea1758eea00ebe124e8e9f6599e72ec"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-sync-rule6.json",
      "bytes": 1561,
      "sha256": "c99f83d2e5e04debb40257f87d3ae129335f474e4874a96ef2b0cfa76b1c19a9"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-sync-tests.log",
      "bytes": 741,
      "sha256": "c5aabd29c88752ac0fa147c2a4a11e050008f1f43a0a473a3f0ea9e1833de545"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-sync-typecheck.log",
      "bytes": 37,
      "sha256": "396901319daac4a4413b23478852db3c572014f86c71d148273565f0f3332696"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-tests.log",
      "bytes": 630,
      "sha256": "1a7b848fd8a6f9fdf76fe727f65e5926c05832f350a6c6a4759d6cd7cfdfaf34"
    },
    {
      "path": "/home/orca/.tmp/f3-render-timer-typecheck.log",
      "bytes": 37,
      "sha256": "396901319daac4a4413b23478852db3c572014f86c71d148273565f0f3332696"
    }
  ]
}
```
