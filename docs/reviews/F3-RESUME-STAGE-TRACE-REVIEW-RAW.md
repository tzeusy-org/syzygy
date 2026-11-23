PASS `acac67381f71a548a73c4b2d4ead64c267823299` — source review against `faa64c2ea9e975fc8fbb1637cd095529e9d14f10`.

[Observed] The machine wrapper awaits the original native promise directly. Synchronous `finally` cleanup restores the store spy on fulfillment or rejection. The spy is installed inside live machine creation, after cold verification and claim, so the earlier history reader cannot consume it.

[Observed] Both public resume cases check the six stages in native entry order and retain their withdrawal and terminal assertions. The observer distinguishes null refusals from rejections, and pending calls carry only their start time. The eligible case’s bounded watchdog and both cases’ retained evidence include the trace. `git diff --check` passed. Native execution was outside this review’s scope.
