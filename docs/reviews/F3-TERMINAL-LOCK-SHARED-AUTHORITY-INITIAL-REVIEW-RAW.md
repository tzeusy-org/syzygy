FAIL

[Observed] Commit `6f402ff4fcaf22ee4831e643830ec33d5b01cfa8` shares the asynchronous authority sample, but drops the deadline check immediately before submitting lock sync and census. `reverify()` checks the deadline inside a nested promise. The caller can resume after the deadline and start `fsync` and `opendir`. Restore `checkDeadline()` immediately before `syncAndCensus()`. Restore the former wrapper’s `charge()` there to preserve the I/O budget. Neither requires another authority sample. [url-machine-store.ts](/home/orca/.tmp/f3-shared-terminal-sample.kwMvJ0vo/w/packages/polaris-dossier/src/url-machine-store.ts:565)

[Observed] The review traced both named-root checks, the two terminal authority and time samples, the archive and digest checks, and the refusal paths for late contention and uncertain locks. The shared sample is confined to asynchronous terminal reads. [url-machine-store.ts](/home/orca/.tmp/f3-shared-terminal-sample.kwMvJ0vo/w/packages/polaris-dossier/src/url-machine-store.ts:551) · [url-run-machine.ts](/home/orca/.tmp/f3-shared-terminal-sample.kwMvJ0vo/w/packages/polaris-dossier/src/url-run-machine.ts:136)

[Inferred] Six synthetic samples at 760 ms consume 4,560 ms. Seven consume 5,320 ms, so the regression distinguishes the two paths at the five-second limit. For the reported 5,196 ms hosted run, the omitted sample must account for more than 196 ms under otherwise identical conditions. The 2,826 ms aggregate across seven samples does not establish the omitted sample’s duration. [url-machine-store.test.ts](/home/orca/.tmp/f3-shared-terminal-sample.kwMvJ0vo/w/packages/polaris-dossier/src/url-machine-store.test.ts:530)

Source review only. No edits, tests, or native replay.
