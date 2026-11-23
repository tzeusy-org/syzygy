PASS

[Observed] Reviewed commit `39c695c92213bbdab08bcf0f384ee46a11d1d19f`, tree `3eed522444c1dabed788532b8f6b4f4fc805a03d`, against `cce8ae210`.

- The terminal read rechecks asynchronous authority after both client reads, then checks full synchronous authority, both physical roots, and the deadline in one continuation. It rechecks authority before validating the exact bytes against the anchor and releasing the detached snapshot. [Root and authority checks](/home/orca/.tmp/f3-terminal-final-proof.GuxPOcbv/w/packages/polaris-dossier/src/url-machine-store.ts:461) · [Snapshot validation](/home/orca/.tmp/f3-terminal-final-proof.GuxPOcbv/w/packages/polaris-dossier/src/url-machine-store.ts:696)
- Archive verification, both paired authority and time samples, the final held-operation check, and the five-second operation and one-second contention limits remain. Ordinary and staged callers retain their existing anchor-check sequence. [Archive](/home/orca/.tmp/f3-terminal-final-proof.GuxPOcbv/w/packages/polaris-dossier/src/url-machine-store.ts:354) · [Paired samples](/home/orca/.tmp/f3-terminal-final-proof.GuxPOcbv/w/packages/polaris-dossier/src/url-run-machine.ts:136) · [Final check](/home/orca/.tmp/f3-terminal-final-proof.GuxPOcbv/w/packages/polaris-dossier/src/url-machine-store.ts:585)
- `git diff --check` passed. All 11 selected terminal tests passed out of 70 in the file, including withdrawal, root replacement, and expiry after both client reads. [Refusal tests](/home/orca/.tmp/f3-terminal-final-proof.GuxPOcbv/w/packages/polaris-dossier/src/url-machine-store.test.ts:556)

[Unknown] Native closure on this exact commit.
