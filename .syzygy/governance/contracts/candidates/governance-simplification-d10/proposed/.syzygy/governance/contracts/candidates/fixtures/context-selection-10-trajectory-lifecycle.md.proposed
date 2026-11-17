# Context-selection fixture 10 — Trajectory work lifecycle (identity, dispatch, materialization, accounting, release)

**Status:** DRAFT — a candidate fixture, new at round-2026-08d. Binds
nothing. Written 2026-08-08 to close the coverage gap review RD-5 found:
the fixture set counted fixture 2 against the Trajectory class while
fixture 2 exercises the work-provider *adapter derivation-mapping* class,
leaving the Trajectory *lifecycle* — work identity, dispatch,
materialization, accounting, and release — covered by no fixture.

## Task

**Objective.** A governed work item: amend the work-item lifecycle wiring
for mission-spawned fleet runs — the identity a materialized work item
carries, the warrant chain recorded from proposal through materialization
to run and merge, the dispatch seam (including maximum time to first
dispatch), and when a work item's budget reservation is spent, released,
or recovered at each terminal state. Risk class: **work-plane authority
and budget accounting** — materialization is a one-way door (RFC8-10,
SDR-7), and release accounting decides when reserved budget frees
(RFC10-17).

**Warrant.** The work-item lifecycle seam end to end: work identity and
its warrant chain; materialization; dispatch; accounting; reservation
release at terminal states, for work items materialized under an approved
mission. Declared change class: lifecycle-semantics amendment, spanning
the RFC-0008/RFC-0010 release seam. The task performs no owner act,
touches no substrate adapter mapping (fixture 2's class), and authors no
OpenSpec requirement.

---

*Everything above the rule is the task. Everything below is the recorded
answer: a blind derivation (the protocol review RD-5 ran) receives the Task
section and the governed corpus only, derives a selection, and compares it
against what follows — reading no further until its own selection is
written down.*

**Selection rule trace (RFC11-4, traversal per RFC11-14).**

1. The warrant names the whole Trajectory lifecycle → RFC-0008, all three
   modules + README: work identity, authority, and the materialization
   one-way door (`identity-authority-materialization`, RFC8-9/10/11); the
   normalized state vocabulary and cost model dispatch consumes
   (`state-vocabulary-and-cost`, RFC8-12..20); the change-accounting chain
   and release semantics (`accounting-reconciliation-and-release`,
   RFC8-21..32).
2. Work items here are mission-spawned, so the reservation the release
   rule frees is RFC-0010's → `budget-reservation` (the six-quantity
   model, the admission inequality, and the release table whose rows —
   child-grant maximum time to first dispatch, parent termination — are
   the dispatch/terminal seam this task amends) + package README.
3. Work identity is kernel identity: the work-item, proposal, and
   materialization entities and their continuity are RFC-0001's
   (RFC1-27/28/29, cited in the loaded clauses' own text as the projection
   base) → RFC-0001 in full (single-file contract; no smaller load unit).
4. Terminal and chain states render against closed vocabularies →
   RFC-0002 `rendering-vocabularies` + README (RFC2-18 chain states,
   RFC2-23/24/25, consumed by RFC8-24/28).
5. A run in the chain is an Execution Record → RFC-0004
   `execution-record` (RFC4-19's record envelope, run identity, and the
   rows the accounting chain joins on).
6. Every Trajectory rendering obeys RFC 0006 (RFC8-31), and lifecycle
   states are selectable/renderable facts → RFC-0006 (single file).
7. Doctrine floor → `vision.md`: the three-state thesis — **work is never
   proof** — is the rule the release semantics can violate, and VIS-2
   governs what an uncomputed reconciliation state may claim.

**Phase-boundary rule, applied (RFC11-4 with RFC11-13).** RFC-0008
declares `implementation_boundary: requires-openspec` naming RFC8-32; its
declaration travels in the loaded README and the defining module
(`accounting-reconciliation-and-release`) is loaded. RFC-0002 declares
RFC2-26 (README loaded; defining module loaded). RFC-0010 declares
RFC10-16 (README loaded; the task is off the OpenSpec seam, so the
defining module — `mission-identity-approval-and-lifecycle` — is not
forced). RFC-0001 and RFC-0006 are single files carrying their own
declarations and defining clauses (RFC1-33, RFC6-28). RFC-0004 is
selected **without its index** — a recorded departure — so its
declaration is recorded here verbatim from `rfcs/RFC-0004/README.md`:
`{kind: requires-openspec, clause: RFC4-30}`, read at the index bytes the
packet digest below was stamped against.

## Required context (mandatory, deterministic)

```
scripts/context_load.py rfcs/RFC-0001-project-graph-identity-state-planes.md \
  rfcs/RFC-0008/README.md \
  rfcs/RFC-0008/identity-authority-materialization.md \
  rfcs/RFC-0008/state-vocabulary-and-cost.md \
  rfcs/RFC-0008/accounting-reconciliation-and-release.md \
  rfcs/RFC-0010/README.md rfcs/RFC-0010/budget-reservation.md \
  rfcs/RFC-0002/README.md rfcs/RFC-0002/rendering-vocabularies.md \
  rfcs/RFC-0004/execution-record.md \
  rfcs/RFC-0006-cross-surface-selection-query-drawer.md \
  doctrine:vision.md
```

Measured: **43,067 words ≈ 58,140 estimated tokens.**

## ⚠️ Far above the decomposition trigger — the class's honest floor, and the shard that is the real default

The anchored figure above is more than double the **20,000-token** line at
which the charter §11.4 context-budget table (candidate `CC-BUDGET-1`;
installed nowhere) calls for justification or task decomposition; its rank
within the fixture set is computed in `CONTEXT-BUDGET-REPORT.md` §1.
Recorded with the decomposition stated as the default rather than as an
afterthought: unlike fixtures 7 and 8, whose undivided forms are floors,
**this task's undivided form is an over-broad warrant**, and the fixture
says so.

| Field | Value |
|---|---|
| **Artifact** | This fixture's mandatory selection (the twelve files in the load command; measured in the anchored field above) |
| **Reason** | The undivided lifecycle warrant spans kernel work identity (RFC-0001, indivisible), all three planes of the work surface (RFC-0008 in full), the mission-side reservation/release seam (RFC-0010 module 3), the state vocabularies and record envelope the chain joins on, and the surface-selection contract every rendering obeys. Every file answers a clause the warrant's own text names. The size is a property of the warrant's breadth, not of padding |
| **Scope** | Amendments spanning the **whole** work-item lifecycle seam — identity + dispatch + materialization + accounting + release together, for mission-spawned work. A warrant touching only one segment takes the matching shard below instead |
| **Reviewer** | **Unassigned.** This fixture is new at round-2026-08d; independent review is owed at the round's review pass, and this row says so rather than borrowing a signature from a review that never saw it |
| **Expiry / revisit trigger** | The **earlier** of (a) the first real lifecycle-seam work item, or (b) the first owner acceptance act that binds the digest of any RFC module in this set |
| **Decomposition reviewed** | The class shards along its own seam (each shard re-measurable from the load command; per-module words: `CONTEXT-BUDGET-REPORT.md` §3). **Shard A — accounting and release**: `state-vocabulary-and-cost` + `accounting-reconciliation-and-release` + RFC-0008 README + RFC-0010 README + `budget-reservation` + `rendering-vocabularies` + RFC-0002 README + `execution-record` + `vision.md` — drops the kernel and the surface-selection contract, lawful when work identity and materialization semantics are untouched. **Shard B — identity and materialization**: RFC-0001 + `identity-authority-materialization` + RFC-0008 README + `vision.md` — the fixture-7 genre, floored by the kernel's indivisibility. Whether the undivided form is ever a lawful single packet is an owner trade under RFC11-11; the sharded pair is this fixture's recommended default |

## Omitted applicable candidates, with reasons

- **RFC-0008** — nothing omitted; the warrant spans the package.
- **RFC-0010** `mission-identity-approval-and-lifecycle`,
  `prevention-envelope-and-attention`, `effects-recovery-and-stop`,
  `portfolio-and-cross-project-consent` — the mission's own lifecycle,
  envelope, effect duties, and consent plane are the *mission drafter's*
  packet (fixture 5). This task consumes the reservation/release seam
  only, and module 3 carries it. RFC10-16's declaration travels in the
  loaded README (applied rule above).
- **RFC-0004** `general-contract`, `named-adapters`,
  `fidelity-joins-and-mappings`, README — evidence capture and adapter
  conduct are fixture 9's class; the chain joins on the record envelope,
  which the loaded `execution-record` module defines. The index is not
  loaded; its implementation-boundary declaration is recorded verbatim in
  the applied-rule paragraph, as amended RFC11-4 requires.
- **RFC-0002** `snapshot-and-evaluation-core`, `challenge-lifecycle`,
  `reconciliation-chain` — evaluation machinery is pinned by the packet's
  as-of; the lifecycle consumes the closed vocabularies, which are loaded.
- **RFC-0003** (open dependency edge — disposed below), **RFC-0005** (open
  edge — disposed below), **RFC-0007** (open edge — disposed below).
- **RFC-0009/0011** — no map change and no packet compilation in this
  task.
- **doctrine** `architecture.md`, `trust-and-evidence.md`, `security.md`,
  `v1.md`, `README.md` — the rule this change can violate (work is never
  proof; no evidence → Unknown) is stated normatively in the loaded
  `vision.md`; no security posture, temporal-model, or scope-boundary
  amendment. Every doctrine file is loaded or named here.
- **Craft policies** — no code, no tests; no declared floor of theirs is
  the classifier of this change.
- **Topology bundle**, **`history/**`**, **`_bootstrap/**`** — candidate
  or historical material; no placement changes; never authority.

## Dependency closure (RFC11-14 rule 2), checked and not fully closed

RFC-0001, RFC-0002, RFC-0004, RFC-0006, RFC-0008, and RFC-0010 each have
at least one module (or their whole single file) in the packet — those
edges close. **RFC-0003, RFC-0005, and RFC-0007 do not**, and the loaded
modules cite them; per RFC11-14 rule 2 the cited clause identities are
enumerated and disposed of individually:

| Clause | Where the packet answers it |
|---|---|
| RFC3-16, RFC3-16(a) | The act-provenance condition is stated where cited — module status banners and RFC8-12's own clause text; the act *machinery* is the ceremony packet's load (fixture 3's rule: when the adoption ceremony becomes the task, that packet loads it) |
| RFC3-19 | Storage/rebuild discipline for projection stores, cited by RFC8-3/RFC8-7 as the constraint they restate; binds the store implementer, and the loaded clauses carry the restated rule |
| RFC3-15 | Cited by RFC8-25 for the inherited-mutation record's governed home; the loaded clause states the obligation it takes from it |
| RFC3-30 | Cited inside the loaded RFC4-19/RFC4-21 text (record home discipline); carried where cited |
| RFC5-21, RFC5-15, RFC5-18 | Cited inside RFC10-17's own clause text as the launch-gate and per-transmission admission predicates; the profile contract binds the execution phase. Promotion trigger: a change to how enforced limits admit at launch makes `RFC-0005/execution-profiles` mandatory |
| RFC5-18(e), RFC5-17 | Cited inside the loaded RFC4-19/RFC4-21 text (record envelope rows); prose-field and profile details deferred exactly as fixture 9 defers them |
| RFC7-24 | Cited by RFC8-9 for the proposal→work seam with the intent surface; the queue-ownership rule is RFC8-9's own text. Promotion trigger: a change to that seam makes RFC-0007 mandatory |
| RFC7-20, RFC7-38 | Appear inside the loaded RFC-0002 module (tier-registry note; shape-parallel phase-rule list) — a citation, not a reliance |

If the warrant grows to any promotion trigger above, this packet is
incomplete under RFC11-6 and the run does not launch on it.

## Why no applicable constraint was lost

The materialization one-way door and pre-materialization authority
(RFC8-9/10), the work-identity projection base in the kernel's own words
(RFC1-27/28/29 and their continuity semantics), the normalized state
vocabulary and its two-field consumption rule (RFC8-12), the cost model
without an effort score (RFC8-18), the full change-accounting chain and
its broken-join honesty (RFC8-21/22/23), the closure-fallacy prohibition
(RFC8-30), the six-quantity reservation model with its admission
inequality and release table (RFC-0010 module 3), the chain-state and
tier vocabularies (RFC2-18/23/24/25), the record envelope runs join on
(RFC4-19), the selection semantics every rendering obeys (RFC-0006), and
the work-is-never-proof floor (vision.md) are all mandatory-loaded. Every
selected contract's implementation-boundary declaration is in the packet
or recorded verbatim above.

## Suggested inferred additions (provenance: index adjacency and declared edges)

- `RFC-0003/governance-homes-and-owner-acts.md` — the moment the
  amendment's adoption ceremony, rather than its design, is the task.
- `RFC-0005/execution-profiles.md` — under the launch-gate promotion
  trigger above.
- `RFC-0010/mission-identity-approval-and-lifecycle.md` — if the change
  alters when a mission's own terminal state releases its children
  (RFC10-5's park-expiry limbs), rather than when a work item's terminal
  state releases its reservation.
- `RFC-0004/README.md` + remaining modules — if the change touches how
  evidence is captured rather than how the chain joins on it (fixture 9's
  class).

Word costs for every module are in `CONTEXT-BUDGET-REPORT.md` §3.
Suggestion never suppresses (RFC11-5).

## Packet digest

sha256 over the mandatory files concatenated in listed order:
`8972411055a76b5e…` (recompute: `cat <mandatory files> | sha256sum`, with
`doctrine:` resolved to `.syzygy/governance/doctrine/`). Measured, not
compiled, by `scripts/context_load.py`; the placeholder digest here is
overwritten by `build_budget_report.py` at first stamp and verified by
`check_governance.py` CG-18 thereafter.

**Selection: hand-authored golden selection. Measurement: mechanical.
Compiler implementation: absent.** `scripts/context_load.py` resolves a
path list it is handed and counts words; it has no notion of a task, a
warrant, a risk class, an `applies_to` value, or a dependency edge. The
selection above was made by a human and the trace is the reasoning that
produced it, written down — not a machine's output narrated afterwards.
This fixture records no `Compiler:` line and no selection-rule version:
none exists.

**Digest-source pinning.** This digest and the totals above are computed
over the canonical-home bytes; there is exactly one resolution and no
silent source swap. The digest exists so that a later corpus edit
**invalidates this packet rather than silently changing what it meant**.

## Verification checklist (§15)

- [x] **All mandatory context included** — for the warrant as stated, with
      three open edges disposed clause-by-clause and their promotion
      triggers named
- [x] **Unrelated modules excluded** — every RFC module other than the
      eleven loaded RFC files is absent (the module population is
      `CONTEXT-BUDGET-REPORT.md` §3's table, not an estimate)
- [x] **Stable output for identical inputs** — same argument list, same
      totals; the totals are order-independent, the digest is not, so the
      listed order is part of the declaration
- [x] **Budget respected or waiver emitted** — **not respected**: the
      anchored figure is far above the proposed trigger; the disclosure
      above names the sharded pair as the recommended default rather than
      defending the undivided form
- [x] **Omissions recorded** — every RFC, every doctrine file, craft, the
      topology bundle and the historical lane are loaded or named with a
      reason
- [ ] **No generated summary replaces exact authority** — *not verifiable
      by any script here.* The fixture names files; nothing checks that a
      consumer read the clause rather than an index or its own summary.
- [ ] **Selection produced deterministically** — *false by construction.*
      No selector exists; the set above is human judgment. This item is
      listed and left unchecked so the fixture set stops implying
      otherwise.

*First authored 2026-08-08 (round-2026-08d), with the task/answer boundary
of RD-5's blind-derivation protocol from the start. No previous figures
exist: this fixture is new, and its anchors are stamped by
`build_budget_report.py` and verified by CG-18 from the first run.*

*Re-measured 2026-08-10 by the same CG-18 method (declared mandatory set, listed order): the round-2026-08e RD-26 repair batch edited Wave A modules this packet loads. Previous: 39,092 words, digest `d4e082478168b311…`. Selection unchanged; the movement is contract repairs landing under the fixture, which is the class this check exists to catch.*

*Re-measured 2026-08-10b by the same CG-18 method: the round-2026-08e RD-27 repair batch edited Wave B modules this packet loads. Previous: 39,212 words, digest `27bbefa2691ed13d…`. Selection unchanged.*
