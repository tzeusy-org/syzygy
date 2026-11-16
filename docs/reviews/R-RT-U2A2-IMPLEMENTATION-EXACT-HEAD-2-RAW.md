# R-RT-U2A2 implementation exact-head review 2 — RAW
Subject: implementation diff 03d78cd9..82ead455 (packages, apps)
Reviewed commit: 82ead455
Verdict: CONFIRM WITH EXCEPTIONS

Scope: [Observed] I read `git diff 03d78cd9 82ead455 -- packages apps` and the repair diff `git diff 28554d4b 82ead455`. The repair diff covers two commits: `e700ba8c` (the code) and `82ead455` (the evidence JSON only). I also read the prior raw, its disposition, frozen §3–§5, adopted CAP1-REQ-011 and CAP1-REQ-046 v1.0, and the daemon composition in `apps/syzygy/src/main.ts`. I ran no tests or npm. I recomputed the four `subjectDigests` in `review-repair-mutations-2026-11-02.json` with `sha256sum` from `git show` at `e700ba8c` and at `82ead455`. All four match at both commits.

## Prior blocking finding

**P1. Repaired. Self-supersession now refuses with `act-superseded`.**
- Location: `packages/cap1-core/src/consent-decision.ts:421-424`.
- Clause, frozen §3 check 23: "no captured act with `act_type: consent` names this act in `supersedes`" → `act-superseded`.
- [Observed] The defeater filter is now `context.relations.filter((relation) => relation.supersedes === act.actId)`. The act under evaluation is back in the population.
- [Observed] Matrix case `self-supersession` was added to `req-011.conformance.test.ts:460` with the literal expectation `act-superseded`. The denominator went from 23 to 24 (`:496-498`).
- [Observed] Mutant `self-supersession-excluded` restores the old conjunct verbatim and is recorded as killed (1 failed).
- [Inferred] The case reaches check 23 rather than failing earlier at check 9 or 10, because otherwise the mutant would not change the outcome.
- [Inferred] The repair does not over-refuse. A legitimate successor names its predecessor's id, not its own, so a valid act is defeated only by an act that actually names it.

## Findings

1. **Non-blocking exception (prior 4, deferred). The provider can still be called for an act whose pair fails check 2.**
   - Location: `packages/cap1-daemon/src/source-snapshot.ts:383-395`.
   - Clause, frozen §4: "It is called at most once per act per capture, only for acts that passed checks 1–23".
   - [Observed] The pre-correlation pass builds the context with `repositoryId: input.artifact.record.repositoryId`, the artifact's own repository. It never compares that against the entry that names the reference. Check 2 is applied only later, in `decideRepositoryConsent` (`consent-decision.ts:579-581`).
   - Why this is a deviation: [Inferred] read literally, this departs from frozen §4. It breaks a constraint on the seam, not adopted text.
   - Why it is not blocking, part 1: [Observed] refusal happens before `fullEvaluation`, so the result can never admit, and nothing fails open.
   - Why it is not blocking, part 2: [Observed] `main.ts:221-223` passes only `asOf` and `versions`. No provider is wired, so the deviation cannot be reached in the shipped composition.
   - Cost today: [Inferred] the extra call puts one `consent-correlation` descriptor into the manifest. The digest stays deterministic.
   - Acceptable as a deferral, on one condition: it must be closed before any provider is authorized or wired. Track it as a bead, not only as disposition prose.
   - Repair: skip the call when the reference is some entry's `consent` and the artifact pair differs from that entry's pair. Add a counting-provider case that expects 0 calls.

2. **Non-blocking (prior 6, deferred). The entry is read from `observedRootDir`, not from the governance root's mapped or captured root.**
   - Location: `source-snapshot.ts:470-485`.
   - [Observed] The read is gated on `decision.authorization === 'admitted'`, so consent still comes before the read. That meets frozen §5 and REQ-011's "before reading the dependent repository content".
   - [Observed] The mismatch is only reachable through an injected `repositoryRoots`. The daemon injects none (grep: no non-test caller). The default map sends the governance root to `observedRootDir`.
   - Acceptable as a deferral.

3. **Non-blocking (prior 7, deferred). A consent-refused entry is labelled "unreadable" in the visible prose as well as in the state attribute.**
   - Location: `packages/cap1-daemon/src/routes-human.ts:711-712`, rendered at `:753`.
   - Clause, REQ-046: "The primary Unknown reason remains unconsented-source-or-provider".
   - [Observed] The `not-read` state maps to `{state:'unreadable', reason:'unconsented-source-or-provider'}`. The page therefore reads "The entry document is unreadable: Unknown — reason: unconsented-source-or-provider."
   - The prior raw and the disposition describe this as attribute-only. That understates it.
   - Why it is not blocking: the reason and the Unknown are correct, and no adopted clause is broken.
   - Acceptable as a deferral, but `syzygy-u2a.6` should change the sentence, not only the attribute.

4. **Informational (prior 2, repaired; different failure form than suggested). A bad currency bound now throws a `TypeError` rather than returning a named `CaptureFailure`.**
   - Location: `source-snapshot.ts:295-301`.
   - Clause, frozen §5: "positive integer".
   - [Observed] The check runs before any read. Five values are tested with 0 reads, and mutant `bound-unvalidated` is killed.
   - [Inferred] It fails closed because nothing is served. The daemon wires no bound.
   - The prior raw allowed "a named `CaptureFailure` or a TypeError".

5. **Informational (prior 3, repaired). Two of the three new shape guards have no recorded mutant.**
   - Location: `source-snapshot.ts:253-259`.
   - [Observed] Only `audit-digest-unchecked` is recorded.
   - [Inferred] Removing the `auditRecordId.length > 0` guard would still fail the state-2 case at `req-011:583-604`: `''` ≠ `A1.id` gives `correlation-mismatch`, not the expected `correlation-unavailable`.
   - [Inferred] The malformed-`bindingDigest` guard is equivalent-mutant-prone. A malformed value can never equal the recomputed digest, so removing the guard gives `mismatch`, which the test would also catch.
   - No upgrade-path (state-1) case exercises the empty id. The guard is shared, so the risk is low.

6. **Informational (prior 5, repaired). The binding-digest oracle is now independent of the module under test.**
   - Location: `req-011.conformance.test.ts:607-636`.
   - [Observed] The provider hashes a hand-encoded canonical literal that has no `a1AuditRecord` and no `actRecordDigest`. It uses the fixture `sha256Hex` (`node:crypto`), not cap1-core.
   - [Observed] Mutant `binding-digest-includes-act-record` is killed. This meets the AGENTS.md literal-oracle rule.

7. **Informational (prior 8, repaired; prior 9, recorded).**
   - [Observed] `manifest.inputs` is now `sortSnapshotInputs(descriptors)` (`:524`). The test asserts the literal sorted order, and mutant `manifest-unsorted` is killed.
   - The split of `evaluateConsentAct` is recorded in the disposition. [Observed] Behaviour is consistent: `fullEvaluation` composes the two parts.

## Acceptance criteria

1. **Met.** [Observed] `snapshotDigest(manifest)` over a manifest that is now stored sorted. `asOf` is outside the manifest (`source-snapshot.ts:509-534`). `main.ts` supplies no snapshot.
2. **Met.** [Observed] The declaration, artifacts, acts, form-refused references, correlations, roots, entry, versions, provider id and bound are all descriptors or configuration in the manifest.
3. **Met.** [Observed] One closed `decideRepositoryConsent` runs per declared pair before any root listing or entry read. Self-supersession now refuses (P1). The 24-case matrix asserts 0 dependent reads. Exception 1 is a provider call, not a content read.
4. **Met.** [Observed] Both channels project one decision tuple. The conformance cases compare the human `data-consent-diagnostic` with the machine output.
5. **Met.** [Observed] `evaluateCapturedProject` is pure over a deep-frozen capture. `main.ts` serves one evaluation, and `/entry` reads `capture.entry`.
6. **Met.** [Observed] Every read and listing is re-read once. Any difference gives `source-changed-during-capture` with no retry. [Inferred] A→B→A changes are undetectable, which is inherent to the approach.
7. **Met.** [Observed] Identical inputs give a stable digest, and a different `asOf` keeps it. The mutation classes change it. The sorted manifest no longer depends on discovery order.
8. **Met.** [Observed] No provider, bound, `repositoryRoots`, egress or code execution is wired (`main.ts:221-223`).
