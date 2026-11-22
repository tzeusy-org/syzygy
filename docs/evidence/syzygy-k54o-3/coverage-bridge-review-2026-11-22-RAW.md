# Independent F3 coverage bridge review — RAW

PASS

[Observed] Frozen subject: `c581a6304b7c7e9e9866b8ccad955998235d5d03` at `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f3-runtime-current`. Reviewed delta: `f836920569cb60f175876788be7e8b20b6e97207` plus `c581a6304b7c7e9e9866b8ccad955998235d5d03`; the intervening adoption is A-49. Git status was empty before recording this review. Review performed 2026-11-22.

[Observed] Method: static inspection of the seven changed source/test files, their pertinent inventory reader, protected selectors/readers, screen predicate and session/provider helper. No tests, native probes, pilot key or pilot answers were read or run. No production files, GitHub state or tracker state were edited. The skill references used were heart-and-soul and engineering-bar.

## Governing criteria

- Preserve ordinary coverage comparison, ordinary postwrite placement and Unknown-on-read-error behavior; REQ-polaris-generation-034 version 2.12 (adopted through A-40), especially lines 114–120, governs its report-only mechanical advice. The clause says “check SHALL write it to no file” and “coverage that was not compared is Unknown”.
- Preserve URL producer authority: compute advice before introducing the new checked revision; forward the full nominal RunProductReads lease; read and hash-match counted bytes through it; refuse a protected authority failure before freeze. A-49 expressly adopts this integration into the existing protected boundary. Protected authority remains a producer prerequisite rather than an advice-based outcome or readiness decision.
- Compared reports must be an exact projection of the authenticated latest passed inventory/check, independent planned session, committed prompt and current launch, retaining their receipt parents. Unknown must confer no new inventory evidence.
- Use the actual policy-bound screen for secret paths, including denied-path overlap. SEC-5 says “Anything that matches the declared secret-detection policy, or cannot be classified, is excluded”. VIS-2 says “No evidence means Unknown, not success”. VIS-4 supplies agent-adoption authority outside the four owner classes.

## Review observations and assessment

[Observed] `check.ts:286–289` computes coverage for a parsed protected draft before `writeFileSync(frozen, ...)`; the protected lease is revalidated immediately before freeze (`check.ts:299–305`). `inventory-coverage.ts:160` forwards the same lease to the inventory-of-record port, and `cli.ts:353–356` carries the operation's full product lease through the CLI port. `inventory-coverage.ts:164–179` reads protected inventory bytes through protectedProduct, compares their SHA-256, and propagates an unavailable protected authority as UrlProductReadRefusal. `check.ts:153–158` converts that exception into the established reverify refusal. The new current draft's session identifier is checked before freezing it (`inventory-coverage.ts:162–163`), supplementing inventoryOfRecord's scan of earlier frozen drafts.

[Observed] The ordinary path still uses the postwrite advice call (`check.ts:381–384`), the existing inventoryOfRecord reader, direct frozen-byte read, the existing BASIS string, comparison function, and Unknown catch. `compareInventoryCoverage` itself is unchanged by the delta. The ordinary read-error and projection cases in `inventory-coverage.test.ts:160–213` were inspected, not executed.

[Observed] `url-run-artifacts.ts:572–589` admits a compared form only with the bound screen, the latest authenticated inventory stage passing, matching revision/digest, inventory session 1 matching the planned role and differing from the author session, authenticated frozen inventory/check and the current authenticated prompt/launch. Its stage selector compares the actual frozen/check populations with the registered population and reads the latest numeric revision, so an earlier passed revision cannot replace a later revision with findings. `checkedPacketSubject` additionally matches the committed report projection and exact checked/frozen identities. `packetRecord` checks the retained snapshot and receipt, and the launch alias resolves to the current registered launch whose committed predicate includes prompt and audit currency.

[Observed] The bridge recomputes the entire compared object using `comparedInventoryCoverageAdvice` over the frozen author/inventory documents and `secretPathOf(given.screen)`, and compares canonical objects for exact equality (`url-run-artifacts.ts:587–589`). Strict report shape rejects additional fields. The actual prepared screen is supplied by `polaris.ts:381`; its policy digest is checked against the run's recorded policy (`url-run-artifacts.ts:148`). The shared secretPathOf tests the path screening result and the path as body text, preserving secret-detector suppression even when a denied-path rule also names it.

[Observed] The inventory subject, its checked product, prompt and current launch receipts are added to the resulting checked-product composition (`url-run-artifacts.ts:581–586,604`), retaining their existing ancestry. The Unknown arm skips these inventory parents. Advice is accepted only as a report field, removed from the stored-record projection, and absent from the stored record's allowed fields (`url-run-artifacts.ts:501–504,541`). The production check never inserts it into `stored`, outcome calculation or sidecar advice; its final report alone receives it (`check.ts:389`).

[Observed] The changed integration fixture checks lease identity, withdrawal before freeze, direct helper propagation of a closed lease, a genuine compared report, rejection of mutated digest/revision/count/ID/path projections and additional fields, absence from the stored record, and retained inventory/check/prompt/launch digests (`url-run-artifacts.test.ts:592–683`). This is source inspection of the assertions, not a claim that they passed in this review.

[Inferred] The reviewed delta satisfies the requested static criteria. I identified no concrete blocking source defect in this scope. No blocker reproduction is supplied because this review did not identify one.

## Verification limit

[Unknown] Full native acceptance remains pending. This PASS is a source-review verdict for the exact frozen subject, not a runtime, performance, mutation, test-suite or native-acceptance verdict. Reported earlier test results in the adoption row were not independently rerun or relied on as runtime evidence here. Any subsequent source change needs its own review applicability assessment.

## Frozen file SHA-256

[Observed] These 16 file digests were computed from the frozen checkout with Python hashlib and each confirmed using sha256sum. The first seven are the changed source/test population; the rest identify the directly inspected helper and governing files.

| File | SHA-256 |
| --- | --- |
| `packages/polaris-dossier/src/check-model.ts` | `b59b7b03efb58f22e2c052ec39e9392bd004ab027a11e4797d96d94601ffb1c5` |
| `packages/polaris-dossier/src/check.ts` | `46eb743c3ee8fc49d6d9d235286e0bf6be800ca87d0c86f416804cf1f9475e78` |
| `packages/polaris-dossier/src/cli.ts` | `14a1e16a6da87d9db25b646b02f0d9f079b8c1c557a47f158d31c91fe175469d` |
| `packages/polaris-dossier/src/inventory-coverage.ts` | `736257e5fc9906e609ab5ff29dbfec022ece6c2412e8e0d1cf9c7bea877bf593` |
| `packages/polaris-dossier/src/polaris.ts` | `a2bd79bd31d3baa705e3592ca5488ad4b3f2bb54a750df758aa1abfe15e9d2d1` |
| `packages/polaris-dossier/src/url-run-artifacts.test.ts` | `fff9f84a3a42595886b03a5542dd068ce603763d79cfaf6d412f4d1be6685420` |
| `packages/polaris-dossier/src/url-run-artifacts.ts` | `721cd8dce3942e6b69b8cc2873ce9477210031bd4aefecd7436d10c8f66b074f` |
| `packages/polaris-dossier/src/inventory.ts` | `fbc11d07367a7662bbea4659feeecb6874e3ba407645c1fb8bab891113d70c34` |
| `packages/polaris-dossier/src/url-operation-products.ts` | `5e72b423fe1171c6a4b069ad54d43417f074fdc5db00045c351dc5d86d6b279f` |
| `packages/polaris-dossier/src/derived-record.ts` | `a1e9f81595b9fb4d68d59541a1a3a8af35511728f4c6fa8c33202b60cf1fa6c7` |
| `packages/polaris-dossier/src/session-statement.ts` | `37d1ee6b484ef68c9fe06dfefc640fdc6fadff3901dc61066c42b5bc5a75f389` |
| `packages/polaris-dossier/src/inventory-coverage.test.ts` | `5a2c0eaa164e85dc78e4c58b313839efa7956311629568991de6c47ae5a2e2bb` |
| `openspec/changes/dossier-coverage-precheck/proposed/polaris-generation/spec.md` | `995c2ec47619567a86a5899eacbe3b1cf96a652686af4bfa7cd51e0ea1841287` |
| `.syzygy/governance/decisions/AGENT-ADOPTIONS.md` | `22d4d6bbde9d25ad651d2889b6ea8f80bc7d56e7cba893b8b88985a24aba5526` |
| `.syzygy/governance/doctrine/vision.md` | `733ae1c7e1bcc11649cd0304f29346a6a5a557e23fb69c0f52f8c4c62e287583` |
| `.syzygy/governance/doctrine/security.md` | `0f2ae0adbcf6d884253d5ccdb92f76b739a6e0a838a62dcb00a27e58a5955861` |
