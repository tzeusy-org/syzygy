PASS

[Observed] Reviewed `e91d10d32123eb716ca90a3370d4bbb36c1df8d6..4e0249e6d6b9b548b78a4102a38080b970ea1f8c`. Diff SHA-256 `b0baf1c1792c2e46503f4cbab98e523df489e89defffee2cfc3288adcc566dc2`. `git diff --check` passed.

[Observed] Preflight uses the archive bytes and decoded value verified against the state pointer in the same guarded physical read. Reserve still rereads and compares the exact predecessor. Audit publication still checks the physical archive predecessor before rename. The existing authority, lifecycle, deadline, durable sync, and readback checks remain. `packages/polaris-dossier/src/url-machine-store.ts:348–394,509–514,580–608,630–678`.

[Observed] The success control counts four actual archive closes before reserve’s first temporary state sync. Restoring the duplicate preflight read would raise that count to five. The refusal control substitutes archive bytes after preflight closes the original file. It requires a fresh archive read, refusal before state sync, byte-identical protected state, and no canonical credential file. The refusal control establishes at least one fresh archive verification before reserve writes. `packages/polaris-dossier/src/url-machine-store.test.ts:574–605`.

[Unknown] Native replay and timing impact. This review was source-only.
