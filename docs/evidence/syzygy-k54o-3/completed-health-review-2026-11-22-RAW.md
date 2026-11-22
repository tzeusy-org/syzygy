REVISE

Fresh independent source review of the completed ordered-design transport-health delta.

Subject: commit 3f1bf04d1a6eeed5e0fe52a03fd8ac4a3f8b52d9
Checkout: /home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f3-runtime-current
Scope: the 55-line runtime delta in url-run-sessions.ts and the new 22-line classifier test, plus selectively read lifecycle dependencies and governing clauses. The checkout was initially clean at the subject commit; it advanced during review to 0ad506f1f7c5261d29e8ef0cf6dc8495e2b5a01c with only adoption/evidence document additions. Both reviewed source files remain byte-identical to the frozen subject, checked directly against git objects. No source edits, heavy tests or native execution were performed.

Frozen file SHA-256:
ef4edafa3c81fec0f5cb9516e136e8833a50823d7c3f1c909c622b965633771d  packages/polaris-dossier/src/url-run-sessions.ts
80514c21de626663dbdb8c2f8c563f911cd44ac442e72650d86750e4f8d26eb7  packages/polaris-dossier/src/url-run-sessions-completion.test.ts

Finding F1 — P2 — Revalidate the independent policy/binding port after the post-policy settlement wait.

[Observed] url-run-sessions.ts:279 awaits options.current(). The new line :281 subsequently awaits settleCompletedDesign(), then evaluates only effectCurrent(). That settlement may await completed.child.finished at :256. options.current is expressly the independent policy, immutable run/pin/profile and sidecar verifier (:67–69); effectCurrent (:267–274) checks stopping/failure, shared budget/original deadline, resume claim, stop request, CPU and host health, but does not recheck that independent verifier or production.current. The real composition supplies prepared.sessionCurrent (polaris.ts:436), whose checks include currentPoliciesAsync and recordCurrent (polaris.ts:820–824).

[Inferred] A reachable ordering is: the exact attempt has consumed its genuine terminal; the first settlement sees healthy transport and returns; while options.current is awaiting, the completed native child begins host cleanup and its health becomes false; options.current returns true; the second settlement awaits the still-unresolved child.finished; during bounded broker/relay cleanup a policy or immutable sidecar changes; cleanup finishes with exited/0/null and fully settled termination; settlement deletes the old health entry; effectCurrent returns true. The current() check then accepts a value verified before this added wait. Other consumers can have their own independent guards, but this local verifier no longer preserves the requested post-await policy/binding guarantee.

Required repair: after any settlement that occurs after options.current, re-run the independent options.current verifier before reporting current, and keep synchronous lifecycle/budget/claim/health checks after the final awaited verifier. Preserve the existing non-recursive completed-retirement path. Add a focused regression at this lifecycle seam: force health loss during the external check, hold child.finished cleanup pending, invalidate the independent policy/binding while waiting, then resolve a genuinely completed exit and require refusal. The classifier-only test does not exercise this ordering.

Other reviewed acceptance conditions:

[Observed] Completed transport state is created only in the ordered native launch callback (:607–612); ordered sessions reject non-native ports (:205–207). It captures the actual child, exact host health function and an attempt-local terminalConsumed closure rather than consulting a later round's mutable orderedAttempt. Retirement compares the captured object and health function after its await (:257–260), deletes only the matched entry (:262–263), and concurrent waiters recognize the same object's retired state. Replacement requires terminalConsumed plus the prior child's strict completed outcome before close/replacement (:588–593). rememberTerminal captures the same attempt-local predicate and enforces the strict completed outcome for the active ordered child (:381–387).

[Observed] isCompletedUrlDesignExit (:41–44) requires outcome exited, exitCode 0, signal null, plus urlSessionStoppedCleanly. The latter (session-launch.ts:84–87) requires view-exited, confirmed group termination, settled tool termination and pendingInvocations 0. Stopped, failed, Unknown and unsettled outcomes do not satisfy this predicate. Live unhealthy native children remain in the host-health refusal path (:252–254 and :273); semantic completion alone cannot retire their check.

[Observed] Native child.finished cleanup is bounded: the process-group loop has a cleanup deadline (session-launch.ts:427–430), then host close is bounded independently (:432), producing Unknown cleanup on timeout rather than completion. The ordered host sets closing before retiring its controller (url-ordered-design-host.ts:77–84). For an eligible controller, stop returns early (url-ordered-design-session.ts:152–154), retirement stays null, and retire's flush does not invoke writer.retire or its full current callback (:164–167). Therefore the eligible cleanup path being awaited does not introduce the suspected child.finished -> host.close -> controller.retire -> full current -> child.finished cycle. Noneligible outcomes cannot authorize this exception.

[Observed] VIS-4 assigns ordinary implementation repairs to agents and reserves weakening SEC-5 for the owner. This delta changes no detectors. Package-256's REQ-polaris-generation-035 (:303–307) requires exact protected terminal eligibility and independent fresh currentness at render; REQ-polaris-generation-048 requires current parent/policy/scope verification for mediated acts (:771, :791). F1 is a local gap against the supplied acceptance criterion, not authorization to widen screening.

Verification and limits:

[Observed] Reviewed the exact committed diff and source dependencies. Scripted SHA-256 values were cross-checked with sha256sum. The test file contains one unit case with one positive and eight negative classifier variants; it does not exercise retirement, concurrent callers, replacement or the policy-during-cleanup race. No tests were run by this reviewer, as requested.

[Unknown] The reported typecheck/classifier pass, explicit-exited mutation detection and predecessor native diagnostic were not independently rerun. Clean assembled normal-entry acceptance remains pending as stated in the review request. This source review does not establish native completion or production readiness.
