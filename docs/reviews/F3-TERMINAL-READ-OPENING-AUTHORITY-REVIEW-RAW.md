**PASS** for `0a58dbfc9667078e9308c868ae7f0ebb3cfe0e68`. I verified the binary diff SHA-256 `ee1b789c3a00da54bd178f87aad345cc6d28846ae8b298d9735245a5c72c82fb`.

[Observed] The joined terminal read still checks asynchronous authority before lock I/O, then checks synchronous authority, both named roots, and the deadline immediately before `mkdir`. The detached read, both paired authority and time samples, lock ownership and cleanup, and the five-second operation and one-second contention bounds remain intact. Other lock paths retain their original checks.

[Observed] The focused tests cover withdrawal of either authority before lock submission. The combined timing case charges 4,745 ms in simulated authority latency. Restoring the duplicate check would raise that to 5,110 ms before filesystem overhead.

I reviewed the source and tests without running them during the native replay. Hosted Resume completion remains unverified by this review.
