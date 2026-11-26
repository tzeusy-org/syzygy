# Independent host pidfd R1 source review

Verdict: PASS

[Inferred] No blocking finding in the reviewed two-file candidate. This verdict admits the candidate to its owning verification step; it is not a runtime, performance, or merge result.

## Frozen subject

[Observed] Reviewed packet: `/home/orca/.tmp/f3-native-admission-fixes/policy-git-host-pidfd-70fc55-R1/`.

- Base commit: `70fc55ebc708937ff1900070c32e63670cd3860f`.
- Base tree: `090dad5e8c56b21eda2627412ebeaf225712c078`.
- Manifest SHA256: `b0cbff8012506f644c60e731fe2ba389b9ff0f4ed77277bb31babb886f34ec80`.
- Patch SHA256: `f374e0a1485f68e3e5120b36800477686b447d3b1b70db889fed084870ec6fa0`.
- README SHA256: `dc0211f29b3c51445ad52c75a99f76478f0205444c3d9cfd02c2340acc081986`.
- Candidate `packages/polaris-dossier/src/policy-git.c`: 17950 bytes, SHA256 `47ca11e2648d14e9114edd2e6932e783057261a7a4c8c847d1a981895152ff19`.
- Candidate `packages/polaris-dossier/src/policy-git-native.test.ts`: 37187 bytes, SHA256 `ce9950cdd82f78a8c0ea115086e5b7777e1007f152541a32c69e852b0330f6d5`.

[Observed] Independently recomputed hashes and sizes with Python hashlib. Each of the eight manifest original-source bindings matched its base-commit blob and the corresponding file in `/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w`. The four manifest artifact hash/size checks matched. The packet contains two candidate source files. Primary HEAD and cleanliness were supplied context, not independently re-established by this review.

## Review assessment

[Inferred] Acquisition and ownership satisfy the declared scope. Candidate C lines 159-169 acquire the pidfd only after successful spawn, before the pump's first wait4 at line 174. The same locally owned child remains the wait4 subject. This depends on the existing exclusive-reaper discipline; the patch introduces no second reaper. The pidfd is only a poll input, not a wait or signal authority.

[Inferred] Descriptor lifetime is explicit. `exitfd` begins at -1. A positive child reap closes it through the existing idempotent `shut` helper (line 175); the final cleanup closes it if still held (line 198). `shut` sets the slot to -1 after one close attempt, so the final call does not close a recycled descriptor after the reap path. Pre-spawn exits own no pidfd. Other exits reach final cleanup. The design relies on Linux pidfd_open's atomic close-on-exec semantics; no later fcntl window is introduced. The descriptor is obtained after spawning this supervisor, so that supervisor cannot inherit its own host pidfd.

[Inferred] Unsupported and failure paths refuse the call. Missing `SYS_pidfd_open` leaves -1; syscall errors set `job->failed` (line 169). The existing control/request shutdown (line 181), response/receipt drain, and wait4 join remain. Because acquisition precedes request transmission, this refusal does not dispatch Git. The supervisor's existing input-transfer cancellation/EOF path and final exit supply the remaining lifetime join. Receipt validation begins with `!job->failed`, so a seemingly complete receipt cannot restore success or known CPU usage. The unchanged TypeScript scope poisons incomplete usage and blocks reuse.

[Inferred] The event wakeup preserves scheduling and accounting boundaries. Poll keeps its 2 ms timeout and adds only the fourth input (lines 182-184). POLLIN returns the loop to wait4; positive wait4 remains the complete helper-tree CPU authority. Closing the fd at reap prevents its permanently readable exit state from spinning the remaining pipe drain. POLLERR/POLLNVAL mark failure. Admission/deadline, per-turn output bound, cap, control cancellation, receipt/image checks, and async/synchronous settlement logic remain in their existing code paths.

[Inferred] The test wrapper ABI is correct for the already pinned Linux x64 platform. Its `long __wrap_syscall(long number, ...)` matches syscall's declared signature, and `va_arg(..., int)` reads the actual `pid_t` child argument supplied by this call. It does not need to consume the unused flags argument. The wrapper refuses other syscall numbers rather than pretending to forward unknown variadic arguments. In this addon translation unit the introduced pidfd call is the direct syscall operation being intercepted; separately built supervisor syscalls are outside this link wrapper.

[Inferred] The new test is meaningful rather than a refusal-only control. Separate Node processes avoid the addon's same-digest loading restriction. The normal-addon process must first succeed in both sync and async modes, with output and positive CPU accounting, before the ENOSYS process is accepted as a refusal. The ENOSYS arm checks poisoned scope, unavailable CPU, blocked reuse, failed close, exactly two acquired supervisor PID witnesses, and their absence after subprocess settlement. The original transport case's pidfd census is taken after completed successful jobs in both modes and would detect retained descriptors if both new close sites were removed.

[Observed] A scripted ordered comparison preserved all 100 predecessor expectation-containing lines. Independent test-declaration counting found 17 predecessor cases and 18 candidate cases. Manual patch/source inspection confirms the delta adds one case and extends one existing case.

[Inferred] The production delta adds an event notification for the first-party owned supervisor. It does not change secret classification, executable-image authentication, observed-code execution, or the supervisor sandbox boundary. SEC-3 and SEC-5 therefore present no new weakening in this scoped delta.

## Limits and owning follow-up

[Unknown] Compilation, typecheck, 18-case integration execution, the proposed mutation predicates, and actual elapsed-wait improvement remain unverified. No import, build, compile, test, native execution, or product command was run in this review. Only source/document reads, git blob reads, hashing/counting, and creation of this raw review were performed. Candidate and primary source files were not edited.

[Inferred] Keep the packet's proposed mutations and focused timing diagnostic as owning verification. In particular, the successful transport census and ENOSYS case are source-reviewed test designs until exercised, and this PASS supplies no performance guarantee from the earlier 22-job measurement.
