**PASS** for A134. [Observed] The frozen patch, worktree diff, base commit, and both file blobs match.

[Observed] The surviving synchronous authority check runs immediately before the first named-root read on each attempt, including after a contention wait. It checks the logical and monotonic deadlines before and after the parent callback. The async and staged branches retain their existing check order. The change applies to both profiled and unprofiled synchronous operations, including initial slot allocation and terminal reads. [Source](/home/orca/.tmp/f3-origin-restore.LYWe6RMD/w/packages/polaris-dossier/src/url-machine-store.ts:497)

[Observed] The new test detects the original duplicate checks and loss of the surviving check. Its hook observes the root read’s completion. The synchronous submission order is verified by source inspection, and withdrawal during a contended synchronous retry has no dedicated new test. [Test](/home/orca/.tmp/f3-origin-restore.LYWe6RMD/w/packages/polaris-dossier/src/url-machine-store.test.ts:128)

[Unknown] The native run’s latency improvement remains unmeasured. I made no edits and ran no tests.
