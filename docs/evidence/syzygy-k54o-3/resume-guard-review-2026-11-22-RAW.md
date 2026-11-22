# F3 resumed audit currentness source review

Verdict: PASS

[Observed] Subject: frozen commit `3a971bd56041777b3b49549e059c158f5e0e11aa`, in `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f3-runtime-current`. Scope is the one production-expression change in `prepareStoppedSupervisor.sessionCurrent`, its canonical composed controls, and the unchanged guard/audit library chain required to assess that expression. This is an independent source review; it is not acceptance of the complete F3 runtime.

[Observed] Findings: none requiring revision in the scoped delta.

[Inferred] The replacement retains the complete guard at every existing audit currentness sample. `polaris.ts:553-554` calls `claim.current() && checked.current()` afresh. The claim is obtained only through the genuine verified result and consumed claim path (`url-recovery.ts:171-177`, WeakMap/WeakSet identity checks at lines 29-45). Its captured input guard is `current() && committedUrlPoliciesCurrent(root, policy.binding, origin.binding, adoption)` at line 174; it is not a saved boolean or async success witness.

[Observed] `url-stopped-run.ts:288-312` makes claim currentness depend on the still-owned OS lease/root/directory identity, exact consumption marker and stopped-boundary digest, plus that input guard. `url-recovery.ts:61,79-83` makes checked currentness depend on the original deadline, absence of closed/execution-choice state, and a fresh effective-record authority read. `effective-run-record.ts:153-169` captures checked identities and rereads the effective record through its live authority on each invocation. The outer checked-current call is retained after the synchronous claim/policy work, so expiry and record changes during that work are sampled again.

[Observed] `policy-snapshot.ts:119-129,160-210` runs the actual synchronous committed-policy probe, checks base/origin and parent subject bytes against worktree and Git objects, brackets them with current direct default/tag refs, samples HEAD and verifies working-file identity/stability. `url-parent-adoption.ts:4,9,46-55` identifies and strictly parses the actual default/tag refs. Neither detector bytes nor policy bindings are changed by this delta.

[Inferred] The removed expression repeated the full synchronous claim/policy guard, added the equivalent asynchronous policy probe between repetitions, then repeated currentness again. The surviving callback has no internal await; each call performs the full synchronous guard instead of reusing a prior asynchronous policy result. This removes duplicate probes, not a distinct policy/default-ref/claim/record/expiry predicate. This assessment preserves the existing sampled-currentness model; it does not assert atomicity against an adversarial concurrent filesystem writer.

[Observed] `url-session-audit.ts:454-465` still awaits the supplied callback before and after its guarded filesystem operations, and checks the finite operation deadline around it. Constructor operations use this wrapper (`471-520`); event append stages retain their additional currentness samples (`677-701`). Read-only identity inspection is an existing grouped check bracketed by its caller (`488-512`), not a new per-syscall guarantee. Cleanup remains explicitly historical and authority-independent. No audit wrapper or boundary callsite changes in this commit. The 5,000 ms audit cap at line 31, constructor cap at line 470, and original run deadline wiring in `polaris.ts:436,586-588` are unchanged; no deadline/cap increase is present.

[Observed] The new controls at `url-run-composed.test.ts:167-184` exercise the exact options.current supplied during the public resumed producer's audit creation, after the real verified/consumed claim path. They append a newline to the bound base policy, require refusal, restore exact bytes in finally, require currentness, rename the active recovery lock, require refusal, restore it in finally, and require currentness again. These are callback controls, not a claim that a refused production audit was attempted and recovered. The real audit constructor is called afterward.

[Observed] Their mutation targets are private synthetic state. `prepareComposedRun(...,{hostRoot:recoveryHost.root})` is selected only for stop-resume (`url-run-composed.test.ts:215`); its observer is created under an owned home-directory temporary tree by `url-run-composed.testkit.ts:33-67,88-106`. The host root is independently generated under the home-directory .tmp tree (`url-run-composed.test.ts:24-33,110`). The policy path therefore resolves inside the synthetic observer, and the lock inside that synthetic host. The shared real checkout supplies copied fixture inputs, not these mutation targets.

[Observed] Governing references read selectively: VIS-4 says agents decide other changes and record/report them, while weakening secret detection/fail-closed behavior is an owner class; SEC-5 says anything matching the declared policy or unclassifiable is excluded. A-14 binds the reviewed URL specification and fixed policy; the package-256 manifest binds the requirement bytes. REQ-polaris-generation-048 states: “Resume SHALL refuse closed, expired, running, foreign-mode or inconsistent state, retain pin/policies/provider/original deadline and frozen subjects, re-establish relay/MCP/configuration/provenance/audit boundaries and continue only from the next unfinished validated step.” Its “Resume retains the pin and checks” scenario requires revalidating the existing pin/policy/provider and refusing expired/concurrently running/inconsistent runs. The reviewed optimization does not amend these obligations or weaken screening.

[Observed] Verification performed here: source/diff inspection, guard tracing, frozen-commit file hashing, and comparison of reviewed production/test/library bytes against the moving checkout. HEAD advanced to `40f56009836063590bf8a4a36c65902c303f17d5` during review; that successor changes the adoption log only, and the production/test/library bytes cited above were verified identical to the frozen subject. Hashes below use git objects at the requested frozen commit, including its original adoption-log bytes.

[Observed] The retained library cost record measures 5,060.07 ms for the repeated variant versus 2,194.96 ms for the single variant with its 5,000 ms cap; it explicitly excludes genuine claim ownership overhead. Its subject hashes match the corresponding reviewed library bytes. Existing retained logs report five claim-lifecycle tests and six committed-policy/adoption tests passing in the separate regression checkout. These are read evidence, not tests rerun by this reviewer.

[Unknown] The new composed withdrawal controls have not yet executed on the reviewed subject. No native/heavy tests were run in this review. Actual public stop/resume completion and acceptance remain pending; the cost measurement alone does not prove the observed native timeout cause or successful resumed operation. PASS is limited to the source delta and fixture isolation described above.

[Observed] Frozen production/test patch SHA-256: `2604fc03ee4bf36d98838ceed3eafc6d0ce6cbe8157afb887cec9e0349fe39f7`.

Reviewed-file SHA-256 values (whole files; some read selectively):

```text
4406cfc4f1304a37aade4c4873e21e17d263a1dede2e90dc736225fab124003e  AGENTS.md
733ae1c7e1bcc11649cd0304f29346a6a5a557e23fb69c0f52f8c4c62e287583  .syzygy/governance/doctrine/vision.md
0f2ae0adbcf6d884253d5ccdb92f76b739a6e0a838a62dcb00a27e58a5955861  .syzygy/governance/doctrine/security.md
c32a0383a9571d5fad3aab6e85a3bf9e596030795e3fa78a45620c8c83e8dca7  .syzygy/governance/decisions/AGENT-ADOPTIONS.md
e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865  openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md
f142d5d93c8916ea2db2b7cf9917b586df9cb7a031af15ae790517476168b8df  docs/evidence/syzygy-k54o-3/d10-f3-candidate-package-256-manifest.json
70a79b1afe681b74611070f497d6432193ade6557419d0d05baac270fe7ced75  packages/polaris-dossier/src/polaris.ts
f1dec97ee20392e6c3becd63dc6278677098492a2385229588f62b1915039844  packages/polaris-dossier/src/url-recovery.ts
e0364064d6ff1612dfaa2d9201335e3a5363747dbdd1cca4b66db8f286a2c80e  packages/polaris-dossier/src/url-stopped-run.ts
6dda9f108c70eebf930e8edb3276c486b41c30c317ec83c3beeaa69eeb57ce7e  packages/polaris-dossier/src/policy-snapshot.ts
3df8908295915494fbbdeee8a89a77efa085a1130c13baa140e77a93040c93aa  packages/polaris-dossier/src/url-parent-adoption.ts
53193552d044b19b321b2670faf4eab3c8bafe947433042560c0bdb5acf87715  packages/polaris-dossier/src/effective-run-record.ts
d0a3e3be202e413f1a1873980b9bc9e6d8687575060c5dd3c5029bd7b060218f  packages/polaris-dossier/src/url-session-audit.ts
5bc857ae7424fc6b102c04d2fcc235842390f7e9345bafea543ce2c754ad6e14  packages/polaris-dossier/src/url-run-composed.test.ts
a5f2fd9e220252673562e463c1d9a52e193216444ed5770d27ccc81e35ba984f  packages/polaris-dossier/src/url-run-composed.testkit.ts
0cb884e02d9020172321635fbd5fa07e20257496933422582e0a7762ed14f78f  packages/polaris-dossier/src/url-stopped-run.test.ts
891d0431151d39f7fcaeb9fc247f095f262428cdd1fbada4bca0f0c2f087b239  packages/polaris-dossier/src/url-parent-adoption.git.test.ts
b416551678e1509297a71be5dc59bebe20526a5f8fc327235da3d18ce9e50838  docs/evidence/syzygy-k54o-3/f3-audit-bootstrap-guard-cost.json
7f9ba0f92af801b9a8041b7955652e9a8082b760cceb4c1a20d13e55b94ca74b  docs/evidence/syzygy-k54o-3/f3-bootstrap-claim-controls.log
fdaeb8013261df77cfab2f35c25423b0f5ffe13d5e5fe66ac4037924fd51c817  docs/evidence/syzygy-k54o-3/f3-bootstrap-policy-controls.log
```
