# F3 interrupted resume before product renewal

[Observed] The uninstrumented public interrupted test on `ee5158f2951bce1ccfedcc9f65b0471f9c7ad44f` and its instrumented replay passed the retained claim and physical withdrawal controls, prepared fresh design round 2, and retained five fresh design audit rows. The last row in each is the first protected `inference-forward` machine-peer effect. Both failed with zero resumed design forwards and no durable ordered, relay or fresh launch-terminal row. The uninstrumented run reported `role-ended` and the replay reported `transport-unavailable`.

[Observed] In the replay, the machine-peer audit returned with 4,372 ms left on its original 5,000 ms cutoff. Its post-audit parent and native checks passed. The first protected effect entered at +191412.9 ms, the first controller request currentness entered at +191666.0 ms, and its ordered resource drain entered at +191999.3 ms. The 30,000 ms store operation returned after approximately 5,799.3 ms.

[Observed] Resource sample 37 started at +191231.3 ms during the post-audit native check, 181.6 ms before effect entry. The original 1,000 ms timer ran at +192320.7 ms, or 1,089.5 ms after sample start, while both the storage and process probes were pending. The trace records 36 earlier successful samples. The request's pending drain refused at +192321.2 ms, followed by screen currentness refusal and host poison. The replay reached no product renewal or screening worker. Its launch trace records `inspection-failed` and SIGTERM.

[Observed] The failing window overlapped 22 successful synchronous policy checks taking 908.3 ms, of which 66 Git calls took 881.5 ms. The classifier assigned 15 checks and 599.3 ms to machine-store callers, three checks and 127.3 ms to session currentness, and four checks and 181.7 ms to run artifacts. The native store lock was held across the window. The original store and audit cutoffs stayed within bounds.

[Inferred] Synchronous currentness checks between post-audit native revalidation and the controller's existing drain delayed the storage and process probes. The trace supports checking for a live sample before entering that synchronous effect boundary. The replay adds diagnostic I/O, and the exact first failure of the uninstrumented run stays unknown. End-to-end interrupted recovery remains unverified.

## Verification

Run these from this directory. The projector checks every raw row using closed fields and values. The source binding retains original logs, cuts and audit documents by digest. The overlay maintains the original cutoffs.

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```
