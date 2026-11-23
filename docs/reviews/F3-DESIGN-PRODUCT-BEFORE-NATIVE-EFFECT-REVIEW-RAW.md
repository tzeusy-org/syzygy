**PASS** for `e1b7d513d0e49994955ada0f2d1f325485396bfc`. I verified the binary diff SHA-256 as `0c39dee61f9ec29da98f127acbe8a30794bface28662f77a6a84dc63074f13bc`.

[Observed] The relay now preserves preflight through port initialization, and the ordered broker supplies it independently. Preparation runs outside the store transaction and outside the active effect scope. The original socket, peer, committed client, revocation, audit, and release checks still govern forwarding and replies. The 30-second native effect and 60-second product read caps are intact.

[Observed] An open product with insufficient remaining time must pass its full delivery check before renewal. The replacement is checked against the original committed launch and exact delivery receipt. Changed or withdrawn proofs refuse, and a replacement with insufficient remaining time cannot enter the store transaction.

The adapter cases cover HTTP ordering, refusal, and revocation. I did not rerun tests during the native replay. End-to-end Resume remains unverified by this source review.
