# Owned public stop-resume screen and census diagnostic on db7dbbd88

[Observed] One selected integration case, `runs the genuine production pipeline to stop-resume`, ran on one worker against base `db7dbbd88db2bfc50dd4e8bfd36e4fae5f28de28` with the included overlay. The fixture kept PT2H, its 540-second test watchdog, the original runtime deadlines and the original authority and filesystem calls. The collector buffered closed values and wrote them after the fixture. The single selected case failed after 236.204 seconds, with three other cases skipped.

[Observed] The retained initial cut and all four resume guard groups passed. The fresh design committed launch history and round 2 site 1 delivery. The screen reported `transport-unavailable` and later `protected rendered site evidence changed or expired`. The fresh design audit segment has five records through terminal cleanup, with no machine-peer row. The fixture recorded no design forwards and no Execution Record.

[Observed] The resumed launcher confirmed 26 samples. On sample 27, independent verification returned true at 147.983 ms. Storage completed at 150.403 ms and the process census returned a count. The synchronous confirmation returned false at 150.417 ms. The launcher then stopped with `inspection-failed` and SIGTERM. Durable terminal evidence recorded view exit, confirmed group cleanup, settled tools and zero pending invocations. The original one-second timer did not fire on this sample.

[Observed] The closed trace contains 518 events and no entry to the private ordered screening runtime. Both census walks completed before the confirmation returned false. The filesystem pending-operation recorder emits a snapshot on the first deadline callback or sample guard refusal. Sample 27's earlier confirmation refusal did not enter either snapshot branch.

[Unknown] The exact earlier transport fault and whether screening runtime hashes overlapped the previous db7 replay's sample 62 deadline. This replay stopped before screening and reproduced a different first observable sampler failure. It measures neither runtime hash time nor private worker currentness cost.

[Observed] The runtime build manifest matched 380 of 380 input files and 8 of 8 output files. The two traced product files are manifest inputs. The third file changes the fixture collector only. The exact raw trace and overlay are retained here. The screened run projection binds the original stdout, cut, failure manifest and retained audit segments by digest. The runtime is an instrumented diagnostic subject.

## Verify retained evidence

```sh
sha256sum -c SHA256SUMS
PYTHONDONTWRITEBYTECODE=1 python3 project.py --selftest
PYTHONDONTWRITEBYTECODE=1 python3 project.py trace.jsonl | cmp - projection.json
```

`project.py` validates the complete closed trace population and projects screening phase durations, currentness counts and census pending operations when present. Its fixtures include overlapping hash and census work, plus a false confirmation. `native_project.py` can regenerate the screened fixture result using the original local artifact prefix and process exit code. `bind_source.py` checks the base, frozen patch and manifest inputs and outputs while the diagnostic checkout contains the built runtime.
