# F3 A77 native stop-resume diagnostic

[Observed] The owned synthetic public stop-resume replay on `51e3d646580d718e256c647dce325de993910fd4` reached a clean initial stop, verified and acquired the exact claim, and refused live synchronous and asynchronous claim withdrawal. The fresh design audit persisted launch history and design delivery. It then recorded `inspection-failed` and SIGTERM with confirmed view, group and tool cleanup. The replay's public test failed after 197.449 seconds, with zero design forwards. End-to-end stop-resume completion remains unverified. [Source, logs, cuts and audit summaries](source-binding.json)

[Observed] The resumed design inference-bridge connection 33 armed the existing 5,000 ms accept timer. Native peer capture succeeded in 3,527.9 ms. Issuance entered protected publication 1,902.9 ms before timer dispatch, which arrived at 5,575.7 ms after arming. The raw connection returned refused while issuance was pending. [Raw trace](trace.jsonl)

[Observed] Store lock 266 started 0.2 ms after issuance publication entered. It was held 539.7 ms after entry. The raw timer fired during the first protected state read, with the last progress row recording 3 synchronous check attempts, 8 asynchronous check attempts and 4 I/O entries. The store later recorded a rename and a failed lock result at 5,017.0 ms with 22 synchronous and 30 asynchronous lock check attempts, 15 I/O entries, 4 state reads and 1 publication attempt. Issuance returned false at 5,061.7 ms. No lock release was recorded for that lock. [Projected operation windows](projection.json)

[Observed] The 1,902.9 ms issuance window before raw timeout overlapped 22 completed synchronous policy checks for 969.9 ms and 17 completed asynchronous policy checks for 1,619.2 ms of union elapsed time. All overlapping checks returned current. Of the asynchronous checks, 13 were attributed to machine-store. These numbers report overlap. Asynchronous waiting does not measure event-loop blocking. [Projected policy timings](projection.json)

[Observed] Sample 12 completed storage, process and currentness phases and returned false from currentness in 161.9 ms total. Its 1,000 ms timer did not fire. The first design terminal followed at 180,686.7 ms on the same monotonic clock. [Projected sample and child terminal](projection.json)

[Inferred] The raw accept refusal poisoned the inference relay and caused the sampler's currentness refusal. In the bound source, a null raw transport poisons the relay. Ordered host health includes relay health, which is checked by the runtime currentness callback. The retained fixture failure summary does not name a resumed controller failure kind. [Overlay and source binding](source-binding.json)

## Verify the retained evidence

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```

The offline projector validates every raw trace row against closed value domains. Logs and cuts are referenced by digest. Timings come from the instrumented replay, which used the original inspection, peer and store limits. [Schema and measurement details](schema.md)
