# P115 implementation authorization

**Evidence snapshot:** Syzygy at d621bfa267f24ff68f6f83ac7bfba44b81a32a34 on 2026-10-27; source and canonical Beads inspected, live runtime not inspected.
**Artifact boundary:** Local proposed owner decision only. No owner answer or implementation authority is recorded here.

| # | Decision ID | Priority | Decision state | Recommended direction |
|---:|---|---:|---|---|
| 1 | `P115-IMPLEMENTATION-20261027-R1` | P1 | Draft | Authorize the bounded implementation and owned-consumer migration |

### `P115-IMPLEMENTATION-20261027-R1` — Implement the signed serve-once contract

**Decision state:** Draft
**Adversarial review:** Pending

#### Decision needed

Authorize the exact `p115-implementation-packet-2026-10-27-r1`: one cohesive implementation bead and one atomic protected PR for the signed P115 v1.0 machine representation and its four owned readers. A also authorizes recording the proposed bounded owner direction and preparing the executable handoff. Actual dispatch still requires that direction on main and fresh ownership, dependency and overlap checks.

#### Background and freshness

- **[Observed]** P115 v1.0 is signed and merged. Its sign-off explicitly says it authorizes no implementation. The prior A signed that specification; it does not answer this distinct request.
- **[Observed]** The implementation packet refreshed 652 code files, dispositioned 59 candidates and identified four operator readers. Six signed subjects remain exact. The proposed allowlist is 26 existing and four new files, with docs/README the sole owned file changed since the original census.
- **[Inferred]** Updating producer, consumers, parity and cache identity together avoids an incompatible intermediate version. Existing P115 semantics forbid inline compatibility fallback.
- **[Unknown]** External consumers, live conformance and actual payload savings remain unverified. The separate records-only V1 provenance charter proposes a later normative successor; it grants no authority to add that richer lineage here.

#### Options

| Option | Pros | Cons |
|---|---|---|
| A. Authorize the exact packet and record the bounded direction (Recommended) | Releases the signed P115 implementation gap for a complete, gated handoff | Requires one coordinated producer/consumer PR; later provenance may require a reviewed successor |
| B. Defer implementation | Preserves the current implementation and signed specification | Leaves their known representation gap open |
| C. Revise the proposed scope | Allows a specific migration or ownership concern to be resolved first | Delays the handoff; no implementation is authorized |

#### Recommendation

Choose **A** because the signed POC-REQ-014 contract already fixes the behavior. The packet gives a bounded atomic migration, independent behavioral checks, cache and ceiling safeguards, and explicit failure/rollback behavior. The future provenance charter is not an adopted replacement and must not silently expand this change.

#### Authorization boundary

The proposed A authorizes recording the exact reviewed owner direction and implementing its named 30-path outcome through one attended lane and protected PR after canonical recording. Fixture-only tests, ordinary independent review, required CI and protected merge are included. Fresh overlap checks and shared-model WIP one still apply. Additional paths need an explained reviewed scope refresh; normative, consent or policy changes need their own owner act.

The signed specification, logical model, human rendering, 16 MiB ceiling and exclusions remain fixed. No new private repository/body reads, live probe, provider call, restart, deployment, release, external consumer modification or unattended coordination is included. No signed bytes or historical evidence may be edited. This question concerns implementation authority, not a second P115 sign-off.

#### Adversarial review record

- Reviewer: `pending`
- Scope verdict: Pending
- Recommendation verdict: Pending
- Material corrections: Pending
- Evidence freshness: d621bfa267f24ff68f6f83ac7bfba44b81a32a34; source-only preparation, no live inspection

#### Owner decision record

- Status: Pending owner response
- Actor/channel: Pending owner response
- Recorded at: Pending owner response
- Choice: Pending owner response
- Owner edits: None
- Post-answer review: Pending owner response
- Final authorization boundary: Pending owner response
- Canonical destination: .syzygy/governance/decisions/OWNER-DIRECTION-P115-IMPLEMENTATION-AND-CONSUMER-MIGRATION-[actual approval date].md
- Routing evidence: Pending owner response

#### Evidence

- .syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md, lines 42–46.
- /home/tze/.cache/syzygy-v1-drive-20261027/p115/preparation-973965a-20261027T1332/P115-IMPLEMENTATION-AUTHORIZATION-PACKET.md
- Same sealed directory: OWNER-DIRECTION-P115-IMPLEMENTATION-AND-CONSUMER-MIGRATION-DRAFT.md, OWNED-FILES.json, TEST-DELTA-PLAN.json, BEHAVIOR-AND-VERIFICATION-MATRIX.md, CONSUMER-DISPOSITIONS.json, CURRENT-SOURCE-REFRESH.json and P115-IMPLEMENTATION-BEAD-DRAFT.json.
- Sealed MANIFEST.json SHA256: 2a4b38fbae2034e83141425454fcce0a8c0f33c20e3c5e8cb47eddaa22e2ee3a.
