# F3 ordered profile 6 effect envelope source review
Verdict: PASS
Reviewed commit: e1948f97fee627f3a8f137cdebc46f4479abf39f
Parent: 280681a649171b0d5397e298f5dba15288119609

[Observed] This fresh independent review is bound to the five frozen Git blobs below and their delta from the named parent. The working checkout moved during review; source inspection used `git show e1948f97fee627f3a8f137cdebc46f4479abf39f:<path>` and the explicit frozen commit diff. No source was edited, no runtime was launched, and no tests were executed by this reviewer. The review applies heart-and-soul and engineering-bar and reads repository AGENTS.md selectively for the task.

Scope and runtime limitation

[Observed] This is source review of the ordered profile's finite effect envelope and its focused tests. It is not runtime acceptance, fullnormal acceptance, independent stop/resume acceptance, or a claim of end-to-end close. The supplied native fullnormal run is currently failing at a later boundary after approximately 20 seconds of design work. Independently read short summary lines in `/home/orca/.tmp/f3-profile6-normal.log` report `url-run-composed.test.ts` with one failed and one skipped test, the genuine production pipeline test failing, and 121499 ms test duration. [Inferred from the parent coordinator's native-worker report] Design start 1795335160852 to finish 1795335180863 is 20.011 seconds; the reported outcome is transport-unavailable, valid ordinary products, two design forwards, five ordered records and no verdict. An exact 20-second predicate/root cause is not established by this source review. The parent reports the native subject 1de49ab4e is source equivalent to this subject; this reviewer did not independently establish that equivalence.

Findings

[Inferred] No blocking source finding identified within this delta and the stated acceptance criteria. PASS is limited to the reviewed source behavior described below; it does not clear the runtime failure.

1. Genuine profile selects the finite envelope. `session-profile.ts:9,35` advances only the separately named ordered identity to ordered-design-6 and includes nativeEffectMilliseconds=30000 inside its canonical, digest-bound transcript. The ordinary identity remains /2. `session-profile.ts:96-132,191-217` uses issuer WeakSets and deep freezing: copies, serialized shapes and transcript modifications cannot satisfy the genuine native/ordered predicates. The design issuer requires the design role and validated source/policy digest inputs. `url-machine-store.ts:466-471` rejects a supplied non-genuine profile before entering the lock/callback, selects 30000 only for a genuine ordered profile, and checks positive safe integer bounds capped at 30000. Other operation callers retain the 5000 default.

2. Durable client binding precedes the callback. `url-machine-store.ts:472-478` reads the protected current state under the existing exclusive lock and matches the client's latest durable audit profileSha256, role and runId to the supplied profile before invoking the caller. A separately issued profile with different canonical inputs cannot borrow another client's envelope. `url-machine-peer.ts:307-311,426-449` already binds genuine profile digest/run/role at capture and now passes that same profile to the store. The callback still reads and verifies canonical record, committed anchor, audit and projection, then checks actual verifier, scopes, expiry and retirement/revocation before the effect. It captures the effect audit and rechecks currentness before and after effect execution.

3. Finite expiry and lock behavior remain bounded. `url-machine-store.ts:366-444` keeps the operation's own monotonic elapsed check, timer, original supplied deadline and store deadline, plus the unchanged 1000 ms lock contention predicate. `live()` at lines266-270 checks controller currentness, clock monotonicity, store close and original store deadline. The selected 30000 controls both monotonic elapsed checking and the timer; the timer uses the smaller remaining deadline. `write()` retains immediate checks before synchronous rename, checked I/O/readback and fail-closed uncertain/pending state. `url-machine-peer.ts:442-446` additionally clips its boundary to record and active-instance expiry as well as the context deadline. Existing contract limits on cancellation/retroactive undo remain explicit in the peer comment at lines413-416.

4. Policy planes remain distinct. The new audit comparison does not compare profile.input.binding.policy (the profile's base policy) to the machine audit's policySha256 (machine origin policy). The focused test at `url-machine-store.test.ts:79` explicitly makes these different while admitting the matching profile. Current parent/policy/controller checks continue through existing options.current(), peer currentness and canonical lifecycle validation. The profile adds duration capacity, not authority, provider permission or a new adopted-policy exemption.

5. Focused test source covers unprofiled/ordinary/ordered elapsed behavior, clone/oversized-shape/independently issued mismatches before callback entry, and original-deadline or controller withdrawal during preflight with unchanged canonical/projection bytes (`url-machine-store.test.ts:75-125`). These are six generated test cases added by three declarations. The launch-profile assertion advances to the exact new ID while retaining the ordinary bytes/digest and baseline assertions (`session-launch.test.ts:560-580`). [Unknown] These tests' execution results on this frozen subject were not established by this reviewer. Isolated role and run mismatch mutations are not added here; their refusal is visible directly in the new conjunctive predicate. Native peer mediation is outside the executed verification scope.

Governing references

[Observed] A-14 in the frozen adoption log identifies URL dossier 2.1 and its governing amendment/fixed URL policy at ab94bcdc7e4a0e1fdb4488e5f2a642fec0dcf118. REQ-polaris-generation-048 in `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md` states: "Before use, record positive bounds" including "finite registry/audit I/O/output/lock/operation wall limits under the original deadline." Its next-act rule states: "Every subsequent mediated act, including an existing open connection and resume, SHALL recheck the current authoritative record" and the remaining instance/kernel/scope/expiry/policy predicates. Its scope rule says: "Scope authorization does not replace source classification, provenance, provider, complete screening/audit, currentness or tool-effect checks."

[Observed] VIS-4 permits agent adoption of ordinary runtime fixes and keeps secret weakening in the owner class. SEC-5 states: "Unclassifiable content is excluded too: classification fails closed." The complete frozen diff enumerates three production files and two test files; it changes profile identity/capacity, the envelope selector/durable binding and peer argument plumbing, with focused test additions. [Inferred] This delta does not weaken detection/classification or create an authority bypass: the changed effect plumbing retains its existing full mediation path. The review does not certify unrelated detector implementations or the complete runtime.

Frozen subject blobs (SHA-256, calculated from Git object bytes)

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| packages/polaris-dossier/src/session-profile.ts | 22323 | 1d401d51c0cd7c84837a27b53506ff086eaa59d302b03c6f33e3115851a62a14 |
| packages/polaris-dossier/src/url-machine-store.ts | 42076 | b93c94a73fa2a9a13c86ba5384817846d9cca0720199d0a8e6eaebf35c5b0b79 |
| packages/polaris-dossier/src/url-machine-peer.ts | 32792 | 7b0823d5b93092cb734db9a1ef7623a9d5db8a7470a9086a50fbd437c55dbd38 |
| packages/polaris-dossier/src/session-launch.test.ts | 74187 | feecf1661ca2a1860a702b7dd9927b6c85ff6a6ea7f6c3dbf8e87a589d2e036d |
| packages/polaris-dossier/src/url-machine-store.test.ts | 22750 | 3e3d00d9654eed233fe8186f09a3ddbcc26da0805ec3677a20d15b5e14486572 |

Verification boundary

[Observed] Verification consisted of explicit frozen-parent diff inspection, source tracing through profile issuance/store currentness/peer mediation/canonical publication, focused test source inspection and scripted subject hashes. No native or heavy test runs were performed; the coordinator's other worker owns that lane. No clean-tree, green-battery, runtime-success or release/deployment claim is made.
