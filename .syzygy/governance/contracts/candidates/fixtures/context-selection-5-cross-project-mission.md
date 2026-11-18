# Context-selection fixture 5 — cross-project Mission

## Task

**Objective.** A governed task: draft a two-project Mission (objective,
envelope, budgets, stop conditions) for owner approval. Risk class:
portfolio authority — the mission and its envelope are RFC3-16(a)
artifacts (RFC10-9, RFC10-4); no execution occurs inside this task.

**Warrant.** The two named projects; the mission objective, envelope,
budgets, and stop conditions being drafted; the owner-approval ceremony
the draft is prepared for. Declared change class: mission drafting,
portfolio-scoped, authorization-bearing at approval. The task performs no
owner act, dispatches nothing, and authors no OpenSpec requirement.

---

*Everything above the rule is the task. Everything below is the recorded
answer: a blind derivation (the protocol review RD-5 ran) receives the Task
section and the governed corpus only, derives a selection, and compares it
against what follows — reading no further until its own selection is
written down.*

**Selection rule trace (RFC11-4, traversal per RFC11-14).** Warrant names
a Mission whose draft must state identity and lifecycle (module 1),
envelope and attention posture (module 2), budgets (module 3), stop
conditions and effect duties (module 4), and a two-project scope
(module 5) — every module of the RFC-0010 package is the defining text for
a part of the artifact being drafted → RFC-0010 README + all five modules.
Every mission-spawned run consumes packets, and the envelope pins the
packet identity and provenance duties its runs inherit → RFC-0011 README +
`packet-identity-provenance-and-memory` (the dependency edge is satisfied
by one module; RFC11-14 rule 2). Mission approval is an owner act under
the two-state model → RFC-0003 `governance-homes-and-owner-acts` + README.
Doctrine floor → `vision.md` (VIS-4 always-human classes, the
not-autonomous posture).

**Phase-boundary rule, applied (RFC11-4 with RFC11-13).** RFC-0010,
RFC-0011, and RFC-0003 each declare `implementation_boundary:
requires-openspec` (naming RFC10-16, RFC11-12, RFC3-33); the declarations
travel in the three loaded READMEs. The defining modules of RFC10-16
(module 1) and RFC11-12 (the packet module) are in the packet on their own
merits; the task is off the OpenSpec seam, so RFC3-33's defining module
(`manifests-and-namespace`) is not forced.

## Required context (mandatory, deterministic)

```
scripts/context_load.py rfcs/RFC-0010/README.md \
  rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md \
  rfcs/RFC-0010/prevention-envelope-and-attention.md \
  rfcs/RFC-0010/budget-reservation.md \
  rfcs/RFC-0010/effects-recovery-and-stop.md \
  rfcs/RFC-0010/portfolio-and-cross-project-consent.md \
  rfcs/RFC-0011/README.md \
  rfcs/RFC-0011/packet-identity-provenance-and-memory.md \
  rfcs/RFC-0003/README.md \
  rfcs/RFC-0003/governance-homes-and-owner-acts.md doctrine:vision.md
```

Measured: **25,070 words ≈ 33,844 estimated tokens.** Band position and
disposition against the proposed (non-installed) budget lines are owned by
`CONTEXT-BUDGET-REPORT.md` §1, computed from this anchored figure; this
fixture's prose makes no band claim of its own. *(An earlier revision of
this fixture asserted its measured load was "inside the 15–20k working
target" while the anchored figure above it read 22,260 tokens — a band
claim contradicting its own headline, found by review RD-5. The repair is
structural, not numeric: prose no longer states band positions at all.)*

## Candidate budget exception — disclosed

| Field | Value |
|---|---|
| **Artifact** | This fixture's mandatory selection (the eleven files in the load command; measured in the anchored field above) |
| **Reason** | A mission draft must state, in the artifact itself, every dimension the RFC-0010 package defines — identity and pinned inputs (module 1), the envelope and its attention posture (module 2), budget reservation under the six-quantity model (module 3), stop conditions and effect/recovery duties (module 4), and the two-project consent plane (module 5). Dropping a module drops the defining text of a section the drafter must write. The packet-provenance module and the act machinery are what make the draft's obligations and its approval honorable |
| **Scope** | Drafting a cross-project mission and its envelope for owner approval. Does **not** cover: the approval ceremony itself; single-project missions (module 5 may then be omitted and the packet re-measured); mission *operation* tasks, which are inadmissible until the D3 precondition clears (RFC10-24) |
| **Reviewer** | **Unassigned.** This selection was re-derived 2026-08-08 after the owner-ordered RFC-0010/0011 package split; the RC-12 waiver review covered other fixtures and never this one. Independent review is owed at the round's review pass and this row says so rather than borrowing a signature |
| **Expiry / revisit trigger** | The **earlier** of (a) the first real mission-drafting work item, or (b) the first owner acceptance act that binds the digest of any RFC module in this set. Re-review is mandatory at expiry |

## Omitted applicable candidates, with reasons

- RFC-0011 `deterministic-selection-and-budget` — binds the compiler
  implementer and the selection policy, not the mission drafter; the
  RFC-0011 dependency edge is satisfied by the loaded packet module
  (RFC11-14 rule 2), and the envelope references the budget posture
  (RFC11-11) through RFC-0010's own budget module, which is loaded.
- RFC-0008 — deliberately **suggested, not mandatory**: at approval time
  the mission authorizes future materialization; the work-state contract
  binds when work items exist. The two-field consumption rule the
  drafter must not violate is restated at binding strength in RFC-0010
  (RFC8-12/28/30). When the mission starts running, RFC-0008 becomes
  mandatory for its packets.
- RFC-0005 — the approving client's admission is the session's concern,
  not the draft's; envelope references to execution profiles are by
  RFC5-18 identity, carried in RFC-0010's text.
- RFC-0003 `manifests-and-namespace` — no manifest field changes; the
  phase-boundary rule does not force it (applied rule above).
- RFC-0001/0002/0004/0006/0007/0009 — no kernel-entity, evidence, or
  surface change in the drafting task; per-project doctrine/contract
  pins enter the mission's own pinned-input list (RFC10-4), which the
  approval ceremony verifies, not this packet.
- Craft policies — no code, no tests.

## Why no applicable constraint was lost

The no-self-widening rule (RFC10-8), narrow-reading default (RFC10-7),
the two-plane authority split (RFC10-15 — neither project becomes
authoritative over the other), the six-quantity budget model and its
admission inequality (module 3), the stop and recovery duties the draft's
stop conditions must be written against (module 4), the act machinery the
approval will use (RFC3-16(a)/(b)/(c)), and the always-human floor (VIS-4)
are all mandatory-loaded. So is the **D3 operating precondition
(RFC10-24)**: the drafter sees in the packet itself that no mission leaves
`awaiting-approval` until the doctrine question is ruled, so the draft
cannot promise operation the corpus forbids. The mission's pinned inputs
are identities resolved at approval, not documents this packet must
contain (RFC11-1 binds them by identity).

## Suggested inferred additions (provenance: index adjacency)

RFC-0008 README + `identity-authority-materialization` if the drafter
wants materialization semantics in view; RFC-0005
`admission-and-boundary` if machine-client scopes for mission-affecting
acts (RFC10-3) are being set in the same draft. Word costs for every
module are in `CONTEXT-BUDGET-REPORT.md` §3.

## Packet digest

sha256 over the mandatory files concatenated in listed order:
`34935c1fa8bb6493…`.

**Selection: hand-authored golden selection. Measurement: mechanical.
Compiler implementation: absent.** `scripts/context_load.py` resolves a
path list it is handed and counts words; it has no notion of a task, a
warrant, a risk class, an `applies_to` value, or a dependency edge. The
selection above was made by a human and the trace is the reasoning that
produced it, written down — not a machine's output narrated afterwards.
The `Compiler: context_load.py, selection rules rev10-fixtures` line this
fixture used to carry was removed 2026-08-06: there is no compiler, and
`rev10-fixtures` resolved to nothing anywhere in the repository.

*Re-measured 2026-08-05 (refactor round): figures and packet digest refreshed after this round's recorded corrections to RFC-0003 governance-homes (P-6, +13 w) and the craft banners (P-7, security policy +26 w); selection unchanged. Prior figures/digest are in git history.*

*Re-measured 2026-08-05b by `scripts/check_governance.py` CG-18, which recomputes the digest and the word count from the declared mandatory set rather than trusting the recorded figures. Previous: 12,843 words, digest `c92c6f8a936b12b0…`. Selection unchanged; the movement is contract edits landing under a fixture that had no mechanical freshness check until now.*

*Re-selected and restructured 2026-08-08 (round-2026-08d): the mandatory
set re-derived against the owner-ordered RFC-0010 (five-module) and
RFC-0011 (two-module) packages, which replaced the single files this
fixture previously named; task/answer boundary added per RD-5's
blind-derivation protocol; the false band claim removed and recorded
above; transcribed measurements removed — the anchored `Measured:` field
and the packet digest are the only measurements this fixture states.*

*Re-measured 2026-08-10 by the same CG-18 method (declared mandatory set, listed order): the round-2026-08e RD-26 repair batch edited Wave A modules this packet loads. Previous: 21,600 words, digest `d874f9ce4867f1b1…`. Selection unchanged; the movement is contract repairs landing under the fixture, which is the class this check exists to catch.*
