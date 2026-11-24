# Fresh parent timeout independent source review
Verdict: PASS
Reviewed base: 88e122e108e66418196f24d471417bd19cf6dd96
Reviewed patch SHA-256: 38d049a0f1d8558af6c181788d585f0e1d436c4803241560682a657f3b76b49d

[Observed] Review subject: `/home/orca/.tmp/f3-native-admission-fixes/fresh-parent-timeout-test.patch` and `packages/polaris-dossier/src/url-machine-peer.test.ts`, SHA-256 `db4dd48317c56486328833b1dade35d31ef6cff291d88d3d644d3404119bf5f8`, in `/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w`. Runtime `packages/polaris-dossier/src/url-machine-peer.ts`, SHA-256 `2a1f0067d10f2fdef2ec96716166bd7e9785bb4667aafa580aa90f7fadd56cfb`, is byte-identical to that base. The frozen patch equals the scoped base-to-current test diff. Unrelated composed observer work was excluded.

[Observed] Read repository AGENTS.md, the engineering-bar and test-rigor skills, and the governing craft-and-care engineering/testing policies. Applied test-rigor rules 1, 3–6, 8 and 10; CC-TEST-4 states “The canonical rule (fix nondeterminism or delete the test; never retry-until-green) is strengthened”. This review changes no artifact under review.

[Inferred] The acceptance criteria are met at source level:

- The existing case at test lines 206–237 uses the existing `captureTiming` fixture port (lines 64 and 144). Genuine setup, restricted launch, accepted socket and both actual native listener helpers remain before timer interception.
- The spy is installed immediately before capture and forwards scheduling to the real saved `setTimeout`. In the unchanged runtime, `awaitParentCurrent` installs its timer synchronously at lines 323–324 before `options.current` runs in a microtask. The handshake proves that callback was entered and left pending before asserting the captured delay is literally 5000.
- The test clears the scheduled handle and dispatches the original timeout callback. It then requires a null peer and exactly `['listener', 'listener']`, preserving refusal before peer-capture helpers. This removes the later-callback wall-clock measurement error without adding slack or changing production deadlines.
- The 30000 ms nominal-profile selector case at test lines 166–182 remains separate and unchanged. The changed case exercises the actual parent-authority timer, rather than inferring its delay from that selector.
- On assertion failure, `finally` dispatches any retained timeout callback, clears its scheduled handle, restores the spy and awaits capture settlement while preserving the original failure. Fixture resources remain registered with the existing `afterEach` cleanup.
- One existing case is rewritten. The diff adds no test declarations or parameter rows; an independent declaration count gives 17 `it`/`it.each` declarations in both base and current files. No runtime change, deadline relaxation, retry, assertion removal of the null-peer/helper outcomes, or new testcase is introduced.

[Inferred] Mutation thought experiments: changing the parent delay from 5000 to 5001 or 30000 fails the literal delay assertion; allowing native peer helpers before parent refusal violates the exact helper list. The timer boundary is controlled while its real callback and observable refusal result are retained. No source-level findings require revision. No risk floor is weakened by this test-only patch.

[Unknown] Runtime execution and compile success for these bytes were not verified by this reviewer. Per the review brief, no tests, builds, installs, mutations, commits or pushes were run. The supplied hosted timing incident is context from the brief, not independently reproduced evidence. PASS is a source-review verdict, not a test-pass or merge-readiness claim.
