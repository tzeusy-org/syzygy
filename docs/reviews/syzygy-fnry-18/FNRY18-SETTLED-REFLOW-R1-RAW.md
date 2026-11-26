# Settled dossier mobile reflow independent review

Verdict: REVISE

[Observed] Reviewed source 55e017d1d72f8d90b48920103d6a0e86dcb3ed47, tree aca2a3ae661ad96f074e9a7241f2aad7ea179127, and its exact protected parent bb064295c160c7365d916eaf8a8cfd274914f516. The two changed files are `dossier-site.ts` (SHA-256 ec95c1e524fcf17d43da1bafb2b8ec4093c9559739012d805ab5fdebc07db1df) and `dossier-reading.browser.test.ts` (SHA-256 3eb754cbcac91661141d0de6fc46d902c7e1f7adc4c7689bb62c926352e36c4e), both under apps/three-surface-poc/src/polaris-generation. The original syzygy-fnry.18 requires 390×844 reflow on every rendered operator-agent page, including code, digests and paths. Current REQ-polaris-generation-034 remains effective at A-306. The patch changes local generated styles and browser evidence. I reviewed that implementation boundary under VIS-4 and the independent reproduction under repository verification rule 6.

## F1. Discovery's reported paths can still force document overflow

[Observed] `dossier-site.ts:227` scopes the Discovery rule to `#discovery-read`. The production constructor at `packages/polaris-dossier/src/render.ts:805` and `:829` places reported paths in inspected list details and in selected, excluded, unresolved and deferred item titles. Those groups are outside the rule. The exact test at `dossier-reading.browser.test.ts:239` models only the observed-read group, which omits this ordinary production-shaped input.

[Observed] In an isolated clone of the exact review head, I added one synthetic inspected-path detail to the existing 20-page fixture and aimed the canary at that detail. Discovery was 946px wide at the 390px viewport and the selected text also crossed the viewport. The targeted test ran in Chrome and returned one failure, with the other two cases deliberately excluded by the test filter. In the same clone, extending only the Discovery selector to include the inspected group made that exact test pass. No source or deployed run was read or exercised.

[Observed] The retained reproduction is `/home/orca/.tmp/smrr.8ptQDk`. Test-only patch SHA-256 7f4bfa50a85844dd35a3aa08cff678a98c21d50f4f91256a72da3ae892fe569c. Failing Chrome log SHA-256 57445eba5914c19c155fce60c20ba05a775581e6ef10ac2edde04a69604e688b. Scoped repair-control patch SHA-256 acb575e514f27cffbcf226393f4dfe44de034be3b8b05254524a19bf7f408c03 and passing Chrome log SHA-256 45a8d327070fc7b66560d850621e6aa1bb0121e70fa38b42a11434b851ed4ad2.

[Inferred] Keep the selector local to the generated Discovery body and cover the path-bearing observed and reported groups. Exercise a title and a nested inspected detail with the original page-width and text-rectangle oracles, as well as the original Appendix and Review controls.
