PASS

[Observed] The genuine store open now runs in its own async observation scope. The observer records the existing authority callback’s outcome and elapsed time while returning its original promise. Successful resume evidence now includes the startup trace. `packages/polaris-dossier/src/url-run-composed.test.ts:1379` `packages/polaris-dossier/src/url-run-composed.test.ts:1384` `packages/polaris-dossier/src/url-run-composed.test.ts:1397` `packages/polaris-dossier/src/url-run-composed.test.ts:1510`

[Observed] The follow-up touches only the composed test fixture. Store and lease delegation, trace fields, and native test assertions retain their prior behavior. `packages/polaris-dossier/src/url-run-composed.test.ts:165` `packages/polaris-dossier/src/url-run-composed.test.ts:1400`

Reviewed frozen commit `69e2eacb` against `a359dd44b`. Source review only.
