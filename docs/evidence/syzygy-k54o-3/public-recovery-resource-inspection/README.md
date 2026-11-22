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

[Unknown] This trace establishes where the sample ran out of time. It
leaves the source of the overlapping delay unresolved. The reported
event-loop maximum spans earlier launch phases and cannot attribute
the failed window. The fixture used an owned source and simulated
provider responses.

[Observed] The binding records the base commit, the byte digests of the
source before and after the overlay, the test totals and the selected
trace records. The raw trace contains lifecycle tags and measurements.
[Binding](binding.json) · [Overlay](diagnostic.patch) · [Trace](trace.jsonl)
