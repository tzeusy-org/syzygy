# Public recovery resource inspection

[Observed] The unmodified be75f5a91 run reached a fresh design launch after
the public recovery entry accepted the checked stop, consumed its claim
and refused policy and claim withdrawal controls. The fresh audit
committed launch history and recorded an inspection failure before any
design delivery. See the [baseline binding](../public-recovery-be75-inspection/binding.json).

[Observed] The diagnostic overlay on that commit reproduced the same
audit boundary. The first two samples completed in 859.5 ms and 774.2 ms.
The third sample's original 1,000 ms timer fired at 1,035.3 ms. Both
resource walks were pending at expiry and the sample's currentness check
had yet to start. The stop was recorded as `inspection-failed` and the
child exited on SIGTERM. No fresh design delivery or ordered send occurred.

[Observed] The first trace locates expiry within the sample. Its
event-loop maximum spans earlier launch phases. A second phase trace
measured the overlap directly. During bootstrap render's open-run phase,
the third sample's timer fired at 1,091.5 ms. Both walks were pending and
the sample's currentness callback had yet to start. Within this window,
23 successful synchronous committed-policy checks occupied 965.2 ms.
Their 69 synchronous Git calls accounted for 935.3 ms. The two earlier
samples completed in 984.7 ms and 820.0 ms during launch-history commit
and registration.

[Unknown] The trace records policy-check intervals without call stacks.
The exact allocation among protected product reads, host and machine
callbacks remains unresolved. Both runs used an owned source and
simulated provider responses.
[Phase binding](phase-binding.json) · [Phase overlay](phase-diagnostic.patch) · [Phase trace](phase-trace.jsonl)

[Observed] The binding records the base commit, the byte digests of the
source before and after the overlay, the test totals and the selected
trace records. The raw trace contains lifecycle tags and measurements.
[Binding](binding.json) · [Overlay](diagnostic.patch) · [Trace](trace.jsonl)
