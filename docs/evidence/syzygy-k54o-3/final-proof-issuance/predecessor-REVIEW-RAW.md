REPAIR `b29a937ecbead4166d75dad7441d2211f4d8d6ad` against `900d3e7103a42ea648ab2bbd2b7a79fd895ab02a`.

- [Observed] The live proof factory starts an independent 30-second reconstruction without the outer read deadline. The final reproduction checks the outer lease before the last proof assertion and population digest, then releases without sampling the lease again. Carry the outer deadline into the live factory and recheck both deadlines immediately before final release.
- [Observed] Late mint overlaps two populated product-read contexts. Both charge the same 8 MiB aggregate budget, including duplicate bytes. [Inferred] This can refuse populations that fit when the contexts run sequentially. Keep the cap and exercise this boundary with a reduced-cap fixture.
- [Observed] Late mint otherwise precedes review counting, preserves the exact proof at rename, and independently reacquires the same terminal event during reproduction. The new tests cover null-proof refusal and product expiry. They leave the live nested deadline, aggregate budget, and final release boundary untested.

No edits or tests were run. Diff whitespace check passed. Manifest SHA-256 is `86961a2620dfe8755f996f33423f0006c999734a826ceff23e39a4b407470f2c`.

```sh
git diff --no-ext-diff 900d3e7103a42ea648ab2bbd2b7a79fd895ab02a b29a937ecbead4166d75dad7441d2211f4d8d6ad | sha256sum
```
