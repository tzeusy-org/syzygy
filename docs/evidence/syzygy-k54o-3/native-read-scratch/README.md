# Native-image read scratch

[Observed] Source commit `fd6caec7d78fe0de748f85ec05757677de2e88cf` borrows one module-private 1 MiB scratch buffer for complete image rereads. The buffer leaves the idle slot while active, so nested checks use separate storage. At most one idle buffer survives for the module lifetime. Fresh byte, digest, identity, safety, EOF and descriptor checks remain; authority results are not cached.

[Observed] Fresh source review PASS binds the exact two-file change. The owning integration file passes 17/17 and shared typecheck passes. Removing the borrow exclusion makes the existing nested-call case fail at the intended outer-image digest check: one failed, sixteen selection skips. The operator restores the reviewed candidate, verifies the source/status snapshot, reaps owned children and removes private scratch. Tests: +0, modified 1, removed 0.

[Observed] A separate compiled-module diagnostic at predecessor 0028 completed 96 warm pairs against genuine frozen 0e14 programs and target. Mean wall time was 5.2–13.4% lower across its measured groups. This is a scoped diagnostic. Cold and full-recovery benefits remain Unknown.

[Observed] Ordinary 0028 recovery failed at its unchanged 600000 ms test limit after four Design forwards. A separate profiled run failed earlier when a two-second storage census expired; the launcher then stopped Design. The numeric profile retains eight profiles, 2,891,954 samples and the signed negative delta, with two independent computations. Sampling weights include idle and blocking time and are not process CPU measurements. No common cause for those two failures is established.

[Unknown] The build and genuine recovery for this source, final render renewal, full-suite and hosted acceptance are not established by this packet.

[Observed] `payload.tar.gz` is an inert archive of 63 regular members, SHA-256 `db0f58c55b0a9ff767fff3107a8adceb732d0bec71f83a5e8f3c8da6800d2686`. `index.json` binds each member and original location; `manifest.json` records complete verification and limitations. Five full source snapshots and eight raw CPU profiles remain outside this repository at the indexed paths. The archive includes their numeric reduction and exact indexes; continued access to the external originals is not guaranteed. Preparation labels and the first review's corrected count wording remain verbatim as history. The adoption is A-258 in the agent log.
