# F3 ordered native capture independent review — raw

Verdict: PASS

[Observed] Review subject: commit `e1365897035fe5c8eeecfc0b8a25ccd9732fd599` against base `f0d182e7acc1d2e5826035d739b8c17dfa695ccf` in `/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w`. Binary delta SHA-256: `f9ae151b807b1ad7fbd6dca00f847b94976d0d86336f745a1e29fde735dd555a`. HEAD matched the subject and `git diff --name-only` returned an empty tracked-worktree delta during inspection. This review assesses the five-file source delta, its scoped acceptance criteria and supplied verification artifacts. It does not certify native production completion or adoption of the new timing semantics.

| Changed subject | SHA-256 |
|---|---|
| `packages/polaris-dossier/src/session-machine-transport.test.ts` | `5833c9a2b04fde4657054024a7adf39a2e2c192ff08d22c7dcfc883eb42f5514` |
| `packages/polaris-dossier/src/session-machine-transport.ts` | `d86bdab9723b16772205ab2f74fc938c9d8494cd1ef16ebc8f9af538ab58cbc4` |
| `packages/polaris-dossier/src/url-machine-peer.test.ts` | `3f0af7fe67dce57fc3a1d9056868742575ade71b3702e3373b9c07f2b0a5711d` |
| `packages/polaris-dossier/src/url-machine-peer.ts` | `2a1f0067d10f2fdef2ec96716166bd7e9785bb4667aafa580aa90f7fadd56cfb` |
| `packages/polaris-dossier/src/url-run-machine.ts` | `260bc0eb8070b2053857cb8b2bf68de5016f2a05de52d9537832096a762a9827` |

[Observed] The supplied binding also names unchanged `url-run-machine.test.ts`; its digest matched. `binding.json` SHA-256: `63f57a98bf46bfa699b4f08506f617a1460f13837e3a09390696d45d70f6e2b1`. `controls.json` SHA-256: `6e8d6fccd4011ea9bb400d2d75908a6d4f9da97ac20b9802f64adec5f3a8c5cf`. The three binding-listed verification log digests and seven control-specific log digests matched their supplied records. The control logs were inspected for assertion failures, not merely nonzero exits.

## Governing limits and adoption

[Observed] REQ-polaris-generation-048, current adopted source at `openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md`, requires the exact role/profile/runtime bindings and finite limits, and says: “Before serving data, registering a reply, performing a tool/adapter effect or forwarding a request, the host SHALL obtain actual kernel peer/process/channel attestation”. RFC3-16(d)(6) requires “finite record/instance/client/parse/I/O/lock/output/wall bounds under the original run deadline”. These clauses require retained attestation, currentness and boundedness; neither quoted clause already grants a thirty-second capture setup window.

[Inferred] Selecting the existing ordered profile's declared `nativeEffectMilliseconds` as a capture setup envelope is new engineering behavior. It is within the agent adoption class under VIS-4, provided no owner-class safeguard is weakened. The landing change must record that new meaning in its adoption row; this PASS does not supply or assert that adoption. VIS-4 says the agent records “what changed, why, and the command that reverts it”.

## Source assessment

[Observed] `urlMachinePeerCaptureMilliseconds` (`url-machine-peer.ts:24`) first requires a genuine nominal native profile, then exact context digest/run/role equality. Ordinary profiles return the existing 5000 ms limit; ordered profiles return their immutable transcript's declared native effect bound, checked as a positive safe integer no greater than 30000. The ordered-profile constructor independently requires role `design`, freezes the transcript and profile, and registers it in its private WeakSet. A copied object cannot select the extended profile through structural fields.

[Observed] `createUrlRunMachine` selects that bound once from the prepared plan/context (`url-run-machine.ts:248`) and passes it into the first-party transport. The transport snapshots and freezes the numeric selection with its trusted closures (`session-machine-transport.ts:75–79`), retains 5000 ms when no bound is supplied, and rejects malformed or excessive selections. The scalar port is an internal trusted setup setting; it is not a caller-supplied identity or authorization credential.

[Observed] The outer deadline is `Math.min(original connection deadline, connection start + selected capture bound)` (`session-machine-transport.ts:110`). A capture returned after expiry is closed before authorization. Authorization remains bounded by the original connection deadline, with `stillOpening` rechecking time, paused/empty socket and exact peer binding. The expanded existing staged-admission table checks that expiry avoids authorization, closes the late peer and performs no backend read. The transport's remaining effect and ingress clocks still use the original deadline.

[Observed] The intrinsic capture uses the same selector at entry and at its existing executable-image and final aggregate elapsed checks (`url-machine-peer.ts:355,400,421`). Parent authority retains its independent five-second race clipped to the run deadline (`:324`); launch registration retains its existing five-second allowance (`url-run-machine.ts:262`). Capture obtains the launch and independently samples kernel/process/image facts before returning a peer. It does not await design activation; the unchanged authorization path subsequently waits for publication while the socket remains paused and only then performs protected store publication.

[Observed] The changed production hunks are limited to selector creation/use, trusted bound validation/snapshot and the outer/intrinsic aggregate comparisons. Fresh kernel identity, process lifetime, namespaces, image/script, socket, parent and next-act checks remain in their existing paths. The resource inspection bound remains 2000 ms in unchanged `session-launch.ts`. Startup, product, run and credential expiry definitions are outside this delta. The original run deadline is still checked during image reading and peer currentness; capture selection itself grants no effect authority.

[Inferred] No blocking correctness defect was identified in the five changed files. The shared helper removes drift between the outer and intrinsic selection without introducing a new state machine or dependency. Its small trusted-port addition and explicit bounded default are proportionate to the observed outer-timeout failure described in the review request. That reported interrupted native failure is motivation supplied by the requester, not a native run independently reproduced in this review.

## Verification and test quality

[Observed] Independent read-only focused command run on the exact subject:

`npx --no-install vitest run --project integration packages/polaris-dossier/src/session-machine-transport.test.ts packages/polaris-dossier/src/url-machine-peer.test.ts -t 'verified-chunk session transport adapter|selects capture time only'`

Result: 2 files passed; 33 tests passed, 25 skipped, population 58. This exercised the complete transport adapter suite and the nominal selector test. It was not a kernel-attestation or full native ordered-pair run.

[Observed] Supplied exact-source `restored-focused.log` records 19 passed, 39 skipped, population 58, including ordinary intrinsic image/final expiry, original run expiry and the independent parent timeout. Supplied `final-typecheck.log` records `tsc -p tsconfig.json` without diagnostics. Seven supplied mutation controls fail at their named behavioral assertions: old outer five-second cap, unclipped caller deadline, copied profile acceptance, ordinary intrinsic image/final widening, removed run expiry, shortened parent timeout. This review inspected those logs and their bound digests; it did not rerun mutations or the broader native suites.

[Observed] Net delta: 110 added lines, 22 removed, +88 total; +20 production and +68 tests. Test-case growth is +15: three extensions to the existing staged-admission table, seven invalid-bound table cases, one nominal selector case, two ordinary intrinsic boundaries, one original-run-expiry case and one parent-timeout case. The existing table now also checks snapshotting and absence of early settlement. These exercise distinct admission, binding, expiry and retained-limit risks; the table extensions avoid duplicating staged transport setup. Expected numeric bounds are literal assertions, rather than computed from the helper under test.

[Inferred] The additions earn their growth under engineering-bar/test-rigor: regressions that revert the outer fix, drop caller clipping or accept copied profiles are demonstrated to fail; ordinary capture and retained parent/run limits have counterexamples. Clock substitution stays at the external time boundary. The ordinary intrinsic tests widen both aggregate comparisons together in their mutation controls, so they establish the combined guard behavior rather than independent necessity of each redundant comparison. The parent-timeout test asserts an elapsed lower bound of 5000 ms and its control shortens that timeout; it does not independently reject a widened parent timeout. Preservation of the five-second upper bound is supported here by inspecting the unchanged timeout expression.

## Limits of the verdict

[Unknown] A genuine ordered native intrinsic capture exceeding five seconds and succeeding within thirty seconds has not been exercised by the reviewed evidence. The 6000/30000 ms transport cases use the adapter backend; the nominal selector test proves selection only. The actual native pair must establish that remaining end-to-end result, including its current kernel/image/process checks and acknowledgment, under its original product/startup/run/credential limits. This PASS must not be reported as that native success, fresh-kernel proof from the selector, or an end-to-end close.

[Unknown] The root coordinator's exact-clone 65-case run and landing adoption record were pending when this review was requested and are not claimed here. No broad battery or native suite was run by this reviewer. This is a source-review PASS with the explicitly bounded verification above.
