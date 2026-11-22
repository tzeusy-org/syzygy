# Resumed audit setup on exact df10e086d

[Observed] The owned instrumented public stop-resume selected case on `df10e086df8868b0b260e217c88b6b2d3955a1e7` ran for 374.187 seconds within its 540-second fixture watchdog. It verified the original stopped cut and claim, and exercised physical withdrawal in the resumed policy and machine checks. The normal runtime cutoffs remained in force.

[Observed] The resumed audit created all four role segments, returned all 51 original authority checks, and committed all four declarations. Construction took 4041.8 ms and finished with 960.8 ms left on the original 5000 ms cutoff. The completed awaited authority checks took 3943.9 ms in total, with a longest individual check of 111.3 ms. The initial audit performed the same 51 checks and finished construction in 88.9 ms.

[Observed] The resumed machine allocated eight fresh slots beside its eight sealed clients. Its store lock released and it published resumed site 1. The fresh design audit then recorded a native launch attempt and launch history, followed by terminal `inspection-failed` and SIGTERM. It confirmed view exit and group termination, with the tools settled and no pending invocation. No design delivery or Execution Record was retained. The screen reported `transport-unavailable` and the selected fixture recorded zero design forwards.

[Unknown] The trace covers audit construction. The exact first post-launch sample check that caused this outcome remains unresolved. Public interrupted recovery remains unverified.

## Verification

The source binding fixes the exact candidate and diagnostic patch. The allocator source and its test were byte-identical to the candidate during this replay. The run binding names the original native log, cut, failure manifest, machine state and fresh audit segments by digest. The retained trace excludes local locators and raw event payloads.

```sh
sha256sum -c sha256sums.txt
python3 project.py trace.jsonl | cmp projection.json -
```
