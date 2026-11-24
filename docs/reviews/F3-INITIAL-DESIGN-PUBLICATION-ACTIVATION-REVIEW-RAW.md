PASS

[Observed] Reviewed only commit `a1f86c1551463f2c7501d1b0e34d77e244fb3ce8` against parent `61185f7d4bd5b87333b97ae7081e7a2b7c4020dd`. Recomputed binary delta SHA-256: `79e14f2f48d530fad95632941426ad71e0742d748110590d0a3f66970bb41670`.

[Observed] Governing references read: VIS-4, SEC-1, SEC-5, and REQ-polaris-generation-035/048. REQ-048 requires publication and projection synchronization “before allowing the client any data/effect”; REQ-035 requires current authentication and a new protected epoch for a fresh attempt.

[Inferred] The change satisfies the reviewed acceptance criteria:

- Both initial and resumed ordered Design clients await activation before entering `serialize` (`url-run-machine.ts:287`). Pending activation holds neither the mutation queue nor the publication lock.
- The callback receives the peer’s captured launch object. Production resolves its host through `designHosts.get(child)` and checks `processes.get('design') === child` after activation (`url-run-sessions.ts:477`). The existing host/controller validation binds that attempt to its profile and delivery.
- Launch registration and delivery commitment precede `activate(controller)` without depending on machine publication (`url-run-ordered-attempt.ts:299–366`). I found no circular wait in this sequence.
- Stop synchronously sets `closing` and closes tracked peers before queued retirement. An activation that resolves later fails the authority checks before publication.
- The larger publication envelope remains restricted to the first resumed ordered Design inference client: `old === null`, `resumed !== undefined`, ordered Design profile, and `inference-bridge`. Initial publication keeps its existing limit.
- The frozen caller sweep found one production construction site and two test fixture construction sites; each supplies the now-required callback.

[Observed] Read the retained focused verification output: `url-run-machine-close.test.ts` passed 37/37 cases, including the added two-client Stop-before-activation regression. The typecheck log contains the completed `tsc -p tsconfig.json` invocation; the coordinator reports exit status 0.

[Unknown] This review does not establish successful native hosted delivery. The added regression substitutes the profile predicate and peer-publication helper. No native suite was run during this read-only review. The verdict excludes later commit `d45584c52a5f90a508c084dbe03d2889698be08c`.

## Patterns

[Inferred] Waiting for activation outside the serialized publication path preserves retirement progress. Rechecking the captured child after activation prevents a replacement attempt from satisfying an earlier peer’s wait. Keeping the resumed envelope selection separate from activation preserves the original publication budgets.
