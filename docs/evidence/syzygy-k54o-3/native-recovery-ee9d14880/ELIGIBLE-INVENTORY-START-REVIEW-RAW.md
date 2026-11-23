PASS

[Observed] In `packages/polaris-dossier/src/url-run-composed.test.ts:1096–1104` and `:1246–1257`, the eligible-stop fixture releases Inventory only after the native Fidelity result passes the existing exit-3 and waiting-status assertions for session 1, round 1. This separates the first scripted Messages replies. Token-count replies bypass the gate, and later exchanges can overlap (`:131–140`).

[Observed] The real checked round-1 registration still gates both the Author brief reread and the Fidelity packet read (`:1073–1075`, `:1103–1104`, `:1216–1220`). The ordinary end-turn order, native stop, and recovery record assertions remain intact (`:875–899`, `:1200–1212`, `:1473–1502`).

[Inferred] The gates introduce no wait cycle. The authenticated URL await returns `waiting` when there is no committed delivery, and the relay awaits the fixture’s provider promise outside machine mediation (`packages/polaris-dossier/src/waiting-sessions.ts:658–668`, `packages/polaris-dossier/src/session-relay.ts:315–329`).

[Inferred] The reported 1.28 seconds from simultaneous reply readiness to Inventory’s catch during `send-outcome` exceeds the machine store’s 1-second lock retry bound and falls below its 5-second ordinary operation bound and the 180-second relay bound. The timing is consistent with contention. The cause and the successor’s native stability remain [Unknown]. `git diff --check` passed. No native suite ran in this review.
