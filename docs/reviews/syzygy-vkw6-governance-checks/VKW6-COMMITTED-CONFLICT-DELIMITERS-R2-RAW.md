# Independent review of syzygy-vkw6, round 2

2026-11-24 06:21 UTC. Subject commit `74cf82479b5a4960238dce7121744636c1cdc039`, tree `9053027799d820b8f21d081af6de392c505e738a`. Verdict **CONFIRM**.

[Observed] The exact round changes only the scanner since the earlier review. A fresh detached checkout passed 11 line fixtures and the committed fixture. Its normal scan examined 10,492 tracked regular blobs and reported zero delimiters. An independent count of the regular entries in the exact Git tree matched the reported population. A separate committed reproduction supplied the historical openspec/README.md bytes from `08c7934473b1da30c3c5c29351ac772f877fbe8c`; the exact guard refused and reported lines 69, 71, and 74.

[Observed] F1 is resolved. The scanner disables Git replacement refs on its Git commands. The fixture installs a clean replacement for the unresolved original and expects refusal under the original ID. Removing only the Git option made its selftest fail at that assertion, after the mutated scanner reported zero under the same original fixture ID.

[Observed] F2 is resolved. The fixture contains both an ordinary review and a retained raw in the nested candidate review directory, with the same marker triplet. Removing only the suffix predicate made the selftest fail because the ordinary review's three expected findings disappeared. The valid raw stays exempt in the exact candidate.

[Observed] The independently run proofs are in `root-vkw6-r2-proof.json`, SHA-256 `2320be60668e0f9aff09937d8c57e2f9fc0d480be9a20e8f7ba4512ccb80b566`. This disposition covers the exact source subject. A future adoption or protected merge group still needs its own verification.
