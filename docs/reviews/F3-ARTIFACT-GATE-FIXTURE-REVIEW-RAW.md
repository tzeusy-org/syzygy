PASS

[Observed] The four cases in `f6c3117017bd17e545a1c545af6434d43eb61878` still exercise the genuine read adapter and its sample-gate dispatch. The fixture controls `Date` and the lease timeout while the adapter’s real `setImmediate` poll runs. Before-gate expiry skips the gate. After-gate expiry is attributed to the owning read only when the gate accepts. Denial and rejection retain their refusal classification. [Boundary tests](/home/orca/.tmp/f3-publication-final.ZPps4HP6/w/packages/polaris-dossier/src/url-run-artifacts.test.ts:1099) · [Read adapter](/home/orca/.tmp/f3-publication-final.ZPps4HP6/w/packages/polaris-dossier/src/url-operation-products.ts:66)

[Observed] Cleanup closes both read ports, and the outer `finally` restores every faked timer API. The commit changes only the test file. This was a source review.
