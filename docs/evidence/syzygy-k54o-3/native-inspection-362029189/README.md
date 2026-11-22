# F3 interrupted resume after ordered activation

[Observed] The uninstrumented public interrupted test on `362029189f44e2f4e6bcc045832e6b35f21e52d9` and the instrumented replay each stopped the first four roles, passed the exact retained claim and physical withdrawal guards, then recorded fresh design launch history and delivery. Each recorded a fresh design `inspection-failed` terminal, SIGTERM and confirmed cleanup before any resumed design forwards. The selected test failed in 191.760 s without the overlay and in 190.675 s with it. End-to-end interrupted recovery remains unverified.

[Observed] In the replay, the ordered writer admitted round 2 at expected epoch 2. The host accepted activation with approximately 4,938 ms of its 5,000 ms bound left. Raw peer connection 33 completed both capture and authorization. The replay reached no first mediated audit activity before the resource failure.

[Observed] Fresh design sampler launch 5 passed 21 samples. Sample 22 processed its census by 722.3 ms and completed its storage probe by 737.6 ms. Its async currentness check remained pending when the original 1,000 ms timer ran at 1,484.7 ms. The sample refused at 1,485.0 ms. The window contains 32 successful synchronous committed-policy checks, totaling 1,213.8 ms of elapsed check time including 1,174.0 ms for 96 Git calls. It contains no private store, raw peer admission or peer parent currentness operation.

[Observed] Ten checks classified as session audit overlapped the final ordered currentness phase for 357.5 ms. Ten more overlapped the activation phase for 389.7 ms. The captured source calls the same ordered `current()` closure directly before activation and again inside host activation. On that open-run path, `checkUrlOrderedProductCurrent` invokes `assertCurrent`, which calls `assertUrlDesignDeliveryViewCurrent`. The audit and product freshness checks retain their original authoritative inputs.

[Inferred] The two checks and other synchronous policy work in that sampling window delayed completion of the sampler’s independent currentness check. The overlay measures the order and elapsed time of the replay and preserves the original bounds. It adds diagnostic I/O.

## Verification

Run the following commands from this directory. The projector validates every row against closed field and value rules before emitting the projection. `source-binding.json` records the original native logs and failure cuts by digest. The overlay and closed trace are retained byte for byte.

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```
