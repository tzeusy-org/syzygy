# F3 interrupted resume at the first ordered screening guard

[Observed] The uninstrumented public interrupted test on `22e59be1c6313d2546dbc0c4f47a17bd1c8c0ab2` and its instrumented replay passed the cold claim and physical withdrawal checks, launched fresh design round 2, and retained design delivery. Each fresh design audit has five rows, ending with the first protected `inference-forward` machine-peer effect. Both runs reported `transport-unavailable` with zero design forwards and no durable ordered or relay row. The selected cases failed in 202.538 s and 225.519 s respectively.

[Observed] In the replay, the machine-peer audit returned about 970.5 ms after enqueue with 4,029.3 ms left on its original 5,000 ms cutoff. The trace records the physical write, segment sync, directory sync, readback checks, and successful return. Post-audit currentness completed at +208307.2 ms. The held peer entered its effect at +208448.0 ms. Its 30,000 ms store operation returned successfully after approximately 5,839.5 ms.

[Observed] The last verified design product release at +198404.8 ms had 7,471 ms left on the recorded lease. The last async request currentness check observed an open lease at +202110.0 ms. The request then entered `checkRequest` at +208720.8 ms after the machine-peer audit. The controller's synchronous `requireLive()` entered at +208721.1 ms and refused at +208897.5 ms. The trace records no intervening product reproduction or adoption and no entry into the screening worker. Host poison followed at +208897.8 ms.

[Inferred] The last product-release timestamp and remaining lease imply expiry near +205875.8 ms, approximately 2,845.3 ms before the first synchronous screening guard entered. The source calls `assertCurrent()` from `requireLive()`. Its live product guard refuses an expired lease before the async renewal in `screenOperation` can run. The measured timeline supports that expired lease as the cause of the replay's refusal. The uninstrumented run reached the same durable boundary and lacks the fine-grained screen trace. Its precise synchronous subreason remains unknown.

[Observed] Resource sample 35 reached its original 1,000 ms bound while storage and process probes were pending after 34 earlier successful samples. Its timer ran at +209043.5 ms, 145.7 ms after host poison. The launch trace then records `inspection-failed` and SIGTERM. The retained audit lacks a durable launch-terminal row for this replay. End-to-end interrupted recovery remains unverified.

## Verification

Run these commands from this directory. The projector validates each raw row against closed fields and values. The source binding retains the original logs, cuts and protected audits by digest. The diagnostic overlay preserves the original runtime cutoffs and adds trace I/O.

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```
