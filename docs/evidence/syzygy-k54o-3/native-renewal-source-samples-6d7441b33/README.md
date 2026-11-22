# F3 interrupted resume during same-delivery validation

[Observed] The uninstrumented public interrupted test on `6d7441b33c1c500874cd17f8fda687ac676cc914` and its instrumented replay both passed the exact claim and physical withdrawal controls, prepared fresh design round 2, and retained five fresh design audit rows. The last durable row is the first protected `inference-forward` machine-peer effect. Both reported `transport-unavailable` with zero resumed design forwards and no Execution Record. The selected test took 224.52 seconds uninstrumented and 229.44 seconds with the overlay.

[Observed] In the instrumented run, the machine audit returned at +200028.1 ms with 4231.9 ms left on its original 5000 ms cutoff. The final post-native resource drain took 257.1 ms and passed at +200708.9 ms. The fresh peer check and the genuine store sample passed at the effect boundary. The first protected effect entered at +200860.2 ms. The first ordered request reached its checked resource drain, observed an expired delivery product, and began same-delivery reproduction at +202071.6 ms. Rendering began at +202124.8 ms and validation at +208225.2 ms.

[Observed] The 52nd successful fresh design sample returned at +208774.3 ms, and the enclosing product drain's return guard completed at +208817.1 ms. The next sample began at +209182.2 ms. Its process census finished after 533.7 ms, its storage census after 859.5 ms, and its runtime currentness was pending when the original 1000 ms timer ran after 1294.8 ms. `inspection-failed` was recorded at +210477.6 ms, followed by validation refusal, missing renewal, host refusal and SIGTERM. No same-delivery adoption or screening worker was reached. The ordered effect's 30000 ms store lock released after about 14847.2 ms, without a store cutoff event.

[Observed] The failing sample overlapped 25 synchronous policy checks taking 1125.7 ms, including 75 Git calls taking 1096.1 ms. The supervisor classifier accounts for 16 checks and 687.5 ms. Four session-current checks, four run-artifact checks and one product-sample check account for the remaining nine. One completed async session-current check overlapped the window by 453.6 ms. The resource timer triggered before the controller refused renewal.

[Inferred] Source order brackets the 16 supervisor checks during `verifyUrlRenderedSources`. In `url-design-product.ts`, the last completed drain precedes rendered-site screening, one supervisor `live()` call and the awaited source proof. The next drain begins at +209989.4 ms and its entry guard returns at +210039.6 ms. The later product `stable()` gate follows this drain and the parent, packet and envelope checks. The failing sample prevents reaching that gate. All 21 supervisor checks in the bracket fit one post-screen check and two warm ledger source verifications of 10 checks each. In that sequence the sample starts at the first reader's await boundary and a concurrent session check runs at the second reader's await boundary. The trace retains no source-body population or per-body labels. The exact first cause of the uninstrumented run remains unknown. End-to-end interrupted recovery remains unverified.

## Verification

Run these commands from this directory. The projector checks each trace row against closed field and value sets. Source binding retains the native logs, cuts and audit documents by digest. The overlay leaves the original timeouts and outcome predicates in place and adds diagnostic I/O.

```sh
sha256sum -c sha256sums.txt
python3 project.py | cmp projection.json -
```
