# Exact 7ea0d3054 transport diagnostic

[Observed] The selected owned native fixture at `7ea0d30543207d07f5d14641ce8164f3da57958c` plus the bound overlay exited 1 after 285.489 seconds. It retained the initial stop cut and passed all four public resume controls. The fresh design audit ended after launch history with `inspection-failed` and SIGTERM. It confirmed view and group cleanup and settled tools with zero pending invocations. The fixture recorded zero design provider forwards and no Execution Record.

[Observed] After the fresh design spawn, the relay accepted a raw connection at 634.618 ms. Capture passed in 4,828.570 ms of the original 5,000 ms. Protected issuance publication started at 5,523.376 ms. The sample operation refused after 1,076.337 ms at 6,225.176 ms after spawn, while the issuance call was outstanding. The child stopped, the host began closing and the relay first poisoned on close. The supervisor then recorded `role-ended`. Issuance and authorization refused at 6,365.615 and 6,365.654 ms after spawn. The overlay observed no host activation timeout, pre-stop poison or current-false sample in this fresh launch interval.

[Observed] The original seal has seven revoked and one never-issued clients. The ended store has seven committed and nine never-issued slots, a 39-entry archive and one retained lock. The state and archive last modified times precede the fresh terminal audit. The retained lock time precedes that audit file's final append by 0.762 seconds. The fresh publication did not leave a durable reserve.

[Unknown] The overlap does not establish what consumed the sample deadline. This overlay did not record each sample's census stage or successful sample count, or identify the publication's outstanding internal await. The earlier bootstrap replay reached a separate first effect refusal and has its own bound evidence.

The fixture buffered closed rows inside the timed path and wrote them after completion. The raw fixture log, cut and failure manifest are retained separately and identified by digest. The raw closed trace and its rerunnable projection are included here.

```sh
python3 project.py --selftest
python3 project.py trace.jsonl | cmp - projection.json
```
