# Exact 7ea0d3054 combined native diagnostic

[Observed] The selected owned native Stop and Resume fixture ran on commit `7ea0d30543207d07f5d14641ce8164f3da57958c` with the bound diagnostic overlay. It exited 1 after 212.799 seconds. It retained the initial cut and passed the four recorded public resume controls. The fresh design audit recorded launch history, delivery and one machine-peer `inference-forward` effect. Its terminal recorded `inspection-failed` and SIGTERM, confirmed view and group termination, and settled tools with zero pending calls. The fixture observed zero design provider forwards and no Execution Record.

[Observed] The resumed launch completed 64 samples before sample 65. Times below are elapsed from that failed sample's start.

| Boundary | Elapsed |
|---|---:|
| Storage returned | 377.042 ms |
| Process census returned a count | 377.046 ms |
| Sample currentness entered | 377.048 ms |
| Sample authority check 1018 entered its independent verifier after successful settlement and effect checks | 434.308 ms |
| The original 1,000 ms inspection timer dispatched while that verifier remained pending | 1,073.488 ms |
| The sampler recorded the inspection-failed stop | 1,073.653 ms |
| The relay's first poison occurred while closing | 1,184.562 ms |
| The independent verifier returned | 1,253.072 ms |
| Subsequent settlement refused | 1,253.077 ms |

[Observed] Another authority check, ordinal 1017, ran its independent verifier from 345.640 to 986.744 ms and its second effect passed at 1,032.224 ms. The sample trace records no overlapping issuance-store operation. Initial raw capture and authorization had already passed, in 3,867.630 and 3,146.192 ms respectively. The ordered host had activated and its first relay-current check had returned before the failed sample. No relay or activation refusal preceded the inspection timer in the fresh launch.

[Inferred] The pending sample callback maps to the resumed session's exact asynchronous claim currentness port in the bound source. The overlapped check and the delayed dispatch establish chronology. Their role in causing the delay, and the internal step pending within that verifier, remain [Unknown]. Earlier exact replays used separate instruments and observed a first effect refusal and a sample refusal during issuance.

The bound patch buffered only closed events and left the existing timing and authority calls in place. The raw closed trace contains 11,703 events. Fixture logs, cut files and protected audit segments are represented by digest and closed outcomes. The projector reconstructs the per-stage timing from the retained raw trace.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 project.py --selftest
PYTHONDONTWRITEBYTECODE=1 python3 project.py trace.jsonl | cmp - projection.json
```
