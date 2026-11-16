# R-RT-U2A2 implementation exact-head review — RAW
Subject: implementation diff 03d78cd9..28554d4b (packages, apps)
Reviewed commit: 28554d4b
Verdict: REVISE

Scope: [Observed] I read the diff `git diff 03d78cd9 28554d4b -- packages apps` (22 files), the frozen interface (§1–§8), the disposition (notes 1–4), and adopted CAP1-REQ-011 and CAP1-REQ-046 v1.0. I ran no tests, as the brief asked.

## Findings

1. **Blocking. An act that supersedes itself is not refused. `packages/cap1-core/src/consent-decision.ts:421-423`.**
   - Frozen §3 check 22 reads "no captured act with `act_type: revoke` names this act in `supersedes`" → `act-revoked`. Check 23 reads "no captured act with `act_type: consent` names this act in `supersedes`" → `act-superseded`. The adopted REQ-011 text says a "superseded, revoked … act state SHALL refuse the dependent observation".
   - [Observed] The defeater filter is `relation.reference !== input.reference && relation.supersedes === act.actId`. That leaves out the act under evaluation, even though it is itself a captured act in the population check 22/23 describes.
   - [Inferred] Check 10 already refuses two references that carry the same `act` id. So the exclusion changes only one outcome: an in-force artifact whose own act is `act_type: consent` with `supersedes: <its own act id>`. That act is admitted, where the frozen table refuses it `act-superseded`. This is a self-contradictory act admitted rather than refused, which breaks the fail-closed polarity in AGENTS.md.
   - Repair: drop the `relation.reference !== input.reference` conjunct. A revoke act that supersedes another act still evaluates correctly, because its own `supersedes` names the other act, not itself. Add a REQ-011 conformance case "self-supersession → act-superseded, 0 src root reads".

2. **Non-blocking. The currency bound is not validated. `consent-decision.ts:415-420`; `req-011.conformance.test.ts:513`.**
   - Frozen §5: `maxAgeSeconds: number; // positive integer`.
   - [Observed] Nothing validates the bound. The stale-act test injects `maxAgeSeconds: 0`, which is outside the frozen grammar.
   - [Inferred] Today a NaN or Infinity bound makes `canonicalJson` throw at the manifest step, so it fails by exception rather than by a named value. A negative bound refuses everything. The daemon wires no bound.
   - Repair: refuse a bound that is not a positive integer before any read, as a named `CaptureFailure` or a TypeError. Change the test to use `maxAgeSeconds: 1` with an instant 1001 ms old.

3. **Non-blocking. The provider's audit identity is not checked against its declared type. `packages/cap1-daemon/src/source-snapshot.ts:251-262`.**
   - Frozen §4: `auditRecordDigest: Sha256Digest`.
   - [Observed] `correlationShape` accepts any string as `auditRecordId` and `auditRecordDigest`. On a state-(1) upgrade (`a1AuditRecord === null`, `consent-decision.ts:466`) those strings are served unvalidated as the A1 identity in both channels.
   - Repair: map an empty id, or a digest failing `isSha256Digest`, to `unavailable`.

4. **Non-blocking. The provider can be called for an act that fails check 2. `source-snapshot.ts:379-387`.**
   - Frozen §4: "called at most once per act per capture, only for acts that passed checks 1–23".
   - [Observed] The pre-correlation pass skips check 2 (`record-subject-mismatch`), so an entry reference that fails check 2 can still reach the provider. No result is ever honored, and the daemon has no provider.
   - Repair: skip the call when the reference is some entry's `consent` and the record pair differs from that entry's pair.

5. **Non-blocking. The binding-digest field set has no independent oracle. `req-011.conformance.test.ts:588`; `req-046.conformance.test.ts:276`.**
   - AGENTS.md: "Conformance expected values are hard-coded literals, never imported from the module under test". The disposition's note 1 fixes the digest form: it omits `a1AuditRecord` and `actRecordDigest`.
   - [Observed] Every positive correlation fixture echoes back the `bindingDigest` that the module computed. No test recomputes it over the binding without those two keys. [Inferred] A wrong field set, or even a constant digest, would pass every positive case.
   - Repair: in one case, have the provider recompute `sha256` over an independently encoded binding literal and return its own digest.

6. **Non-blocking. The entry is read from the observed root, not the admitted root's mapping. `source-snapshot.ts:461-476`.**
   - [Observed] The entry is read from `observedRootDir` whenever the governance-root decision is admitted. That holds even when the root is `not-read`/`no-root`, or `repositoryRoots` maps the governance root elsewhere.
   - [Inferred] Consent is still honored, so this is not a consent bypass.
   - Repair: read the entry only when the governance-root input is `captured`, and from its mapped root.

7. **Non-blocking. A consent refusal on `/entry` is labelled "unreadable". `packages/cap1-daemon/src/routes-human.ts:711`.**
   - [Observed] A `not-read` entry (consent refused) renders `data-entry-state="unreadable"`. The visible reason, `unconsented-source-or-provider`, is correct.
   - [Inferred] "Not read by consent" and "read failed" share one state attribute.
   - Repair: give it a distinct `not-read` state.

8. **Non-blocking. The exposed manifest is unsorted. `source-snapshot.ts:514`.**
   - Frozen §6: "Rows sort by `(kind, subjectId)`."
   - [Observed] `CapturedProjectInputs.manifest.inputs` keeps discovery order. Only the hashed bytes are sorted, so the test at `source-snapshot.test.ts:129-134` has to sort before it can recompute the digest.
   - Repair: store `sortSnapshotInputs(descriptors)` in the manifest.

9. **Non-blocking. The interface names differ from §5.**
   - [Observed] §5 names `evaluateConsentAct`. The code exports `evaluateConsentActBeforeCorrelation` and `relationsOf` instead (`consent-decision.ts:369,510`).
   - Repair: rename it, or record the difference in the disposition.

10. **Informational. Rule 4's blast radius now reaches existing fixtures.**
    - [Observed] Rule 4 is disclosed in §5 as an owner question. Its effect shows in the diff: `pipeline.test.ts` and `routes-machine.test.ts` changed an unresolvable reference into a legacy record with no act, specifically to avoid refusing every pair.
    - No repair is needed. The owner question stays open.

## Acceptance criteria

1. **Met.** [Observed] The snapshot is `snapshotDigest(manifest)` over canonical sorted bytes (`snapshot.ts:151-164`). `asOf` is left out (`source-snapshot.ts:499-519`). `main.ts` supplies no snapshot label, and a test checks that a forged label is ignored.
2. **Met.** [Observed] The manifest records the declaration, every artifact and act (including form-refused references, as `not-read`), each correlation result, each root (`captured`, `not-read`/`consent-not-admitted` or `no-root`) and the entry, plus versions and configuration. No host path enters it: logical paths are validated, and the test asserts the root path is absent.
3. **Not met.** [Observed] The decision is closed and runs before any root listing or entry read (`source-snapshot.ts:414` before `:444` and `:469`), and refused pairs get zero reads (the REQ-011 matrix). But finding 1 lets one invalid act state, self-supersession, admit.
4. **Met.** [Observed] Both channels project one `consentDecisionTuple` (machine `routes-machine.ts:197-200`, human `routes-human.ts` `renderConsentDecisions`). The diagnostic, reason, route and untrusted view agree, and the tests compare both.
5. **Met.** [Observed] `evaluateCapturedProject` is pure. The request-time entry reader is removed from `main.ts` and the routes. The post-capture tamper test confirms `/entry` and the evaluation are unchanged, and the capture is deep-frozen.
6. **Met.** [Observed] Every byte read and listing is re-read once. Any difference returns `source-changed-during-capture` with the changed descriptors and no retry, and `evaluateProject` serves `capture-failed`. [Inferred] A change that reverts before revalidation (A→B→A) cannot be detected; that limit is inherent to the approach.
7. **Met.** [Observed] The same inputs give the same digest, and a different `asOf` keeps the digest. Each of eight mutation classes changes it.
8. **Met.** [Observed] The daemon wires no provider, no bound, no credentials, no retention store and no egress, and it does not execute observed code. The provider seam is optional, as frozen §4 allows.
