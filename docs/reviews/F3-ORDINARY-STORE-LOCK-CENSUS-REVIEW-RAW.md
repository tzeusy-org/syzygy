**PASS** for the frozen patch `2023388cc6c352d2cdb46ff76586d4e48b24fab6737e8b1fa81eb22887e242d0`. [Observed] The base commit, both file blobs, and the worktree diff match.

[Observed] Ordinary profiled operations now overlap root sync and the private census after acquiring the lock. Both I/O charges remain, both operations settle before the fresh authority check, and state reads and effect entry still follow that check. The five-second operation bound, one-second contention bound, and staged, ordered, unprofiled, and existing async behavior are preserved. [Source](/home/orca/.tmp/f3-ordinary-store.S8BFtYHu/w/packages/polaris-dossier/src/url-machine-store.ts:525)

[Observed] The controls cover overlap, withdrawal before state access, and existing serial paths. Rejection while the sibling I/O remains pending is verified by inspection of the existing `Promise.allSettled` path. [Tests](/home/orca/.tmp/f3-ordinary-store.S8BFtYHu/w/packages/polaris-dossier/src/url-machine-store.test.ts:526)

[Unknown] Native causality and latency improvement remain unverified. I made no edits and ran no tests.
