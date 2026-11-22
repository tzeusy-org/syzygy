# F3 resumed machine currentness source review

Verdict: PASS

[Observed] Subject: exact frozen commit `236df7ecd971048a97069f2629ef2e03e2dad902` in `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f3-runtime-current` (parent reports root cherry-pick `f39e7ed05`). Scope: `startPreparedSupervisor` production.current selection, its sole consumer and complete guard/store chain, and two expanded machine test families. Source-only independent review; no sources edited and no native/heavy tests run.

[Observed] Findings: none requiring revision within this delta.

[Observed] The production change at `polaris.ts:439-443` supplies `prepared.continuation?.verified.checkedContext.current ?? prepared.current` to the machine. A resumed preparation has the genuine verifier result returned through `prepareStoppedSupervisor`; ordinary preparation keeps its existing current callback. The outer session current, generic machine currentness conjunction and deadline wiring are unchanged.

[Observed] Consumer sweep: rg over apps/packages/scripts and an independent Python sweep over 867 tracked .ts/.mts/.js/.mjs files in those roots found one production.current property read, `url-run-sessions.ts:443`. A frozen-object git grep independently confirmed that location. Inspection of the remaining production property uses in url-run-sessions.ts found parent/policy/artifact/protected-root uses, not another current callback consumer or destructured alias. At that one consumer it is passed only to `createUrlRunMachine`; resume.current is separately constructed at lines 445-446 as `isClaimedStoppedUrlRun(resume.verified,resume.claim)`.

[Observed] `url-run-machine.ts:92` independently conjoins `input.current()` and `input.resume.current() === true`. This conjunction is passed to the store as current at lines 111-114 and remains in machine live currentness at lines 128-129. Genuine resume binding is checked in `url-run-sessions.ts:189-206` before machine creation: the exact consumed claim, run/core/sidecar-dependent verified context, original deadline, runtime, policies, declared classes/roles, protected store and parent binding must match. No caller-provided saved boolean replaces this chain.

[Inferred] On this public resumed path, the conjunction now evaluates the effective-run verifier plus one independent consumed-claim check. The previous input callback already combined that same claim and effective-run verifier, so the generic machine's separate claim check duplicated expensive synchronous policy work. The new input callback separates those two responsibilities while retaining both; it does not cache their results or delete an independent predicate.

[Observed] The retained consumed-claim check reaches the genuine issued/consumed claim via identity-bound `isClaimedStoppedUrlRun` (`url-recovery.ts:29-45`). Claim creation captures `current() && committedUrlPoliciesCurrent(root,policy.binding,origin.binding,adoption)` at lines 171-177. Effective-run currentness at lines 60-83 includes the original deadline, absent closed/execution-choice files and freshly checked effective authority/core/sidecar records (`effective-run-record.ts:153-169`). The synchronous policy probe (`policy-snapshot.ts:119-129,160-210`) verifies actual bound base/origin/parent bytes and direct default/tag refs, with HEAD/worktree stability samples. `url-stopped-run.ts:288-312` retains held-root/lock identity, consumed marker, current bound stopped record and its exact digest. Its boundary read samples the clock after the policy work. Thus policy/default-ref/claim-lock/marker/boundary/effective-run/expiry predicates remain live at each existing store currentness boundary.

[Observed] Store setup retains its current/deadline/finite-wall checks (`url-machine-store.ts:176-194`). Live store operations call options.current and check monotonic time and original expiry (`266-279`); their io wrapper checks before and after awaited operations (`369-384`). Writes keep guarded creation/write/fsync/readback and a synchronous current check immediately before rename (`386-408`). Allocation issues only after protected write/readback and final check (`447-464`). Store semantic decode caches at lines 316-338 and 350-363 already existed and stay bound to fresh physical reads; this commit adds no currentness cache. Grouped low-level reads and historical cleanup preserve their existing semantics; this review does not assert a new per-syscall atomicity guarantee.

[Observed] The changed-file list contains only polaris.ts and url-run-machine-close.test.ts. Machine/store checks, 5,000 ms operation and 1,000 ms lock caps, original deadline and store identity/allocation bounds are untouched. There is no cap/deadline increase.

[Observed] The expanded tests at `url-run-machine-close.test.ts:220-241` parameterize both prior claim-withdrawal controls over run-authority and claim. They verify live currentness turns false, cleanup reports Unknown without clean history, and loss after the second awaited revalidation refuses construction before fresh allocation while actual state.json remains byte-identical. The fixture's independently controlled current and claim booleans (`44-47,141-144`) test the generic two-input contract; they are not presented as a real production OS claim or actual policy withdrawal. The unchanged public guard-chain source above supplies the production composition evidence. Two added parameterized cases protect the newly separated input from being accidentally ignored.

[Observed] Governing requirements remain VIS-4's owner boundary for weakening secret detection/fail-closed behavior, SEC-5's exclusion of matching or unclassifiable content, and adopted REQ-polaris-generation-048: “Every subsequent mediated act, including an existing open connection and resume, SHALL recheck the current authoritative record, exact projection binding, independently attested instance/process lifetime, finite expiry, current policy and operation scope.” Its resume rule requires retaining pin/policies/provider/original deadline/frozen subjects. The change retains current policy and the exact claim independently and changes no detector, binding or scope predicate.

[Unknown] The parent reports 30 machine-suite tests and typecheck passing; those runs were not rerun here and their outputs were not independently inspected for this narrow source review. The parent separately reports trace795 plus a temporary diagnostic patch: eight resumed allocations, 360 currentness calls, 36.34 seconds in currentness and 36.58 seconds elapsed, every allocation issued. Accordingly this review makes no claim that a prior allocation failure was reproduced. A subsequent render-admission refusal remains a separate active issue. These supplied runtime facts do not establish acceptance of the complete resume workflow.

[Observed] Verification here consists of source/diff tracing, two independent consumer-search methods, and scripted frozen-object hashes. Checkout HEAD moved to `fc60dc732357e866fad8701e2aa714bbd1b4cc58` during review; every implementation/test/library file read for this delta was checked byte-identical against the requested frozen commit before retaining this result. PASS is scoped to this exact frozen source delta, not the moving checkout's overall state or full runtime acceptance.

[Observed] Frozen whole-commit patch SHA-256: `41a79278c497177ebf813bd1d2d33dab9daf59063fb5fbf5111708eb129e3709`.

Reviewed-file hashes (whole files; some selectively read):

```text
2e1de984243f73736efa4b954a26bba541c6a332ca195c2559a3243ccb763e01  packages/polaris-dossier/src/polaris.ts
43f338b5470e83561451c59e4e127206176c6122d5dc3e638ebc2eb80c69eda8  packages/polaris-dossier/src/url-run-sessions.ts
191270378c1803bb127914ab396367c8edefa4f6f9788a03695d8a7f99a014da  packages/polaris-dossier/src/url-run-machine.ts
b93c94a73fa2a9a13c86ba5384817846d9cca0720199d0a8e6eaebf35c5b0b79  packages/polaris-dossier/src/url-machine-store.ts
1b594ccdff9065fcaebe8908aeed210ac25ea269a3391787080a33e502c35614  packages/polaris-dossier/src/url-run-machine-close.test.ts
f1dec97ee20392e6c3becd63dc6278677098492a2385229588f62b1915039844  packages/polaris-dossier/src/url-recovery.ts
e0364064d6ff1612dfaa2d9201335e3a5363747dbdd1cca4b66db8f286a2c80e  packages/polaris-dossier/src/url-stopped-run.ts
6dda9f108c70eebf930e8edb3276c486b41c30c317ec83c3beeaa69eeb57ce7e  packages/polaris-dossier/src/policy-snapshot.ts
53193552d044b19b321b2670faf4eab3c8bafe947433042560c0bdb5acf87715  packages/polaris-dossier/src/effective-run-record.ts
733ae1c7e1bcc11649cd0304f29346a6a5a557e23fb69c0f52f8c4c62e287583  .syzygy/governance/doctrine/vision.md
0f2ae0adbcf6d884253d5ccdb92f76b739a6e0a838a62dcb00a27e58a5955861  .syzygy/governance/doctrine/security.md
e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865  openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md
```
