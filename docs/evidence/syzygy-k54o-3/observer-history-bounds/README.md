# Bound unused observer histories

[Observed] A-243 source `3682da0aca3acfb7a92e2e3cfb3f4dec081ff7b3` (tree `e89424e1e5ac6bb9678d1a6f7107b1b14131d0f2`) bounds ten observer-only spy histories in the genuine recovery fixture. Original callbacks, current checks, exceptions, promises and all 320 assertion ASTs remain. Counter-bearing spies and the existing helper remain unchanged. Fresh independent source review is PASS. The archive includes the exact f571 predecessor and the whole-file consumer census.

[Observed] The clean exact-source clone passes typecheck, the three existing observer contracts (four genuine cases excluded), and the normal governance checker (22 OK,17 WARN,0 FAIL across39 checks). The existing history contract verifies sync returns, throws, fulfilled/rejected promise identity and overlapping settlements. Removing only the helper's mockClear fails its intended retained-call assertion in28.938ms (one failed,six excluded); source is restored. Trusted build also passes. No new test declaration is added.

[Inferred] Retained argument/result graphs may contribute to increasing memory and fork cost. The preceding f571 native failure had peak worker RSS658000KiB. The observed60-node provenance graph does not justify a separate indexing optimization; that proposal was deferred.

[Unknown] Memory attribution, speedup, the exact transport failure trigger, genuine recovery and final full/render/hosted acceptance. No product check, screening, capacity or time limit changes. This record supports the bounded observation change, not a successful F3 run.

Archive SHA-256: `81f017373e9012a2d85d70a4fa5804b7c9fb7d8637fcbbfc3cfa0172f4130197`.
