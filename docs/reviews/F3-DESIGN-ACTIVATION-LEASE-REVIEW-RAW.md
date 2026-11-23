PASS

[Observed] The revised patch rechecks the original render lease before socket submission and process spawn on every ordered attempt. Activation remains bounded by the earlier of the original run deadline and the product lease expiry. Existing full currentness checks and delivery ordering remain in place.

[Observed] The composed test forwards the guard and compares the deadline actually passed to the host with the independently read product expiry. The patch digest matched. Native tests were outside this read-only review.
