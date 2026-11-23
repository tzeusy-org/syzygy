PASS

[Observed] The frozen patch matches the supplied SHA-256 and base commit. `git diff --check` passed.

[Inferred] Resumed Design waits for its exact registered host outside both publication locks. Activation can complete independently of peer publication. The peer then undergoes fresh native and parent checks before entering the existing guarded publication path. The original deadlines and cancellation paths still apply. Initial Design and other roles retain their existing behavior.

[Unknown] Runtime timing and end-to-end verification remain open. No tests or edits were performed during this review.
