# Native Stop/Resume at 8b25a6f9b

[Observed] Hosted integration passed 3,892 tests, failed three, and skipped
three across 137 files. Normal native completion and stopping after delivery
passed. The cadence fixture expected four storage reads and saw none.
[Hosted integration](https://github.com/tzeusy-org/syzygy/actions/runs/45103942638/job/137461605619)

[Observed] The public Stop/Resume case ended after an operator stop request
with `recovery history unavailable`. All four role summaries reported stopped.
The test reached neither delivery nor the public Resume command. A prior head
reached Resume and refused at the first fresh Design relay check.
[Unknown] Which stop checkpoint predicate first refused at this head.

[Observed] The eligible case recorded the ordered eligibility event and its
Design verdict. The initial supervisor ended with `checked design render
continuation unavailable`, and the runtime reported `transport-unavailable`.
The test never reached its intended operator stop or cold restart.
[Unknown] Which continuation check failed first and whether transport refusal
caused it.

[Observed] The machine-readable record binds the hosted checkout, its tree,
the raw integration log digest, and the pertinent source bytes.
[Run evidence](outcome.json)
