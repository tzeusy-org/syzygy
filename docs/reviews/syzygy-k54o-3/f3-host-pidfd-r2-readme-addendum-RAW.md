# Host supervisor pidfd R2 documentation source review addendum
Reviewed source manifest SHA-256: 7d7eb98388f77dad8facbb865dff72740509205d82da7cb505fc8d5df3a1f1a9
Documentation SHA-256: d272f2ada01b5f35135f6f7b8a81b37f637f1a4f0a2875cb93a3af7e1ab09022
Verdict: REVISE

[Observed] Reviewed /home/orca/.tmp/f3-native-admission-fixes/host-pidfd-readme-paragraph.md as the proposed insertion after the first runtime-build paragraph of packages/polaris-dossier/README.md. The source binding is the exact R2 candidate reviewed in /home/orca/.tmp/f3-host-pidfd-r2-review-RAW.md. I recomputed the companion, manifest, and candidate policy-git.c SHA-256 values. The C source remains 47ca11e2648d14e9114edd2e6932e783057261a7a4c8c847d1a981895152ff19.

[Inferred] One wording correction is needed. The companion's lines 4-5 say the operation “drains and reaps its owned supervisor” without qualification. The intended insertion context contains no wait limitation. The reviewed policy-git.c:193-195 explicitly preserves that closing control requests the supervisor's TERM/KILL/reap path, wait4 joins its epilogue, and “An uninterruptible kernel task can delay this join, as with execFile.” The paragraph currently reads as an unconditional cleanup-completion guarantee.

Requested correction: describe entry into the existing supervisor drain/reap path and explicitly retain that an uninterruptible kernel task can delay the join. For example, replace “drains and reaps its owned supervisor” with “requests its owned supervisor's drain/reap path and waits for it”, then add “An uninterruptible kernel task can delay this join.” This is a requested wording correction only; I authored no product or companion-file edit.

[Inferred] The remaining claims match the reviewed source: pidfd_open support is required at runtime; the descriptor adds poll readiness for the owned supervisor; wait4 remains exit-status and usage authority; acquisition failure remains fail-closed and leaves the scope's CPU usage unavailable; a successfully acquired descriptor is closed after positive wait4 or in common cleanup. The CPU statement describes unavailable evidence rather than zero CPU consumption. No capability, cap, timeout, or runtime-success claim is introduced by those statements.

[Observed] This was a source-only documentation review. I executed no compiler, typecheck, test, mutation control, or product command, and made no primary-checkout edit. Concurrent owning/mutation execution results were not consulted or asserted. [Unknown] Runtime results remain outside this addendum's scope.
