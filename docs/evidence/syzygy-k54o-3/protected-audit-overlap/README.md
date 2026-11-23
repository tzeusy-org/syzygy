# Protected audit prefix verification

[Observed] The reviewed source at `055f8a2a5` matches the adopted audit source
and test at `137b56321`. The focused audit file passed 111 tests. The independent
review records `PASS`. [Raw review](../../../reviews/F3-AUDIT-OVERLAP-REVIEW-RAW.md)

[Observed] The same synthetic fixture applied 0, 35 and 750 ms waits after
each descriptor read. Each revision ran 12, five and one sample respectively.
Median total append times were 29.6, 334.4 and 4,999.8 ms on `72939b098`, and
27.9, 110.9 and 1,558.5 ms on `055f8a2a5`. At 750 ms, the predecessor
refused after seven reads and added no durable record. The successor finished
eight reads and added one durable record under the same 5,000 ms operation
limit. [Samples and source digests](outcome.json) · [Fixture source](probe.ts.txt)

[Unknown] Whether this overlap resolves a hosted recovery refusal. The
injected waits measure the protected audit path in isolation.
