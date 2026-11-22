# PASS

[Observed] Reviewed the single-file diff for `5b3d9ae430ba9c6c2b5b4310681fa53720aefadd` against `e08502b9c510fae4e4565f44d6529cb1009a73f4`. Tree `3cfb691c1fba074253736141a7a71933cc65d4dd`.

`git diff --no-ext-diff --binary --full-index e08502b9c510fae4e4565f44d6529cb1009a73f4 5b3d9ae430ba9c6c2b5b4310681fa53720aefadd | sha256sum` yielded `debe518f3c4814d67abc44c9764e56e774b79111339b8fd05a623b98fde02d0c`. The plain diff digest is `f741ad976eb68629bb5a151d1a075fb75ea2f98515cffebb97e5a369d15ed8bd`.

[Observed] Host startup checks machine currentness before any delivery exists. Once delivery exists, a live design child triggers a poll turn and a bounded sample drain. The sampler checks run currentness independently of the ordered attempt and its activation. A child already known to have exited skips the added drain. If the child exits during the poll turn, the collective drain excludes a terminal-consumed design child and fails closed on unexpected shutdown.

[Observed] After the drain, fresh machine and mediated-effect checks still cover policy, the exact consumed claim on resume, stop, budget, health and deadline. The existing product lease and exact delivery proof checks follow, including the existing refresh path for an expired lease. The host keeps its original activation cutoff and refusal and cleanup paths. Later relay, tool and audit actions still pass their own authority checks.

[Unknown] The drain waits for samples already in flight. Exact scheduling and native recovery at this commit remain unverified. No tests or edits were performed.
