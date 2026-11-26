# F3 source census repair

[Observed] Commit `a99238103724db0e280c2185287b7afc1f42e1c5` updates two existing test checks: the exact installed-runtime/builder AST statements include the native policy Git program and its captured compiler inputs; the hold-out source census classifies the compiler-consumed C header as searched. Original 19 cases and assertions remain.

[Observed] Fresh source review: **PASS**. Shared typecheck and all 19 owning cases pass with configured workers and original limits. Source remained unchanged during execution; owned children and private scratch were cleaned. The receipt names predecessor HEAD5b352 with the exact two reviewed files applied; index.json binds those files to the resulting source commit.

[Observed] The earlier original clean-clone check:all on5b352 failed in unit: 10 failed, 6497 passed, one skipped of6508 cases across265 files. Later tiers and the canonical battery were not reached. Six source/history files failed; the bounded failure assessment retains their identities. This repair addresses the two deterministic stale checks.

[Observed] A subsequent unchanged four-file diagnostic passed136/138; the two audit cases timed out again. A temporary phase overlay then passed138/138 under the same workers and limits: suspect fixture setup took about1.4–1.5s and the verifier about10ms. The overlay was restored after source/child/scratch checks. Diagnostic records describe instrumented execution, not complete uninstrumented acceptance.

[Unknown] The timeout cause, full-suite success, genuine native recovery and final F3 acceptance. No timeout, worker count, secret screening or authority check changed. External-only records have digests in index.json; future availability is Unknown.
