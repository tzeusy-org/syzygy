PASS

[Observed] The frozen diff matches SHA-256 `4a96eb66a54f9b0aeb1217bd615327ef6e9bfab0da7ff853c65d65d932d3df09` at `882119cbc474ef84df6928586733eef7c976c325`. `git diff --check` passed.

[Observed] Resume verifies all retained slots and fresh run authority before allocating the selected endpoints. One bounded store operation checks capacity and identity uniqueness, publishes the complete inert batch, reads it back, and completes the existing cleanup checks before returning any witness. Initial starts retain single-slot allocation, and a zero-role Resume skips allocation. The 16-client run bound and per-client attestation, publication, and grant checks remain in force. `url-machine-store.ts:419–594,660–706` `url-run-machine.ts:215–312`

[Observed] The focused tests check one state update, exact inert entries, preserved archive and client bytes, and witness refusal both before rename and after cleanup. The composed test checks the selected count and confirms that the batch follows the retained reads. `url-machine-store.test.ts:279–335` `url-run-composed.test.ts:1394–1441`

[Unknown] Native recovery and latency were outside this source-only review.
