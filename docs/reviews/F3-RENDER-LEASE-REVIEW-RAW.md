PASS

[Observed] The revised test asserts a 60-second lease, then holds the actual URL producer for 30,001 ms and requires it to finish successfully. An independent 30-second producer timer would fail this test. The shorter wall-clock and monotonic deadline tests remain in place, and the product comment now points to the configured cap.

The patch digest matched and `git show --check` passed. Tests were outside this source review.
