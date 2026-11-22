# F3 native stop-resume failure on b873fc4c8

[Observed] This bundle records a failed public stop-resume replay on `b873fc4c8c038a80738d3415adfa4652e706d1e5` using owned synthetic fixtures. The uninstrumented run and the replay both cleanly stopped the initial roles, verified and claimed the retained cut, and checked live policy and claim withdrawal. The resumed design process committed launch history, then terminated with `inspection-failed` and confirmed cleanup before design delivery. Both public tests exited 1. The instrumented public case took 202.840 seconds, and the three separately selected producer timer cases passed. End-to-end stop-resume completion remains unverified. [Source, logs, and audit summaries](source-binding.json)

[Observed] Prelaunch render metadata inspection passed with 16,969 ms of the lease remaining. Each metadata stability pass performed 10 synchronous policy checks and made 30 Git calls. The first pass took 444.6 ms and the second took 433.8 ms. Both reproductions passed before the fresh design process started. [Projection](projection.json)

[Observed] The fresh process completed launch-history registration and the post-launch sample check. Sample 9 began during delivery product inspection at monotonic 183,902.6 ms. Metadata inspection had entered `renderer-current`. The 1,000 ms sample timer fired at 1,021.1 ms. The process census finished in 953.3 ms, the storage census was pending, and the sampler had yet to enter its own currentness callback. No process or storage refusal branch was recorded before timeout. [Raw trace](trace.jsonl)

| Call site in delivery product inspection | Successful checks | Overlap ms | Git calls | Git time ms |
| --- | ---: | ---: | ---: | ---: |
| Peer capture | 1 | 46.5 | 3 | 45.2 |
| Run machine | 1 | 37.5 | 3 | 36.4 |
| Machine store | 19 | 831.0 | 57 | 807.3 |
| Total | 21 | 915.0 | 63 | 888.9 |

[Observed] Every overlapping check returned current. The trace recorded no synchronous policy check tagged as part of installed executable hashing in that window. [Projection](projection.json)

[Inferred] The synchronous machine-store policy checks contributed most of the delay in the failing sampling window. The diagnostic observed the machine-store call site and did not distinguish individual lifecycle operations. The timings are from the instrumented replay. [Overlay patch](overlay.patch)

## Verify the evidence

Run these commands with Python 3 from this directory.

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```

The projector verifies the raw overlay and trace digests against the source binding. It validates each trace row against closed field and value domains. The retained trace contains enumerated labels, booleans, finite numbers and nulls. The logs and cuts are referenced by digest. No original trace bytes were edited. [Projector](project.py)

Ordinal 0 records resumed supervisor work before the fresh child starts. Positive ordinals identify supervised processes. All clocks use milliseconds. Policy elapsed time is clipped to each sample window. Git totals count subprocesses within the corresponding policy checks. The projector reports the observed timed-out sample and records expected refusals when the initial processes stop.
