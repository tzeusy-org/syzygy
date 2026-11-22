PASS

Fresh successor source review of the completed ordered-design transport-health delta and the policy-currentness repair.

Frozen subject: 6ffe9ee4a8192e1bdf3a56ed12bf3fcc8599289b
Checkout: /home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f3-runtime-current
Prior review: /home/orca/.tmp/f3-completed-health-review-RAW.md (REVISE; F1)
Scope: both committed source/test files below, their full successor diff, and the previously reviewed attempt/launch/host/controller lifecycle dependencies. No edits, test execution, heavy checks or native execution were performed.

Frozen file SHA-256:
43f338b5470e83561451c59e4e127206176c6122d5dc3e638ebc2eb80c69eda8  packages/polaris-dossier/src/url-run-sessions.ts
6fc96733786497948fdfad5fef8d69c6c5b79395fe18a7005db4175d8737f4a2  packages/polaris-dossier/src/url-run-sessions-completion.test.ts

Verdict basis:

[Observed] Prior F1 is repaired by checkUrlSessionCurrent at url-run-sessions.ts:48–62. Production current invokes that exact helper (:294–295), passing options.current as the independent policy/run/pin/profile/sidecar verifier. The helper checks settlement and cheap authority before the first independent verifier. It then settles again, rejects refusal or failed cheap authority, and performs one additional independent verifier only when the second settlement returned settled (:57–59). It retains effectCurrent after the final verifier await (:60). False or rejected independent verification records binding-changed. The ordinary no-cleanup-wait path performs one independent verification; there is no retry loop or unconditional additional scan.

[Observed] settled is emitted only on paths that crossed await completed.child.finished (:274–282). This includes a concurrent waiter whose identical captured object was retired by another waiter (:275). A call that sees the object already retired before awaiting returns current (:266). Therefore the repair preserves whether this invocation crossed the cleanup await rather than relying only on the eventual shared retired state.

[Inferred] For the prior race ordering, the second settlement cannot return current after entering the child.finished await: it returns settled or refused. A successful settled result thus forces fresh independent policy/binding verification after cleanup. A change while that final verification itself awaits remains subject to the synchronous effectCurrent checks afterward, including stopping/failure, shared budget/original deadline, resume claim, stop request, CPU and current host-health entries (:285–292).

[Observed] The new regression uses checkUrlSessionCurrent itself, not a test copy of its ordering. The deferred child completion is held after the first independent verifier returns true; policy changes before cleanup resolves; a genuinely successful completed outcome releases cleanup; the invalid-policy variant requires false and bindingChanged, while the valid-policy variant requires true and exactly two checks (url-run-sessions-completion.test.ts:39–60). A separate case pins one check for no cleanup wait (:31–36), and another pins the cheap checks after the final independent verifier (:63–72). The existing strict-exit classifier case remains. These tests cover the repaired ordering; they are not full native retirement/integration coverage.

[Observed] The successor preserves the exact completed attempt, actual child, health-function and terminalConsumed identity checks. Retirement still compares the captured object and health function after awaiting, rejects noncompleted outcomes, and deletes only that matched entry (:270–282). The ordered native launch callback still captures an attempt-local terminalConsumed closure (:618–629). rememberTerminal retains that local capture and strict active-design completion checks (:392–398). Replacement still requires genuine terminalConsumed and the prior child's strict completed outcome before closing/replacing it (:598–604). A prior terminal has no blanket permission to erase a later round's health.

[Observed] The strict completed-exit classifier remains exited/0/null plus view-exited, confirmed group termination, settled tools and zero pending invocations. Live unhealthy native children remain subject to ordinary health refusal. The previously reviewed session-launch, ordered-attempt, ordered-host and ordered-controller files are unchanged between the predecessor review subject and this successor. The bounded cleanup and eligible-retirement reasoning therefore remains applicable: completed controller retirement does not call the full current verifier through writer.retire, so this repair introduces no recursive child.finished/host.close/current wait.

[Observed] Relevant VIS-4, SEC-5 and package-256 REQ-polaris-generation-035/048 bytes are unchanged. This repair restores independent currentness after the added wait and introduces no screening exception or new authority class.

Verification and limits:

[Observed] The two source files were checked directly against their frozen git objects, and their scripted SHA-256 values were independently matched with sha256sum. The complete successor diff in these two files was read. No new revision finding was identified in this scoped source review.

[Unknown] Test execution, mutation results, typechecking, native installed-client behavior and clean assembled normal-entry completion were not independently verified in this source-only review. PASS is the source-review verdict for the named bytes, not a native acceptance or production-readiness claim.
