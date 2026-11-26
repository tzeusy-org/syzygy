# Host supervisor pidfd R2 corrected documentation source review
Reviewed source manifest SHA-256: 7d7eb98388f77dad8facbb865dff72740509205d82da7cb505fc8d5df3a1f1a9
Documentation SHA-256: 4e22f2219819af5e237da58889c8b9da8047ac97b0bedda2373d483a88abc60f
Verdict: PASS

[Observed] This bounded rereview covers only /home/orca/.tmp/f3-native-admission-fixes/host-pidfd-readme-paragraph-R2.md against the exact previously reviewed source manifest above. I read the corrected paragraph, recomputed its and the source manifest's SHA-256 values, and inspected the complete paragraph diff. The prior REVISE remains verbatim at /home/orca/.tmp/f3-host-pidfd-r2-readme-addendum-RAW.md.

[Inferred] The requested correction is satisfied. The paragraph now says acquisition failure requests the owned supervisor's drain and reap path and waits for it, while explicitly stating that an uninterruptible kernel task can delay the join. That preserves the limitation in candidate policy-git.c:193-195 rather than promising unconditional cleanup completion. CPU usage stays unavailable under the existing fail-closed accounting. The unchanged pidfd readiness, wait4 authority, runtime requirement, and descriptor cleanup descriptions remain consistent with the source review. No further wording correction is requested within this paragraph's scope.

[Observed] This was a source-only documentation review: no product execution, compiler, typecheck, test, mutation check, primary-checkout edit, or companion-file edit occurred. [Unknown] Runtime results remain outside this review. PASS applies only to the exact documentation bytes identified above and makes no execution, performance, cap, timeout, or broad completion claim.
