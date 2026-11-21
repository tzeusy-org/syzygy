# Context-selection fixture 8 — OpenSpec requirement authoring

**Status:** DRAFT — a candidate fixture, later than the earlier candidate
set (fixtures 1–5; **no fixture is accepted** — all are candidates outside
every wave manifest, and "rev10" is a superseded revision). Binds nothing. Repaired 2026-08-05 against the
two stored §20.4 reviews; the repairs are recorded in
`round-2026-08/CONTEXT-COMPILER-FIXTURE-REPORT.md`.

## Task

**Objective.** A governed task: author the first OpenSpec requirements for an
adopted Polaris capability — the behaviour a surface clause makes
user-observable. Risk class: normative behavioural specification; the output
is an owner-approved spec delta, not code.

**Warrant.** The adopted Polaris capability and the surface clauses that
make its behaviour observable; the OpenSpec requirements being authored
against them. Declared change class: normative behavioural specification —
this task **sits on the OpenSpec seam**. It performs no owner act and
writes no code.

---

*Everything above the rule is the task. Everything below is the recorded
answer: a blind derivation (the protocol review RD-5 ran) receives the Task
section and the governed corpus only, derives a selection, and compares it
against what follows — reading no further until its own selection is
written down.*

**Why this fixture matters.** Every phase-rule clause routes user-observable
behaviour through OpenSpec before implementation is scheduled. This is the
packet an author receives at that boundary, and it carries the largest
budget breach in the fixture set — a claim checked against every sibling in
`CONTEXT-BUDGET-REPORT.md` §1 rather than asserted. (It is *not* the first
breach: accepted fixture 2 breached before it and is recorded as a
disclosed exception. Fixture 8's distinction is size, not precedence.)

**Deferred-wave label (RD28-07).** The selection procedure this fixture
derives with — RFC11-4, RFC11-13, RFC11-14 — is defined entirely in
`rfcs/RFC-0011/deterministic-selection-and-budget.md`, the sole module of
**Wave C2, which is deferred** (`DEFERRED-WAVE-POSTURE.md`). This fixture is
a worked example of the *candidate* selection discipline, not a Capability 1
reliance: the first spec's content depends on Waves A+B only, and an author
compiling context before C2 is accepted does so as judgment, with this
fixture as guidance rather than rule.

**Selection rule trace (RFC11-4, traversal per RFC11-14).** The warrant
names an adopted Polaris capability → `applies_to: polaris` selects
RFC-0007. Authoring a requirement against a capability needs the
capability/requirement identity model → RFC-0001 (RFC1-14 capability
identity; RFC1-15 "Requirement and Scenario are references, not owned
content") — a single-file contract with no smaller load unit. The output is
an owner-approved spec delta, so the adoption gate is doctrine →
`vision.md` (VIS-3 fresh-reader review; VIS-4's always-human spec-adoption
class). A requirement must be stated so it can be verified → craft
`testing-and-verification.md`.

**Phase-boundary rule, applied (RFC11-4 with RFC11-13) — the on-seam
case.** RFC-0007 declares `implementation_boundary: requires-openspec`
naming RFC7-38, and this task **sits on that boundary**: it authors the
observable behaviour the phase rule routes. The amended rule therefore
forces the module *defining* RFC7-38 — `rendering-and-surface.md`, whose
§3.13 carries the clause text — into the mandatory set; the README's
"Phase boundary" section is a restatement pointing there, and a
restatement is never the clause. RFC-0001 carries its own defining phase
rule (RFC1-33) in the loaded file. This is the same single rule fixture 1
applies from the other side (off-seam: declaration travels, module not
forced); the pre-amendment drafts of the two fixtures read the old
parenthetical in opposite directions, which review RD-5 recorded as a
contradiction, and the amended RFC11-4/RFC11-13 rule closed it.

## Required context (mandatory, deterministic)

```
scripts/context_load.py rfcs/RFC-0001-project-graph-identity-state-planes.md \
  rfcs/RFC-0007/README.md rfcs/RFC-0007/narrative-contract.md \
  rfcs/RFC-0007/rendering-and-surface.md doctrine:vision.md \
  craft:testing-and-verification.md
```

Measured: **27,206 words ≈ 36,728 estimated tokens.**

## ⚠️ Budget breach — waiver

The anchored figure above exceeds the **20,000-token** line at which the
charter §11.4 context-budget table requires explicit justification or task
decomposition, and sits well above the top of the proposed default band;
the percentages are computed in `CONTEXT-BUDGET-REPORT.md` §1–2. (§11.4's
table is cited directly: its intended home, the candidate knowledge-hygiene
craft policy, is not installed, and no `CC-BUDGET-*` identifier resolves to
a governed artifact today.) Recorded as a waiver rather than resolved by
trimming, because trimming would drop mandatory context to make a number
look better — the failure RFC11-5 forbids.

| Field | Value |
|---|---|
| **Artifact** | This fixture's mandatory selection (the six files in the load command; measured in the anchored field above) |
| **Reason** | RFC-0001 is indivisible (its justified oversize is recorded in `03-ACTIVE-CONTRACT-COMPACTION-REPORT.md`, *not* in RFC-0001 itself, which records no waiver) and requirement authoring genuinely needs the capability/requirement identity model (RFC1-14/RFC1-15), both modules of the surface contract that makes the behaviour observable (RFC-0007 — including the module carrying its phase rule RFC7-38, forced by the on-seam rule, which dictates the clause-to-requirement coverage matrix the author must produce), the adoption gate the delta must pass (VIS-3/VIS-4), and the verification bar the requirement must be testable against |
| **Scope** | OpenSpec requirement authoring against an adopted capability **whose surface contract is RFC-0007 (Polaris)**. It does **not** stretch to another surface contract: this fixture names "a capability whose surface contract is smaller" as the narrowing that retires the waiver, so applying it there applies it to the case that voids it. Does not cover review of the authored delta, which pulls `craft:review-and-documentation.md` instead (scope tightened by RC-12) |
| **Reviewer** | **RC-12, independent reviewer, 2026-08-06.** Ruled `WAIVER SOUND` in `../round-2026-08b/reviews/RC-12-budget-waiver-RAW.md`, over the *selection* — not over the contracts it selects. That review's own verdict was `EXCEPTIONS`; read §5 there on what this signature can and cannot mean while no budget rule is installed |
| **Expiry / revisit trigger** | The **earlier** of (a) the first real OpenSpec authoring task, or (b) **unconditionally at the creation of `openspec/**`**. RC-12 added (b): this packet renders the absent house conventions as an RFC11-6 Unknown and proceeds, so the moment conventions exist they become mandatory context, the measured floor changes, and the waiver was computed against a corpus that no longer describes the task. If decomposition proves possible at (a) — authoring against a smaller surface contract — the waiver retires instead |

**Decomposition review, honestly conducted.** Three splits measured (each
re-measurable from the load command minus the named files; per-module words
are in `CONTEXT-BUDGET-REPORT.md` §3); none is proposed as the default, and
the reason differs in each case:

| Candidate split | Why it is not the default |
|---|---|
| Author from RFC-0007's README alone (drop both normative modules) | Measured under the trigger — but the README is an **index**; substituting it for the normative clauses in an authoring task is exactly the summary-as-authority substitution the round exists to prevent, and it is where the RFC7-38 miss came from in the pre-repair draft of this fixture. The on-seam rule now forbids it outright |
| Drop RFC-0001 | Measured under the trigger — but it removes RFC1-14/RFC1-15, the definition of what a capability identity *is* and the rule that requirements are references, not owned content. An author without them invents identity semantics |
| Drop `narrative-contract`, keep `rendering-and-surface` | Still measured over the trigger, and it drops the clauses that define what the narrative asserts. Buys nothing |

**The honest finding: no lawful split lands inside the default band.** The
packet's floor is one indivisible kernel plus one surface package, and that
floor is above the trigger on its own. The lawful responses under RFC11-11
are sharding, narrowing the objective, or escalating — and the only real
narrowing available (a capability whose surface contract is smaller than
RFC-0007's) is not available for Polaris. That trade belongs to the owner.

## Omitted applicable candidates, with reasons

- RFC-0002 (`snapshot-and-evaluation-core`, `challenge-lifecycle`,
  `reconciliation-chain`, `rendering-vocabularies`, README) — requirements
  reference capabilities, not evaluations; the rendering vocabulary binds the
  surface implementer specifying *how* a state displays, which is downstream
  of this authoring task. Suggested below.
- RFC-0006 — cross-surface selection and drawer mechanics, not requirement
  content. Suggested below, since RFC7-16 references selection semantics.
- RFC-0003/0004/0005/0008/0009 — no governed home change, no evidence
  capture, no client or execution surface, no work-state or map change.
- RFC-0010/0011 — no mission and no packet compilation in this task.
- doctrine `architecture.md` — the loop and layout model is not amended and
  is not cited by the clauses this task authors against; the adoption gate
  the delta must pass is in `vision.md`, which is loaded. `v1.md` — the
  capability's V0/V1 status is settled by its adoption, not by this delta.
  `security.md`, `trust-and-evidence.md` — no security posture and no
  claim/evidence-warrant change; a requirement asserting evidence semantics
  would pull `trust-and-evidence.md`, and this one does not.
  `README.md` — doctrine's index and amendment log; no doctrine amendment
  occurs here. **Every doctrine file is either loaded or listed here**; none
  is unexplained.
- Craft policies other than `testing-and-verification.md` —
  `review-and-documentation.md` binds the review of the delta rather than
  its authoring (suggested below); the remaining policies bind engineering,
  interface, observability, performance, provenance, and secret-handling
  duties that no requirement text in this task exercises.
- Topology bundle (`.syzygy/map/topology-candidates/**`) — candidate
  material that binds nothing; no placement changes. Named so the absence is
  a decision, not a gap.
- `openspec/**` house conventions — **do not exist yet.** A real gap, not an
  exclusion: the authoring task has no house style to load, and the packet
  would render that gap as Unknown (RFC11-6) rather than proceed as though a
  convention existed.
- `history/**`, `_bootstrap/**` — historical lane, never a default reading
  path, never authority.

## Why no applicable constraint was lost

The capability identity model (RFC1-14) and the reference-not-content rule
for requirements (RFC1-15) are mandatory-loaded; both RFC-0007 modules are
present, so the narrative model, the surface obligations, and **the phase
rule's own clause text** (RFC7-38, `rendering-and-surface.md` §3.13 — not
merely the README's restatement) travel with the packet, satisfying the
on-seam limb of RFC11-4's mandatory-inclusion rule. The adoption gate the
delta must pass (VIS-3 fresh-reader review, VIS-4's always-human spec
class) is in the loaded `vision.md`, and the verifiability bar the
requirement must meet is in the loaded craft testing policy.

**Index cross-check, with its limit stated.** Every RFC clause the warrant
cites resolves through `05-CONTRACT-INDEX.yaml` into the mandatory or
suggested set; the index's clause row `{id: RFC7-38, module:
RFC-0007/rendering-and-surface.md, kind: phase-rule}` is the projection of
the declaration the on-seam rule consumes, and running this cross-check is
what caught the defining module's absence from the pre-repair draft. The
index's `governance_sources` list was empty when this fixture was first
written (it enumerated packet copies removed in the tracked-home move); the
generator was repointed at the canonical homes later in the same round, so
the projection now carries the doctrine and craft sources and this
cross-check resolves against it. The doctrine and craft selections above
were additionally verified against the files directly (RFC11-15 basis:
the adoption gate names its doctrine file; the verifiability duty names
its owning craft policy).

## Suggested inferred additions (provenance: index adjacency)

RFC-0002 README + `rendering-vocabularies` — the claim/Unknown vocabulary a
requirement's observable outcomes will be stated against, once the delta
specifies rendered states. RFC-0006 — the cross-surface selection semantics
RFC7-16 references, if the authored behaviour includes selection or drawer
disclosure. `craft:review-and-documentation.md` — for the reviewer of the
delta rather than its author. All three are suggested, never mandatory:
loading them would grow an already-waived packet substantially (word costs:
`CONTEXT-BUDGET-REPORT.md` §3), and RFC11-5's mandatory/suggested split
exists exactly so that this pressure never silently promotes or demotes
anything.

## Packet digest

sha256 over the mandatory files concatenated in listed order:
`92b14508b5d71c8d…` (recompute: `cat <mandatory files> | sha256sum`).

**Selection: hand-authored golden selection. Measurement: mechanical.
Compiler implementation: absent.** `scripts/context_load.py` resolves a
path list it is handed and counts words; it has no notion of a task, a
warrant, a risk class, an `applies_to` value, or a dependency edge. The
selection above was made by a human and the trace is the reasoning that
produced it, written down — not a machine's output narrated afterwards.
The `Compiler: context_load.py, selection rules rev10-fixtures` line this
fixture used to carry was removed 2026-08-06: there is no compiler, and
`rev10-fixtures` resolved to nothing anywhere in the repository.

**Digest-source pinning.** This digest and the totals above are computed over
the **canonical-home bytes** as of the last restamp: `doctrine:` resolves to
`.syzygy/governance/doctrine/`, `craft:` to
`.syzygy/governance/policies/craft-and-care/`, `rfcs/` to this package. No
packet copies of doctrine or craft exist under this root any more, so there
is exactly one resolution and no silent source swap. A packet pins the exact
source digests it compiled from precisely so that a later change — a D3
adoption amending `vision.md`, the CC-TEST-2 craft amendment landing in
`testing-and-verification.md`, or any corpus edit — **invalidates this packet
rather than silently changing what it meant**. A stale digest is the correct,
visible outcome; a packet whose contents drift under a fixed digest is not.

## Verification checklist (§15)

- [x] **All mandatory context included** — identity model, both modules of
      the surface contract including its phase-rule clause text (forced by
      the on-seam rule), the adoption gate, and the verification bar
- [x] **Unrelated modules excluded** — every RFC module other than the
      four loaded RFC files is absent (the module population is
      `CONTEXT-BUDGET-REPORT.md` §3's table, not an estimate)
- [x] **Stable output for identical inputs** — same argument list, same
      totals; re-run with arguments reversed returns the same total
- [x] **Budget respected or waiver emitted** — **not respected**: the
      anchored figure is the set's largest breach; waiver emitted above,
      three decomposition options measured and declined with reasons
- [x] **Omissions recorded** — every applicable candidate above is
      enumerated with a reason, including all doctrine files, all craft
      policies, topology, and the `openspec/**` gap
- [ ] **No generated summary replaces exact authority** — *not verifiable by
      the script.* The fixture names files; nothing checks that a consumer
      read the clause rather than an index or its own summary. This fixture
      is the concrete instance of that gap: its pre-repair draft loaded a
      README whose phase-rule text is a restatement pointing elsewhere, and
      no mechanical check caught it. The on-seam rule now states the
      obligation; whether a consumer honors it remains reviewable, not
      checked. See the fixture report's §5.

*Re-measured 2026-08-05b by `scripts/check_governance.py` CG-18, which recomputes the digest and the word count from the declared mandatory set rather than trusting the recorded figures. Previous: 22,258 words, digest `36be8f90fa12a01d…`. Selection unchanged; the movement is contract edits landing under a fixture that had no mechanical freshness check until now.*

*Restructured 2026-08-08 (round-2026-08d): task/answer boundary added per
RD-5's blind-derivation protocol; the on-seam limb of amended
RFC11-4/RFC11-13 stated as the rule forcing the defining module, closing
the fixture-1-vs-8 contradiction; transcribed measurements removed — the
anchored `Measured:` field and the packet digest are the only measurements
this fixture states.*

*Re-measured 2026-11-22 by the same CG-18 method: the U2 contract amendment (orphan predicate; Contradiction adjudication route per D12) edited contract modules this packet loads. Previous: 26,924 words, digest `ef5aa5c5a0914bab…`. Selection unchanged.*
