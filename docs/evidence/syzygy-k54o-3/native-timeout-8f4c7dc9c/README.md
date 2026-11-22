# Public interrupted recovery test timeout at 8f4c7dc9c

[Observed] The selected owned synthetic provider stop-resume integration case ran for 360.183 seconds and hit its configured 360-second Vitest limit. The initial cut, resumed supervisor state, second rendered site, and fresh design launch file survived. The fresh design audit contains three rows in order. They are the declaration, launch attempt and launch history. Each of the three other fresh role audits contains its declaration. There is no retained fresh design delivery or terminal row, failure manifest or Execution Record.

[Observed] The fresh design launch file records a child start at 13:29:13.320 UTC. The launch history audit's final write was at 13:29:14.943 UTC, 2.831 seconds before the timeout log's final write. The latter is a filesystem timestamp for the completed log. The exact instant the watchdog fired is unavailable. The two writes establish that the test continued to make durable progress near the cutoff.

[Observed] The fresh acquisition directory was created 141.752 seconds before resumed supervisor state was saved. It preceded the first fresh role declaration by 145.054 seconds. The corresponding creation-to-declaration interval in the retained 6d7441b33 playback was 38.400 seconds. The two runs give elapsed time for their respective fixtures on the host.

[Inferred] On this exact source, acquisition creation precedes artifact construction, frozen-product restoration, the final preparation authority check and committed stage inspection. Supervisor state publication follows those operations and precedes runtime start. Restoration is the primary timing candidate within the 141.752-second interval because it rechecks frozen provenance, records and role artifacts, and rereads the retained fidelity packet. The new rendered-source polling has yet to run during that interval.

[Unknown] The retained audit ends before launch registration, runtime currentness, resource-sample drainage or design delivery can be distinguished. The first post-launch await to exceed a bound remains unobserved. The exact watchdog location, duration inside restoration, and checked fresh group and tool cleanup are unknown. This playback supplies no end-to-end recovery verdict.

[Inferred] A subsequent probe can time frozen-product restoration and stage inspection, then trace launch registration, currentness, sample drainage and delivery. Closed phase labels and monotonic durations suffice. The native inspection and store time limits can remain in force.

## Evidence identity

The projection binds the exact commit, tree, integration selector and source files, along with original log, cut, launch, state, steps and fresh role audits by SHA-256. Filesystem times and the launch capture time carry separate basis labels. The bundle retains event names, row numbers, durations, timestamps and digests. Verify its frozen bytes with `sha256sum -c sha256sums.txt`.

[Timestamp projection](projection.json)
