# Independent review: explicit fixture runner allowances
Subject base: 73181a2eecc4f549b6955600c94b04f31a6279fc plus the four uncommitted files below
Binding SHA-256: 56700ff2f228a74d0e2e4db2d66066235f38e8eb9d919ebe16ae65613635f14e
Verdict: PASS

[Inferred] PASS is scoped to the requested runner-allowance patch. No blocking finding within that scope. This is not a full-gate verdict, an infrastructure-failure disposition, or evidence that every earlier timeout had an external cause.

[Observed] Independent inspection in /home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w found HEAD at the named base. The tracked diff consists of the four assigned files, with 9 insertions and 6 deletions (net 3 lines). The exact patch SHA-256 is 82bb9e562d8ba30c984b19851e98e4a6d21c6d96cc99780cc57ccac59bb21e63 and matches the retained patch. Source SHA-256 values were computed from git's base blobs and current file bytes, independently of the binding:

| File | Before SHA-256 | Reviewed SHA-256 |
| --- | --- | --- |
| packages/polaris-dossier/src/url-machine-peer-history.test.ts | 7e223bb683732f8fd93330cd2e30b6cf584b71c0e20073cfb2a3db046d32ddbf | b99e3b9946a36d851d2ddb0832a27485a3ef74d76a6552166da0f4dbddca7cbc |
| packages/polaris-dossier/src/url-run-machine-close.test.ts | 84765fa7d032daf2d29eaf9591065fbc90ddc29b00bba3ab9b4f805228d15fef | a5715d73d0f62296c85e4eabfaa6b3cc0d853ae85baccf45081630f5adfaba98 |
| packages/polaris-dossier/src/url-machine-cold-history.test.ts | faafb98f1a2b94ce9631ff4de9e3826612a30746b31f0f826c96f500e034de9d | ca23c627c587d83faa186bb4ea173a95f5371ec85ab43c49bdfcd594a24f29ba |
| apps/three-surface-poc/src/test-artifact-verification-consumers.test.ts | 74bea7d5f5f36719ab22cf20fb851c48ec8b8d6e17116c7265567471d485ce94 | 774669abc6191d26cd30edd84dbf29616833e7135c0fae6be36e200f4834c975 |

[Observed] The only source changes are five describe-level `{ timeout: 20_000 }` options, one it-level option of the same value, and three explanatory comments. Independently removing those exact additions recovers each of the four base files byte-for-byte. A separate TypeScript-AST comparison found 41 test callback declarations with identical callback bytes and 183 identical matcher call expressions; a line comparison found 157 unchanged expect-containing lines. Net case growth is 0. No runtime implementation, fixture callback, assertion, authority deadline, resource limit, global configuration, tier placement, retry, or skip changes occur in this patch. `git diff --check` produced no diagnostics.

[Observed] The five suite options cover the durable fixture suites: peer history (35 expanded cases), cold history (29), and the three closure suites (37 combined). The consumer file changes only its first census case; its other three cases retain their existing default. The fixtures perform real protected-file initialization/publication/read or closure work and retain injected authority/deadline checks. These four files had no explicit pre-existing per-case timeout arguments to displace.

[Observed] Installed Vitest is 3.2.7. In node_modules/@vitest/runner/dist/chunk-hooks.js:655-658, suite options are merged with test options using `Object.assign({}, suiteOptions, options)`, so an explicit test option wins. At lines 606 and 641 the resolved option selects the task timeout and wraps the callback. At lines 1852-1905, withTimeout retains its timer and elapsed-time check, including synchronous callbacks. In node_modules/vitest/dist/chunks/coverage.DfSpMS-b.js:3921 the non-browser fallback remains 5e3. The unit config supplies no global timeout; the integration 30_000 defaults remain unchanged. This implements a per-test runner ceiling inherited from the named suites, not one 20-second total for each suite, and does not extend hook timeouts or product operation deadlines.

[Observed] I read the applicable AGENTS.md, the engineering-bar and test-rigor skills, the project's CC-BAR and CC-TEST policies, vitest.config.ts, and CONTRIBUTING.md's tier and CI-budget sections. The suite-discipline reference named by the skill is absent at its declared local location and the shared skill location; the adopted project's CONTRIBUTING.md supplies the relevant tier/budget rules. CC-TEST-4 says: “Every attempt is recorded.” CC-TEST-2 says: “A worker's self-written report remains a report fact under every route.” CC-BAR-6 scales verification with declared risk. The review assesses this scoped allowance without declaring a new product-performance promise or waiving any risk floor. [Inferred] CC-BAR-5 floors touched: none.

[Observed] I verified the binding's retained artifact hashes, read the focused log totals, and independently counted its passing-case lines: cold 29, peer 35, close 37, consumer 4, totaling 105. The retained log reports 4 passed files, 105 passed tests, and 264.70 seconds. Seven recorded successful cases exceeded the old 5-second runner default. No test suite, typecheck, mutation control, or full battery was run during this independent review.

[Observed] The prior failed check:all summary still matches SHA-256 ace5715d6f630f4252a966a8d7f72e6a5545201f803d86d9858fe369110c24e3. It records 17 failed cases at the unit stage; later stages were not run. I do not override that failed attempt, establish all underlying causes, or infer hosted CI's seven-minute budget from the focused run. CC-TEST-4's infrastructure-retry exception is not being invoked by this verdict.

[Observed] Non-blocking wording pitfall: the brief calls the consumer census an “AST census,” but test-artifact-verification-consumers.test.ts:31-45,72-79 performs filesystem enumeration and regex matching. The separate preservation check uses TypeScript's AST. The patch targets the intended census case, so the naming error does not alter the allowance's scope. [Inferred] Describe it as a whole-tree consumer census in the eventual change summary.

[Observed] Review-only action: no source edit, commit, global edit, tracker mutation, or heavy check. This raw records the exact reviewed bytes above; any later source edits fall outside this verdict.
