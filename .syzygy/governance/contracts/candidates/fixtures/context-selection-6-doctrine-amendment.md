# Context-selection fixture 6 — doctrine / shape amendment

**Status:** DRAFT — a candidate fixture, not part of the rev10 accepted
fixture set (fixtures 1–5). Binds nothing. Repaired 2026-08-05 against the
two stored §20.4 reviews; the repairs are recorded in
`round-2026-08/CONTEXT-COMPILER-FIXTURE-REPORT.md`.

## Task

**Objective.** A governed task: draft a minimal doctrine amendment packet
(the D3 bounded-mission shape) and prepare its owner-adoption ceremony.
Risk class: **shape-defining** — VIS-4 always-human; no code, no runtime.

**Warrant.** The D3 draft and its two named amendment sites
(`architecture.md`, "The loop" paragraph; `vision.md`, "Not autonomous."
bullet — named in the draft's "What it amends" section); the V0/V1 scope
boundary the amendment must not cross; the owner-adoption ceremony being
prepared. Declared change class: doctrine amendment drafting. The task
performs no owner act and authors no OpenSpec requirement.

---

*Everything above the rule is the task. Everything below is the recorded
answer: a blind derivation (the protocol review RD-5 ran) receives the Task
section and the governed corpus only, derives a selection, and compares it
against what follows — reading no further until its own selection is
written down.*

**Selection rule trace (RFC11-4, traversal per RFC11-14).** The task class
is *doctrine amendment*, so **the amended text itself is mandatory**. The
D3 draft names its own two amendment sites: `architecture.md`, "The loop"
paragraph — which carries the substantive bounded-mission insertion — and
`vision.md`, "Not autonomous." bullet — the cross-referencing insertion
(`DOCTRINE-AMENDMENT-BOUNDED-MISSION-DRAFT.md`, "What it amends"). `v1.md`
carries the V0/V1 scope boundary the amendment must not cross. The
**ceremony** half of the objective pulls two further files: doctrine's
`README.md`, which is the amendment log's home and carries both the D1
recording precedent the draft's adoption mechanics cite and the
identifier-stability rule the draft relies on ("no rule renumbered"); and
the owner-act contract → RFC-0003's `governance-homes-and-owner-acts` module
plus its package README (spanning invariants + the deterministic
clause-lookup rule).

**Phase-boundary rule, applied (RFC11-4 with RFC11-13).** RFC-0003 — the
one selected contract — declares `implementation_boundary:
requires-openspec` naming RFC3-33; the declaration travels in its loaded
README and is recorded here. Doctrine files carry no such declaration and
need none (RFC11-13 binds contracts). The task is off the OpenSpec seam,
so RFC3-33's defining module (`manifests-and-namespace`) is not forced.

**Doctrine selection basis (RFC11-15).** Doctrine ownership metadata is
declared in the contract index's `governance_sources`; where a task class
has no declared metadata, RFC11-15 requires the packet to state its basis
rather than claim a derivation. This selection's doctrine files were
chosen by the amendment-site rule above (the amended text itself, plus the
log home and scope boundary) and verified against the files directly —
stated as judgment under a declared rule, not as deterministic output.

## Required context (mandatory, deterministic)

```
scripts/context_load.py doctrine:vision.md doctrine:v1.md \
  doctrine:architecture.md doctrine:README.md \
  rfcs/RFC-0003/README.md rfcs/RFC-0003/governance-homes-and-owner-acts.md
```

Measured: **15,174 words ≈ 20,485 estimated tokens.** Band position is
owned by `CONTEXT-BUDGET-REPORT.md` §1, computed from this anchored
figure; this fixture's prose makes no band claim of its own. The proposed
band and trigger live in the candidate knowledge-hygiene craft policy,
which is **not installed** — no `CC-BUDGET-*` identifier resolves to a
governed artifact today, and the limits are decomposition triggers, not
validity laws.

## Omitted applicable candidates, with reasons

- RFC-0010 Mission Control — the amendment's *subject*, not its
  *authority*: drafting doctrine text does not require the mission
  contract. But D3's inserted sentence copies RFC-0010's envelope
  vocabulary, and the draft's own adoption analysis turns on RFC-0010's
  status, so this is not a bare exclusion — it is moved to the **suggested**
  set below with provenance (RFC11-5), which is where inference may add and
  never suppress.
- RFC-0001 kernel — no entity, identity, relation, or plane semantics
  change; the amendment adds no term the kernel dictionary defines.
- RFC-0002/0004/0005/0006/0007/0008/0009 — no evaluation, evidence,
  execution, selection, or surface behaviour changes; D3 changes the
  *trigger grain* of the loop, not what any surface renders.
- RFC-0011 — no packet is compiled by this task; the packet *for* this task
  is what the fixture demonstrates.
- doctrine `security.md`, `trust-and-evidence.md` — the insertion changes no
  security posture (it explicitly preserves every gate) and no
  evidence/temporal rule; neither file is an amendment site, and neither is
  cited by the draft.
- Craft policies (all) — no engineering obligation is at issue in drafting
  doctrine text; the fresh-reader review duty the amendment must satisfy is
  doctrine's own (VIS-3), carried in the mandatory `vision.md`.
- Topology bundle (`.syzygy/map/topology-candidates/**`) — candidate
  material that binds nothing, and D3 changes no placement. Named here so
  the absence is a decision, not a gap; the loop-flow file is suggested
  below for the drafter who wants the diagram in view.
- `history/**`, `_bootstrap/**` — historical lane, never on a default
  reading path and never authority (AGENTS.md).

## Why no applicable constraint was lost

**Both amendment sites are in the mandatory set**, so the drafter can quote
and anchor the verbatim insertions rather than reconstruct them:
`architecture.md`'s "The loop" paragraph carries the human-trigger sentence
the substantive insertion appends to, and `vision.md`'s "Not autonomous."
bullet carries the site of the cross-referencing insertion. The gate that
makes adoption an owner act (VIS-4, in `vision.md`), the scope boundary the
amendment must not cross (`v1.md`), the amendment log with the D1 precedent
and the identifier-stability rule (doctrine `README.md`), and the act
machinery the ceremony uses — RFC3-16(a)/(b)/(c), including the
owner-adopted-bootstrap-act framing the draft's adoption mechanics cite —
are all mandatory-loaded.

**Index cross-check, with its limit stated.** Every RFC clause this task's
warrant cites (RFC3-16(a)/(b)/(c), RFC10-9 by reference) resolves through
`05-CONTRACT-INDEX.yaml` into the mandatory or suggested set, and RFC-0003's
implementation-boundary declaration travels with its loaded README
(RFC11-4's mandatory-inclusion rule, consuming RFC11-13). The index's
`governance_sources` list was empty when this fixture was first written (it
enumerated packet copies removed in the tracked-home move); the generator
was repointed at the canonical homes later in the same round, so the
projection now carries the doctrine and craft sources and this cross-check
resolves against it. The doctrine selections above were additionally
verified against the files directly (RFC11-15 basis, stated above).

The D3 amendment sites are additionally cross-checked against the D3
packet's own "What it amends" section, which names them.

## Suggested inferred additions (provenance: index adjacency)

RFC-0010 — the envelope vocabulary the insertion copies verbatim
(objective, budgets, risk limits, protected surfaces, stop conditions,
write scope, tools, gates, evidence obligations, completion predicate); a
drafter checking that doctrine and contract say the same thing in the same
words should load the package README and `prevention-envelope-and-attention`.
Suggested, never mandatory: the doctrine text is authored against doctrine,
and RFC-0010's own status is one of the questions the amendment leaves to
the owner. Also
`.syzygy/map/topology-candidates/06-intent-to-reconciliation-flow.md`
(**candidate** — binds nothing) — the loop-flow view whose trigger grain
the amendment clarifies. Word costs for every module are in
`CONTEXT-BUDGET-REPORT.md` §3.

## Packet digest

sha256 over the mandatory files concatenated in listed order:
`d5b14eaf23b0ec9a…` (recompute: `cat <mandatory files> | sha256sum`).

**Selection: hand-authored golden selection. Measurement: mechanical.
Compiler implementation: absent.** `scripts/context_load.py` resolves a
path list it is handed and counts words; it has no notion of a task, a
warrant, a risk class, an `applies_to` value, or a dependency edge. The
selection above was made by a human and the trace is the reasoning that
produced it, written down — not a machine's output narrated afterwards.
The `Compiler: context_load.py, selection rules rev10-fixtures` line this
fixture used to carry was removed 2026-08-06: there is no compiler, and
`rev10-fixtures` resolved to nothing anywhere in the repository.

**Digest-source pinning.** This digest and the measured totals above are
computed over the **canonical-home bytes** as of the last restamp:
`doctrine:` resolves to `.syzygy/governance/doctrine/`, `rfcs/` to this
package. No packet copies of doctrine exist under this root any more, so
there is exactly one resolution and no silent source swap. A packet pins the
exact source digests it compiled from precisely so that a later change —
D3's own adoption amending `architecture.md` and `vision.md` in place, or
any corpus edit — **invalidates this packet rather than silently changing
what it meant**. A stale digest is the correct, visible outcome; a packet
whose contents drift under a fixed digest is not.

## Verification checklist (§15)

- [x] **All mandatory context included** — both amendment sites, the scope
      boundary, the amendment-log home, and the ceremony contract
- [x] **Unrelated modules excluded** — every RFC module other than the two
      loaded RFC-0003 files is absent (the module population is
      `CONTEXT-BUDGET-REPORT.md` §3's table, not an estimate)
- [x] **Stable output for identical inputs** — same argument list, same
      totals; order-independent (`context_load.py` sums a set)
- [x] **Budget respected or waiver emitted** — the anchored figure above is
      the measurement; its disposition against the proposed band and
      trigger is owned by `CONTEXT-BUDGET-REPORT.md` §1, and no waiver is
      owed at the current measurement
- [x] **Omissions recorded** — every applicable candidate above is
      enumerated with a reason, including doctrine files, topology, and the
      historical lane
- [ ] **No generated summary replaces exact authority** — *not verifiable by
      the script.* The fixture names files; nothing checks that a consumer
      read the clause rather than an index or its own summary. See the
      fixture report's §5.

*Re-measured 2026-08-05b by `scripts/check_governance.py` CG-18, which recomputes the digest and the word count from the declared mandatory set rather than trusting the recorded figures. Previous: 11,537 words, digest `958090be70dd525b…`. Selection unchanged; the movement is contract edits landing under a fixture that had no mechanical freshness check until now.*

*Restructured 2026-08-08 (round-2026-08d): task/answer boundary added per
RD-5's blind-derivation protocol; phase-boundary rule applied under amended
RFC11-4/RFC11-13; doctrine-selection basis stated under new RFC11-15;
transcribed measurements removed — the anchored `Measured:` field and the
packet digest are the only measurements this fixture states.*

*Re-measured 2026-08-10 by the same CG-18 method (declared mandatory set, listed order): the round-2026-08e RD-26 repair batch edited Wave A modules this packet loads. Previous: 11,954 words, digest `f2b5de856da756ef…`. Selection unchanged; the movement is contract repairs landing under the fixture, which is the class this check exists to catch.*

*Re-measured 2026-08-10c by the same CG-18 method: the RD-29 repair batch annotated the doctrine README's amendment-log provenance cell (a file this packet loads). Previous: 12,004 words, digest `585500a1e99df11c…`. Selection unchanged.*
