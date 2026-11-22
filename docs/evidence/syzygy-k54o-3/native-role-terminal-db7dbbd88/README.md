# Owned public stop-resume diagnostic on db7dbbd88

[Observed] One selected integration case, `runs the genuine production pipeline to stop-resume`, ran on one worker against source `db7dbbd88db2bfc50dd4e8bfd36e4fae5f28de28` and the diagnostic patch in this directory. The fixture ran its pinned native process against the owned synthetic provider. The fixture kept PT2H, the 540-second test watchdog and the existing runtime limits. The test exited 1 after 251.492 seconds with one failed case and three skipped cases. The verified initial cut, exact claim, physical policy and claim withdrawal refusals, and machine claim controls were observed. The fresh design committed round 2 site 1 delivery and an inference-forward audit, with the retained fixture recording zero design forwards and no Execution Record.

[Observed] The post-audit native peer check, sample drain and pre-effect boundary returned successfully. The host request then reproduced the same delivery render in 12,881.825 ms and read the renewed delivery in 2,412.134 ms. Two successful delivery assertions took 652.357 ms and 764.251 ms. The last assertion returned 154.192 ms before fresh sample 62 started. Samples 1 through 61 had passed the final confirmation.

[Observed] The sample 62 deadline callback ran at 1,133.000 ms while the storage walk and parallel run authority verification were pending. Held authority check 488 began its policy phase 1.246 ms into the sample. A second held authority check began its policy phase at 776.773 ms during supervisor currentness check 1185. Check 488 returned true after the deadline, as did the remaining stopped-boundary checks. Check 489 also eventually returned true. The trace records the overlapping operations and their outcomes. [Unknown] The specific cause of the storage walk's delay.

[Observed] The child stopped with `inspection-failed` 0.652 ms after that deadline callback and exited with SIGTERM at +7.689 ms. Relay close poisoned transport at +99.209 ms. The child outcome settled at +100.736 ms, and the supervisor reported `role-ended` at +100.979 ms. The host request poisoned at +123.815 ms. The later terminal audit append was refused, leaving five durable fresh design records through the inference audit. These offsets are relative to the original sample deadline callback.

[Observed] Source binding compared the frozen patch against the independent checkout during replay and again after exit. The runtime manifest matched 380 of 380 input files and 8 of 8 output files, including the nine product sources changed by the trace. The selected integration fixture was the tenth changed file. The base commit differed from the uninstrumented source only in an unselected session-launch integration test. The trace collector recorded 22,423 events and reported zero drops. `trace.jsonl` and `overlay.patch` preserve their original bytes. Native stdout, the cut, the failure manifest and protected audit segments are bound by digest in `run-binding.json`. The bundle contains their closed projection.

[Inferred] The diagnostic reproduces the observed `role-ended` symptom and identifies an inspection cutoff before transport poison or the late peer boundary refusal in this replay. [Unknown] The uninstrumented predecessor's internal sample outcome.

## Verify retained evidence

```sh
sha256sum -c SHA256SUMS
PYTHONDONTWRITEBYTECODE=1 python3 project.py --selftest
PYTHONDONTWRITEBYTECODE=1 python3 project.py trace.jsonl | cmp - projection.json
```

`project.py` checks the complete closed schema and the collector summary before writing the projection. `native_project.py` can regenerate the screened native result from the original retained artifact prefix and process exit code. `bind_source.py` verifies the exact base and overlay against a checkout during replay, while the runtime outputs are present.
