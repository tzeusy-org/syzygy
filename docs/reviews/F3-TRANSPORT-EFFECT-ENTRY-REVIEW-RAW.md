PASS

Bound to base `2003540400519153787eb068e38eacbc96e2d55b` and patch SHA256 `01b61e79cd7b706318dc4f4f4ff287704981e928ca8bda46296313f0cb1cf956`. The scratch worktree diff matches the patch byte-for-byte.

[Observed] The production native mediator retains independent `boundary()` checks immediately before and after the trusted callback (`url-machine-peer.ts:482–484`). The adapter removes only the immediately repeated full guard at callback entry. Its replacement still checks raw/stream destruction, ended state and the original transport deadline before establishing the active effect. Supplied effect guards, escaped-scope revocation, raw-write authority and final tool-budget checks remain intact.

[Observed] The revised fixture models the lower mediator’s entry check. Its counter assertions discriminate restoration of the duplicate guard; the destroyed-socket case discriminates removal of the adapter’s transport-entry check. Existing assertions continue to exercise active authority after an await and revoked escaped descendants.

[Unknown] Mutation execution results and test outcomes were not independently verified in this review. The new destroyed-socket case does not separately demonstrate a deadline crossing during the lower guard, although the production deadline predicate remains explicit.

Reviewed source SHA256:

- Transport: `3b96be4e4bed8a06462d182d7c920bf1e26a782fa7293cc33e39d0f6d3065add`
- Test: `1786302302ab6021024b702e8092206f9ec3b757d89f9f8ccd043790550c9a1e`

Scope: this guard-order reduction only. No claim that it fixes the staged-publication lock timeout. No writes, tests or remote mutations performed.
