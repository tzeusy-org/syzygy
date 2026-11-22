# F3 interrupted resume around the first secured request

[Observed] The uninstrumented public interrupted test on `56febf0e01a173864fc7dad76c93bd3db5604270` and the instrumented replay both passed the cold claim and withdrawal controls, launched a fresh design role, and committed design delivery for round 2. Both selected tests failed with zero design forwards. The uninstrumented run retained five fresh design audit rows, ending with an `inference-forward` protected machine-peer effect audit at 12:22:46.162 UTC. It reported `transport-unavailable` at 12:22:48 with no retained ordered or relay row. The exact first failure in that run remains unknown.

[Observed] The replay reached checked native data, complete HTTP parse, writer admission at epoch 2, successful bootstrap drain and host activation. The host accepted activation with 4,532 ms of its bound left. Connection 33 passed first relay request currentness and entered protected mediation before the resource sample timed out. Mediation then refused at its initial currentness check before protected store access or effect audit. The resumed audit instead ended in `inspection-failed` with SIGTERM and confirmed view, group and tool cleanup.

[Observed] Sample 22 armed after the bootstrap drain passed. Its process census completed at 747.0 ms, storage completed at 748.7 ms, and async session currentness was still pending when the original 1,000 ms timer ran at 1,454.2 ms. The trace records 21 earlier successful samples. The failing window overlapped 31 successful synchronous policy checks and 93 Git calls. The checks occupied 1,225.5 ms of elapsed time and the Git calls took 1,188.6 ms. It overlapped no private store operation, admission window or peer parent currentness check.

[Observed] The host's activation callback ran 10 synchronous session-audit checks totaling 417.4 ms. The already parsed request waited for that activation, then ran another 10 totaling 370.0 ms through the same ordered currentness callback. Both intervals overlapped sample 22. The mediator entered at +174741.3 ms and the sample timer ran at +174783.9 ms. Its first currentness refusal followed at +174880.8 ms.

[Inferred] The next targeted boundary to examine is the first request's full ordered currentness check after host activation. A resource sample may now begin during activation and remain pending while that request performs its independent verification. The replay adds diagnostic I/O and stops earlier than the uninstrumented run. The recorded sampler failure does not establish the uninstrumented run's later failure. End-to-end interrupted recovery remains unverified.

## Verification

Run these commands from this directory. The projector checks each raw row against closed field and value allowlists. The source binding records the original logs, failure cuts and protected audit by digest. The patch and sanitized trace retain their original bytes.

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```
