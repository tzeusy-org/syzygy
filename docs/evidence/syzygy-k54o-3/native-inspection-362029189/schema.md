# Exact 362 resource, ordered bootstrap and protected store trace

The source binding fixes exact candidate and overlay file hashes. The offline projector uses only the adjacent source binding, raw patch and raw trace. Trace inputs are validated against closed field and value domains before grouping. The diagnostic excludes socket and file paths, raw errors, Git output and provider content.

Resource samples use positive launch ordinals. They report elapsed time, phase, first refusal and completed storage, process and currentness timings. The fresh design trace includes ordered registration and delivery phases, nested product currentness phases, and the first terminal outcome.

Ordered bootstrap stamps distinguish delivery release, plan construction, audit writer entry and exact epoch, controller creation, final currentness, and host activation. Separate activation rows record relay connection, accepted transport, first mediated audit and effect, host activation cutoff, product lease state, and closed currentness refusal. They contain no request or reply data.

Store and connection rows carry global launch ordinal 0 and opaque numeric lock or connection ordinals. The projector correlates overlapping stages using one monotonic clock. Overlap may include concurrent work from another role; a connection row's role and peer kind are recorded at the run-machine boundary.

- The transport records separate capture and authorization timer arming, completion and dispatch. The actual deadline, time of arming and scheduled delay are recorded. A late capture caught by the synchronous deadline check has its own label. The transition to authorization uses the remaining original ingress deadline.
- Parent selection and recovery revalidation have entry and return rows. Peer parent-currentness checks record elapsed time and their deadline if a timer was armed. These rows share the exact raw connection ordinal.
- The run-machine records native capture, issuance queue acquisition and lifecycle publication entry and return. The private store records lock acquisition, state reads, publication entry, each completed rename, timer or lease refusal, result and cleanup release path. Counts distinguish full synchronous checks, asynchronous I/O checks and local lease check attempts.
- The projector reports synchronous policy elapsed time and Git subprocess durations separately from asynchronous policy waiting. Async durations are reported only for completed trace events. Union time excludes double counting among concurrent tasks. Neither async duration nor timestamp overlap on its own shows event-loop blocking.

All times are milliseconds. The overlay leaves the original timing bounds and outcome predicates in place. Trace writes add instrumentation overhead to the replay.
