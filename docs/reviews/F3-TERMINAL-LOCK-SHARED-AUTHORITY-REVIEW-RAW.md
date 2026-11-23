PASS

[Observed] Reviewed exact commit `eb487a5eb8ef07984b2f83844a91f1e9b8d8d108`, tree `669dcf3f2132abde7def61a4806802283722cbc4`. The post-`mkdir` authority sample gates sync and census with no intervening I/O. The deadline check and budget charge run immediately before submission, resolving the earlier `FAIL` on `6f402ff4`. The five-second operation limit, one-second contention limit, named-root proofs, and paired terminal samples are preserved. Late contention still refuses the read, and uncertain locks remain in place. [Lock handoff](/home/orca/.tmp/f3-shared-terminal-sample.kwMvJ0vo/w/packages/polaris-dossier/src/url-machine-store.ts:550) · [Terminal caller](/home/orca/.tmp/f3-shared-terminal-sample.kwMvJ0vo/w/packages/polaris-dossier/src/url-run-machine.ts:136)

[Observed] The expiry regression exercises the gap after the asynchronous check. It requires no census submission, no verifier call, and a retained lock. The timing regression distinguishes six 760 ms probes at 4,560 ms from seven at 5,320 ms. [Focused regressions](/home/orca/.tmp/f3-shared-terminal-sample.kwMvJ0vo/w/packages/polaris-dossier/src/url-machine-store.test.ts:530)

[Inferred] For the reported 5,196 ms hosted run to fit under five seconds with other costs held constant, the omitted probe must account for more than 196 ms. The reported aggregate does not establish that duration.

Read-only source review. `git diff --check` passed. I ran no tests or native replay.
