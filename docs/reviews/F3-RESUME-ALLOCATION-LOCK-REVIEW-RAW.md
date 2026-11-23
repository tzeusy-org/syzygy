PASS

[Observed] Commit `b6aaf7832` overlaps the first held-root fsync and read-only census for staged Resume allocation. Both operations keep their own deadline and I/O checks and must settle before the second authority check or any state read. The successful path retains all six authority checks and the original five-second bound.

[Observed] State publication, fsync, readback, lock cleanup, and witness release retain their order. An early failure withholds witnesses and retains the lock. Other store paths keep their existing behavior. The patch digest was recorded and `git show --check` passed. Runtime tests were outside this source review.
