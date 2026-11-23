PASS — `055f8a2a55fd7e51a10faec96a7ef3a6fd040222`

[Observed] The audit integration suite passed 111 of 111 tests. `git diff --check` passed against `72939b098`.

[Inferred] The four read-only role scans overlap and stay tracked until their started operations settle. Writes remain serialized, both fsyncs precede acknowledgment, and final synchronous metadata checks catch sibling drift introduced during either append scan or by the final authority callback. Ordered appends retain the attempt deadline. Close withholds history through descriptor release and the final awaited pathname and parent-stamp checks under its original deadline.

[Inferred] Close samples each file’s metadata individually. An in-place write after that file’s final sample can escape the sweep. This limitation also existed at the base, and `hostileSameUidIsolation` remains `Unknown`.
