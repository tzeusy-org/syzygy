# Record what a dossier costs, per session

## Why

[Observed] The Execution Record carries only the operator's declared token or turn figure, and the step measures' `toolOwnedUsage` is a fixed Unknown (REQ-polaris-generation-033 v2.31). The newest stored run's record says usage was not recorded. Token and money cost of a dossier is unknown, so economy cannot be improved by design, and a comparison with a plain session cannot charge either side fairly (pursuit move R3, syzygy-5dhm.3).

[Observed] Slice 1 (syzygy-5dhm.25) found that the interactive handoffs give Syzygy no usage receipt. A launched run differs: `syzygy polaris` starts every session itself, each in a private home with `CLAUDE_CONFIG_DIR` set to that home's `.claude`, so the agent tool writes that session's transcripts where Syzygy can attribute them to one role.

## Change

[Inferred] Amend REQ-polaris-generation-033 in full. Close reads each launched role's transcripts, takes only per-response token counts and entry instants, and records per-session usage and a run total as `sessionUsage`, every figure Inferred because each session can write its own home. A run the operator started is Unknown as a whole. Close's report, status and the review page's review-status region each give one cost line; money is Unknown, since Syzygy holds no price receipt. Stage budgets, the cross-run ledger and people-time are later slices (syzygy-5dhm.27 and R21).
