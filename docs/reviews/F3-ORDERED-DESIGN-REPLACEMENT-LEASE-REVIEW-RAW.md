**PASS — source-only independent review**

[Observed] Subject `0ea9df08701372aef146fff8b293f2dd78add98e`, sole parent `7aa29210f97f8ddb1d430921b5c3097c6a95b120`. Scripted SHA256 of the complete binary/full-index diff: `2867851e7c7efab9ce681a11200192b1273ef6e7b91ce27814a3d31a87143ee1` (12,885 bytes). Scope: seven changed source/test files and their production caller dependencies.

**Findings: no blocking source defect found.**

[Observed] The change creates a distinct, immutable **90-second replacement budget**, calculated from the existing 60-second render allowance plus unchanged 30-second native-effect maximum. `beginRunProductReads` still clips issuance to the original run deadline. It changes neither an existing lease’s deadline nor ordinary render’s 60-second limit, the other product-read limits, machine-store operation limits, or the ordered profile’s 30-second effect window.

[Observed] Production selects the new purpose only inside the existing ordered same-delivery refresh closure. Initial preparation, ordinary reproductions and final verdict reproductions retain the default render purpose. Refresh still checks the original protected receipt before reproduction, independently validates the replacement, rereads the exact delivery, asserts its complete current proof and checks its live lease before replacing the held product. Failure closes the unadopted replacement. A replacement lacking the remaining effect window still refuses before entering the store.

[Observed] Normalizing replacement evidence to `operation: 'render'` preserves the existing render population and pending-record exclusions. It does not bypass validation. Same-product comparison permits only the independently issued lease deadline to differ; the remaining metadata must match. The changed numeric limits remain inputs to runtime/profile-registry identity, preventing the new budget from being an unrecorded ambient extension.

[Observed] This is consistent with REQ-polaris-generation-035: “Reserve finite expiring capacity … without extending the recorded original deadline or lowering the ordinary role caps.” REQ-polaris-generation-048 retains finite operation bounds, next-act revocation and refusal on breached limits. The change deliberately succeeds A-162’s budget selection while preserving A-171’s preparation and effect-entry safeguards. It changes no secret detector, screening predicate, sandbox rule, repository ownership or network exposure; no owner-class decision is introduced under VIS-4.

[Observed] The added regression checks the 90-second replacement bound, original-deadline clipping, rejection above that bound, rejection of 90 seconds for ordinary render, render-evidence normalization and immutable expiry. It does not itself exercise the production refresh-purpose wiring.

[Unknown] I ran no tests, typecheck, mutation controls or native replay. This verdict establishes source acceptability, not verified runtime completion or sufficient native timing margin.
