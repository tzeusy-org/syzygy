# F3 native design inspection timing

[Observed] This diagnostic ran the owned synthetic public stop-resume fixture on source `78e9539547f797b70a1f540085236853b8abac49` with the recorded overlay. The three selected actual producer timer tests passed. The public native case reached the clean stop, verified the retained cut, acquired it and checked live policy and claim withdrawal. The fresh design process committed launch history and ended in `inspection-failed` before design delivery. The test exited 1 after 210.720 seconds. Source, fixture and original log digests are in the [source binding](source-binding.json).

[Observed] The first render step returned with 12,574 ms of the read lease remaining. Metadata inspection passed in 5,713.1 ms with 6,861 ms remaining. Both reproductions returned successfully before the fresh design process started. The stable predicates inside metadata inspection occupied the following windows. [Projected witness](projection.json)

| Metadata predicate | Elapsed ms | Synchronous checks | Check time ms | Git calls | Git time ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| First stable | 2,721.3 | 67 | 2,541.0 | 201 | 2,449.7 |
| Second stable | 2,687.9 | 67 | 2,515.6 | 201 | 2,438.1 |

[Observed] Fresh design sample 4 started during launch-history commit at monotonic 194,447.5 ms. The process census finished in 237.2 ms. The 1,000 ms timer fired at 1,109.1 ms, just after registration reached its poll boundary. The storage census was still pending. The sample had yet to enter its own currentness callback. No directory-disappearance branch or process error was recorded in that sample. The trace recorded 21 successful synchronous policy checks in the sample window. [Raw trace](trace.jsonl)

| Phase | Policy call site | Checks | Overlap ms | Git calls | Git time ms |
| --- | --- | ---: | ---: | ---: | ---: |
| Launch-history commit | Machine peer | 15 | 678.3 | 45 | 658.1 |
| Registration start | Run artifacts | 1 | 41.2 | 3 | 40.0 |
| Registration prompt match | Run artifacts | 5 | 183.1 | 15 | 177.3 |
| Total | | 21 | 902.6 | 63 | 875.4 |

[Inferred] Synchronous policy work across launch-history commit and registration delayed the storage census past its deadline. The prelaunch render work lengthened startup but completed before the sampler started. These timings describe the instrumented replay. The uninstrumented run on the same commit independently ended at the same audit boundary. [Diagnostic overlay](overlay.patch)

## Recheck the witness

Run these commands from this directory with Python 3. The projector works offline using only the adjacent source binding and raw artifacts.

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```

[Observed] The projector validated the complete raw trace against per-event field names and closed value domains defined from the overlay. Each recorded string is an enumerated label. The other values are finite numbers, booleans or nulls. The raw trace carries no provider bodies, secrets, Git output, file paths or raw errors. The native log and cut are referenced by digest. [Projector and field domains](project.py)

Ordinal 0 covers the resumed supervisor before the fresh child starts. Positive ordinals identify supervised process launches. All clock values are milliseconds. Stable pass time measures from the recorded predicate entry to entry of the next predicate. Policy time clips each check to the observation window. The per-site Git totals count subprocesses from those checks. The trace logs selected successful samples and all recorded refusals. These are measurements of the exact replay and overlay. [Source binding](source-binding.json)
