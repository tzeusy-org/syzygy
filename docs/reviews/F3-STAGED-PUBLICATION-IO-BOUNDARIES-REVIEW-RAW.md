**PASS — source review of `1556516293f2179f0a1e740dd13e348b43dad9e7`.**

[Observed] Staged publication still samples the opening guard and both clocks before submitting I/O and after successful completion. The removed checks repeated the same sample in the same synchronous continuation. Allocation and ordinary effects retain their existing checks, including resampling after asynchronous authorization. [I/O guards](/home/orca/.tmp/f3-resume-schedules-production.HgV3WSme/w/packages/polaris-dossier/src/url-machine-store.ts:429)

[Observed] The durable rename guard, protected readback, final authority check, independent deadlines, and uncertain lock retention are preserved. `git diff --check` passed. [Publication](/home/orca/.tmp/f3-resume-schedules-production.HgV3WSme/w/packages/polaris-dossier/src/url-machine-store.ts:473) · [Release](/home/orca/.tmp/f3-resume-schedules-production.HgV3WSme/w/packages/polaris-dossier/src/url-machine-store.ts:545)

[Unknown] The observed native publication stop still lacks an exact cause. I ran no tests and did not verify native completion.
