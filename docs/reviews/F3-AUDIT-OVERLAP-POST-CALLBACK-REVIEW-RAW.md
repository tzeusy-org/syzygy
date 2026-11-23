REVISE

Reviewed `1960f20f6d72bab5b9096dcfb95343a4b5b054aa` against `72939b0985db767c920153b272faf3b5ba5eacfd`. The focused suite passed 107 tests. Two additional synthetic probes reproduced publication after filesystem drift.

- [Observed] The final authority callback runs after pathname verification and before durable admission. Changing the Design segment during that callback still let an Author append resolve with `durableRecords: 5` and `poisoned: false`. [url-session-audit.ts](/home/orca/.tmp/f3-audit-check-729.E9ltPLz2/w/packages/polaris-dossier/src/url-session-audit.ts:493)
- [Observed] The post-release pathname sweep can publish stale history. Replacing the already-checked Author pathname during the later Design `lstat` let close return an unpoisoned `durable-prefix` and made `closedHistory()` available. The parent retained the same identity throughout. [url-session-audit.ts](/home/orca/.tmp/f3-audit-check-729.E9ltPLz2/w/packages/polaris-dossier/src/url-session-audit.ts:540)

[Observed] The focused tests verified overlapping descriptor scans, tracking of pending siblings after poisoning, and withholding history during the final check. The two probes used synthetic files and ordinary filesystem changes. [Probe](/home/orca/.tmp/f3-independent-probes.3PpcspFr/probe.ts)
