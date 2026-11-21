# Context-selection fixture 2 — Trajectory work-provider adapter change

## Task

**Objective.** A governed work item: amend the substrate-to-normalized
work-state derivation mapping for a work-provider adapter (the RFC8-12
artifact). Risk class: **authorization-bearing** — the mapping widens what
the surface reports as live/dispatchable, so it is an RFC3-16(a) artifact.

**Warrant.** The named work-provider adapter and its derivation mapping;
the normalized work-state vocabulary the mapping projects into. Declared
change class: authorization-bearing derivation-mapping edit. The task
performs no owner act (the approval ceremony is a separate packet), authors
no OpenSpec requirement, and touches no execution-record capture or
fidelity-join semantics (fixture 9's class).

---

*Everything above the rule is the task. Everything below is the recorded
answer: a blind derivation (the protocol review RD-5 ran) receives the Task
section and the governed corpus only, derives a selection, and compares it
against what follows — reading no further until its own selection is
written down.*

**Selection rule trace (RFC11-4, traversal per RFC11-14).** Warrant names
the adapter and mapping → RFC-0004 (`general-contract` + `named-adapters` +
README) and RFC-0008 `state-vocabulary-and-cost` + README (RFC8-12/13 live
there). The risk/change class (authorization-bearing) pulls the owner-act
machinery → RFC-0003 `governance-homes-and-owner-acts` + README
(RFC3-16(a)/(b)/(c)). The untrusted-actor premise is doctrine →
`security.md` (SEC-3).

**Phase-boundary rule, applied (RFC11-4 with RFC11-13).** RFC-0004,
RFC-0008, and RFC-0003 each declare `implementation_boundary:
requires-openspec` (naming RFC4-30, RFC8-32, RFC3-33); the declarations
travel in the three loaded package READMEs and are recorded here. The task
amends a governed mapping artifact and does not sit on the OpenSpec seam,
so no defining module is forced by the boundary rule.

## Required context (mandatory, deterministic)

```
scripts/context_load.py rfcs/RFC-0004/README.md \
  rfcs/RFC-0004/general-contract.md rfcs/RFC-0004/named-adapters.md \
  rfcs/RFC-0008/README.md rfcs/RFC-0008/state-vocabulary-and-cost.md \
  rfcs/RFC-0003/README.md rfcs/RFC-0003/governance-homes-and-owner-acts.md \
  doctrine:security.md
```

Measured: **23,150 words ≈ 31,253 estimated tokens** — above the proposed
20,000-token decomposition trigger, disclosed as a risk-class exception
(RFC11-11): an authorization-bearing change may not shed its authorization
contract (the RFC3-16(a) module) or the mapping's consuming vocabulary
(RFC8-12/13 tables), and RFC11-5 forbids trimming mandatory context to fit
a budget. The lawful alternative — sharding the task (mapping edit vs
approval ceremony as two packets) — is noted in the warrant; this fixture
shows the undivided form with the exception stated rather than hidden.
Band position and the percentage over the trigger are owned by
`CONTEXT-BUDGET-REPORT.md` §1, computed from the anchored figure above.

**Correction, 2026-08-06 (RC-12 finding F-1).** The disclosure above
previously named only the 15–20k *working target* and never the
20,000-token *decomposition trigger* it actually crossed. A reader checking
this fixture against §11.4 found no acknowledgment that §11.4 had been
crossed at all — and this was the only fixture in the breach set that did
not name the line it crossed, while being the only one in the *accepted*
set. The trigger is now named first.

## Budget waiver — reviewed

| Field | Value |
|---|---|
| **Artifact** | This fixture's mandatory selection (the eight files in the load command; measured in the anchored field above) |
| **Reason** | An authorization-bearing derivation-mapping edit cannot shed (i) the act contract that makes the edited artifact honored — RFC3-16(a)/(b)/(c), whose smallest load unit is one module (word cost in `CONTEXT-BUDGET-REPORT.md` §3); (ii) the consuming state vocabulary the mapping projects into (RFC8-12/13, tables read verbatim); (iii) the adapter contract bounding what the adapter may write; or (iv) the SEC-3 premise that makes (i) necessary. The only measured configuration under the trigger is reached by dropping (i), which RFC11-5 forbids and which this fixture's own reasoning refuses |
| **Scope** | Work-provider adapter changes that edit an **RFC3-16(a) authorization-bearing** derivation mapping. Does **not** cover: the approval ceremony for such a mapping (a separate, smaller packet); mapping edits that are not authorization-bearing; adapter changes touching execution-record capture or fidelity joins, which is fixture 9's class |
| **Reviewer** | **RC-12, independent reviewer, 2026-08-06.** Ruled `WAIVER SOUND` in `../round-2026-08b/reviews/RC-12-budget-waiver-RAW.md`, over the *selection* — not over the contracts it selects. That review's own verdict was `EXCEPTIONS`; read §5 there on what this signature can and cannot mean while no budget rule is installed |
| **Expiry / revisit trigger** | The **earlier** of (a) the first real work-provider adapter mapping change, or (b) the first owner acceptance act that binds the digest of any RFC module in this set. Re-review is mandatory at expiry; this waiver does not auto-renew |
| **Early-revisit conditions** | (i) ~~The strict RFC11-4 reading (RC-12 finding F-3)~~ — **resolved 2026-08-08**: the round-2026-08d amendment to RFC11-4/RFC11-13 adopted declaration-travel with on-seam module forcing; this task is off the seam, so the packet does not grow and the condition cannot fire. (ii) If `RFC-0003/governance-homes-and-owner-acts.md` is ever split, a smaller load unit exists and the "smallest load unit" reason is void. (iii) If a budget rule is installed whose number is not 20,000 |

## Omitted applicable candidates, with reasons

- RFC-0004 `execution-record` and `fidelity-joins-and-mappings` — the
  mapping change touches ingestion classification, not execution-record
  capture or join semantics; their clauses are not cited by RFC8-12/13.
  (RFC-0004's phase-rule clause RFC4-30 is defined in
  `fidelity-joins-and-mappings`; its declaration travels in the loaded
  README per the applied rule above, and this off-seam task does not force
  the module.)
- RFC-0008 `identity-authority-materialization` and
  `accounting-reconciliation-and-release` — state derivation, not
  dispatch or accounting; that lifecycle is fixture 10's class.
- RFC-0003 `manifests-and-namespace` — no manifest field changes.
- RFC-0005 — no client, consent, or profile surface touched (the
  owner-act ceremony's audit anchor RFC5-25 is cited inside RFC3-16(b)
  item 9 at binding strength).
- RFC-0001/0002/0006/0007/0009/0010/0011, craft — not cited by the
  warrant's clause set.

## Why no applicable constraint was lost

The three contracts that make this change dangerous are all fully
loaded: what a mapping may claim (RFC8-12/13, tables verbatim), what an
adapter may write (RFC-0004), and why the artifact is honored only under
owner-act provenance (RFC3-16(a), with the SEC-3 premise from
`security.md`). Each selected contract's implementation-boundary
declaration travels in its loaded README (applied rule above). The
exception path is a disclosure, not an omission.

## Suggested inferred additions (provenance: index adjacency)

RFC-0002 `rendering-vocabularies` (how derived states render downstream);
RFC5-25's clause (audit-trail location) if the ceremony itself is in
scope.

## Packet digest

sha256 over the mandatory files concatenated in listed order:
`ecfca48dee2ce598…`.

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

*Re-measured 2026-08-05b by `scripts/check_governance.py` CG-18, which recomputes the digest and the word count from the declared mandatory set rather than trusting the recorded figures. Previous: 18,315 words, digest `a398a06362074451…`. Selection unchanged; the movement is contract edits landing under a fixture that had no mechanical freshness check until now.*

*Restructured 2026-08-08 (round-2026-08d): task/answer boundary added per
RD-5's blind-derivation protocol; phase-boundary rule applied under amended
RFC11-4/RFC11-13; early-revisit condition (i) recorded resolved; every
transcribed measurement removed — the anchored `Measured:` field and the
packet digest are the only measurements this fixture states. The Trajectory
*lifecycle* class this fixture was once counted against is fixture 10's;
this fixture covers the work-provider adapter derivation-mapping class
only, closing RD-5's double-count finding.*

*Re-measured 2026-08-10 by the same CG-18 method (declared mandatory set, listed order): the round-2026-08e RD-26 repair batch edited Wave A modules this packet loads. Previous: 19,490 words, digest `93c4674ef075e667…`. Selection unchanged; the movement is contract repairs landing under the fixture, which is the class this check exists to catch.*

*Re-measured 2026-08-10b by the same CG-18 method: the round-2026-08e RD-27 repair batch edited Wave B modules this packet loads. Previous: 19,596 words, digest `fb7c6d9e0e380eed…`. Selection unchanged.*

*Re-measured 2026-11-22 by the same CG-18 method: the U2 contract amendment (orphan predicate; Contradiction adjudication route per D12) edited contract modules this packet loads. Previous: 23,150 words, digest `238cbe0671d8f172…`. Selection unchanged.*
