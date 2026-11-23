PASS

[Observed] I reviewed commit `883ba9d85173104b9f1acbb0e89e9c1b8c7ada30`, tree `c98893ad26342cfa5be7e81e54851605f01b29ec`, and parent `759d639bbeb8e0bbef8c8cb2f5a2619378164b93`. The governing specification and amendment match the A-14 package 256 manifest digests.

[Observed] Late terminal-lock cleanup checks synchronous currentness, both named roots, and the deadline in the same continuation that submits `rmdir`. The cleanup stays within bounded active work and returns before any state read. Failed confirmation retains the lock. A submitted syscall may still complete after withdrawal or timeout. [url-machine-store.ts](/home/orca/.tmp/f3-eligible-role-clocks.o8kLTtnE/w/packages/polaris-dossier/src/url-machine-store.ts:524)

[Observed] The terminal lease exposes only read and paired authority/time sampling. Snapshot metadata is detached and frozen, and canonical bytes are independently buffered. The verifier retains exact identity, state, archive, canonical, projection, anchor, and audit checks. Resume still verifies retained terminals before fresh allocation. Generic exclusive, publication, allocation, and native-effect paths retain their existing bounds and behavior. [url-machine-store.ts](/home/orca/.tmp/f3-eligible-role-clocks.o8kLTtnE/w/packages/polaris-dossier/src/url-machine-store.ts:766) · [url-run-machine.ts](/home/orca/.tmp/f3-eligible-role-clocks.o8kLTtnE/w/packages/polaris-dossier/src/url-run-machine.ts:136)

[Observed] Focused test sources cover both authority modes, withdrawal during confirmation, queued withdrawal before deferred cleanup could run, named-root replacement, and refusal before state reads. [url-machine-store.test.ts](/home/orca/.tmp/f3-eligible-role-clocks.o8kLTtnE/w/packages/polaris-dossier/src/url-machine-store.test.ts:626)

[Inferred] No material source gap surfaced within the review scope. [Unknown] Test execution and native behavior remain unverified in this source-only review.
