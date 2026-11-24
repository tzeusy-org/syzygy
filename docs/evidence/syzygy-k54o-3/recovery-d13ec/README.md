# Eligible Stop/Resume at d13ec5475

[Observed] The exact subject is `d13ec5475ba5625800d075cc760609f629987e33`, tree `03a4bb24a3969543f55005d8b94e77f887f2ff69`. The selected native eligible Stop/Resume case retained its original stopped cut with 412 durable audit records. The Design audit reaches ordered `eligible` at 2026-11-24T18:40:59.697Z and then records an exited Design terminal. The supervisor records Stop at 18:41:17.177Z. [binding.json](binding.json) binds the subject and retained bytes; the raw attempt remains in its original scratch directory.

[Observed] The initial control publication accepted both currentness callbacks and its audit callback. The selected case later timed out at the test runner's 600,000 ms limit, reporting 606,859 ms for the case. The suite reported one failed and six skipped tests out of seven, over 616.75 seconds. The raw log is retained as deterministic gzip, with compressed and uncompressed digests in the binding.

[Unknown] The runtime refusal leaf, terminal recovery phase and completed recovery. The retained attempt has no terminal failure JSON; the inspected run's `record.json` does not exist. Runner expiry alone establishes no authority refusal, withdrawal or product lease expiry. The last pending snapshot was captured before Stop and does not locate the terminal recovery phase.

[Observed] The original run deadline is 2026-11-24T20:34:44.092Z. The startup activation deadline of 18:39:21.297Z bounds initial host activation; subsequent operations use freshly reproduced, checked product replacements under their own leases and the original run deadline. The pending snapshot reports an open product lease with 22,984 ms remaining. See the retained [timeline](native-d13ec-initial-design-timeline.json) and [diagnosis](diagnosis.json). Those timestamps do not identify a later lease expiry.

[Observed] The Design exchange spans 166.335 seconds from its first relay admission to its last admitted response. Its three largest chronological gaps are 22.213, 19.388 and 13.852 seconds between an ordered receipt and the next machine effect. [Unknown] Their underlying cost; no CPU attribution is established. The timeline is bound to the retained compressed Design audit.

This is a failed diagnostic attempt. It neither completes recovery acceptance nor waives the required CI timing evidence. No runtime or product bound changed during this run.
