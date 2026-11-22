# F3 A78 native stop-resume diagnostic

[Observed] On exact candidate `dc7b7a482472a8b8b39c7be73e37e58ed76d3b10`, the uninstrumented public stop-resume passed the retained-cut and withdrawal checks. Its new design child committed launch history and ended with `inspection-failed` before design delivery. The instrumented replay reached a later boundary. It persisted design delivery, read back the protected view and ended with an explicit `stopped` terminal. Both runs had confirmed cleanup and zero design forwards. The baseline's earlier inspection failure remains unclassified. End-to-end public recovery remains unverified. [Source binding and audit summaries](source-binding.json)

[Observed] Fresh design inference bridge connection 33 passed outer capture in 3,341.6 ms and separate authorization in 3,182.7 ms. Native peer capture took 3,194.7 ms. The transport returned accepted after 6,524.4 ms total. Neither original timer fired. Protected issuance lock 266 was acquired after 84.7 ms and released after 3,103.6 ms. It recorded six completed renames, 23 synchronous checks, 452 local lease checks and zero asynchronous I/O checks. [Transport and store projection](projection.json)

[Observed] The fresh design process completed 20 recorded inspection samples without a resource timer or currentness refusal. The longest took 563.9 ms during delivery product inspection. It overlapped 417.6 ms of synchronous policy work across 11 checks, including 258.7 ms from seven machine-store checks. The first terminal was requested as `stopped` 20.3 ms after delivery view release. [Sample and terminal projection](projection.json)

[Observed source] The verified resume selected design round 2. The audit constructor receives this value as `firstDesignRound`. It seeds the delivery round from that value, while the ordered writer's `nextOrderedEpoch` is seeded at 1. The writer requires both the plan round and transfer epoch to equal its cursor. The delivery plan uses the delivered round for both, so the round-2 delivery cannot create its first ordered writer under that guard. [Source binding](source-binding.json)

[Inferred] The ordered writer cursor mismatch explains the replay stopping just after reading the round-2 delivery. The overlay did not trace the writer entry itself. This is a later failure than the exact candidate's uninstrumented inspection failure. [Overlay patch](overlay.patch)

## Verify the retained evidence

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```

The offline projector validates every raw trace row with a closed schema. The source, patch and trace remain bound to the diagnostic run. Original logs and cuts are retained by digest. [Trace schema](schema.md)
