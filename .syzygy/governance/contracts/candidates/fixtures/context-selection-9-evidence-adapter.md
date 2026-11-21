# Context-selection fixture 9 — evidence-adapter change (gate provenance and fidelity)

**Status:** DRAFT — a candidate fixture, not part of the rev10 accepted fixture
set (fixtures 1–5). Binds nothing. Written 2026-08-05b to close the coverage
gap recorded at `round-2026-08b/FINAL-CONTEXT-COMPILER-FIXTURE-REPORT.md:81-114`
(*"the evidence-adapter class has no fixture"*), which review RC-6 found and
which this fixture answers rather than restates.

## Task

**Objective.** A governed work item: amend the test/CI/gate observer (RFC4-13)
and its adapter registry entry so a newly integrated external CI provider's
check outcomes can be ingested — declaring the route-2 external-confirmation
capture artifact (RFC4-13(a)), the observer's degradation mapping (RFC4-25),
and the `reduced-fidelity` cause emitted when the provider's run records fall
past the retention horizon (RFC4-24, RFC4-16).

**Warrant.** The named gate observer, its adapter registry entry, the new
external CI provider, and the retention × cause coupling the declaration
spans. **Risk class: authorization-bearing *and* tier-widening.** The
registry entry (RFC4-7), any trusted-external-oracle policy the change
relies on (RFC4-13 route 3), and the retention bound (RFC4-16) are each
honored only under RFC3-16(a). Beyond that, the change can move an outcome
from `report-fact` to `gate-backed` — it can turn something green. The task
performs no owner act, authors no OpenSpec requirement, and does not touch
work-state rendering (fixture 2's class).

---

*Everything above the rule is the task. Everything below is the recorded
answer: a blind derivation (the protocol review RD-5 ran) receives the Task
section and the governed corpus only, derives a selection, and compares it
against what follows — reading no further until its own selection is
written down.*

**What produced this selection: a human, not a compiler.** There is no context
compiler in this repository. `scripts/context_load.py` takes paths already
chosen, counts their words, multiplies by 1.35, and prints a total; it has no
notion of a task, a warrant, a risk class, an `applies_to` value, or a
dependency edge. The selection below is **hand-authored** and the trace that
follows is the reasoning that produced it, written down — not a machine's
output narrated afterwards. This fixture therefore records no `Compiler:` line
and no selection-rule version: `rev10-fixtures` resolves to nothing anywhere in
the repository, and a version identifier that names nothing is worse than none.

**What this packet binds: nothing, yet.** Every RFC module in the mandatory set
below is candidate material pending owner acceptance, carrying its own
*"Absent such a record, this contract binds nothing"* banner. So is the topology
bundle this fixture excludes, and so is `CC-BUDGET-1`, cited below for its
proposed lines. The craft policy is owner-approved (D2) with clause force
beginning at the first acceptance act, and one clause in the mandatory set —
CC-TEST-2 — is itself mid-amendment under act 2. Doctrine is the only adopted
authority here. RFC-0004's package reader map names the failure mode this
class guards: *"the confident adapter — an integration that silently
normalizes, silently interpolates, or silently forgets"*
(`RFC-0004/README.md`).

**Selection trace (the reasoning, stated as reasoning; traversal per
RFC11-14).**

1. The warrant names an observer and its registry entry → RFC-0004. The change
   spans all four planes of that package: what may be emitted at all (module 1),
   the routes (module 2), the envelope rows that decide whether route 1 is
   satisfied (module 3), and the label the change emits (module 4). The package
   README carries content that lives in no module — see the omission register.
2. The tiers the change emits into are RFC-0002's closed registry →
   `rendering-vocabularies` (RFC2-23/24/25) plus the package README, because the
   loaded RFC-0004 modules cite nine RFC2-n clauses whose modules this packet
   does not carry and the README's lookup rule is what resolves them.
3. Route 1's predicate is *"produced by a Syzygy-launched profiled run
   (RFC5-21)"* → `RFC-0005/execution-profiles`.
4. The change edits authorization-bearing artifacts → RFC-0003
   `governance-homes-and-owner-acts` (RFC3-16(a)/(b)/(c)).
5. The rule the change can violate lives in doctrine → `trust-and-evidence.md`,
   which holds the normative statement of the trust floor and the status-claim
   rule *"No evidence means Unknown, not success"*; and `security.md`, whose
   SEC-3 untrusted-actor premise is what makes the four-route predicate
   necessary at all.
6. The craft duty the change is measured against → `testing-and-verification.md`
   (CC-TEST-2), which RFC4-13 quotes at binding strength.

**Phase-boundary rule, applied (RFC11-4 with RFC11-13).** RFC-0004 declares
`implementation_boundary: requires-openspec` naming RFC4-30; its declaration
travels in the loaded README, and the defining module
(`fidelity-joins-and-mappings`) is in the packet on its own merits. RFC-0002
declares RFC2-26 (README loaded; defining module `rendering-vocabularies`
loaded). RFC-0005 and RFC-0003 are selected **without their indexes** — the
departures recorded in the omission register — so, per the amended rule,
their declarations are recorded here verbatim from
`rfcs/RFC-0005/README.md` and `rfcs/RFC-0003/README.md`:
`{kind: requires-openspec, clause: RFC5-27}` and
`{kind: requires-openspec, clause: RFC3-33}`, read at the index bytes the
packet digest below was stamped against. The task is off the OpenSpec seam,
so neither defining module is forced.

## Required context (mandatory, deterministic)

```
scripts/context_load.py rfcs/RFC-0004/README.md \
  rfcs/RFC-0004/general-contract.md rfcs/RFC-0004/named-adapters.md \
  rfcs/RFC-0004/execution-record.md \
  rfcs/RFC-0004/fidelity-joins-and-mappings.md rfcs/RFC-0002/README.md \
  rfcs/RFC-0002/rendering-vocabularies.md rfcs/RFC-0005/execution-profiles.md \
  rfcs/RFC-0003/governance-homes-and-owner-acts.md \
  doctrine:trust-and-evidence.md doctrine:security.md \
  craft:testing-and-verification.md
```

Measured: **30,297 words ≈ 40,901 estimated tokens** (words × 1.35), or
**54,382 estimated tokens** at chars ÷ 4 over 217,530 characters. Both
estimates breach the proposed trigger; the verdict does not depend on which
heuristic is chosen, and the second figure is stated so that it cannot.

## ⚠️ Above the decomposition trigger — disclosed, with a lawful shard named

The anchored figure above is over the **20,000-token** line at which candidate
`CC-BUDGET-1` (`policy-candidates/CRAFT-KNOWLEDGE-HYGIENE-POLICY.md`;
identically the charter §11.4 table — candidate material, binding nothing) calls
for justification or task decomposition; its rank within the fixture set is
computed in `CONTEXT-BUDGET-REPORT.md` §1. Recorded as a disclosure rather
than resolved by trimming: RFC11-5 forbids dropping mandatory context to
improve a number.

| Field | Value |
|---|---|
| **Artifact** | This fixture's mandatory selection (the twelve files in the load command; measured in the anchored field above) |
| **Reason** | The evidence plane is the corpus's widest authorization surface. RFC-0004 gates six clauses across three of its modules under RFC3-16(a) (see `RFC-0004/README.md`), so an authorization-bearing change here needs the whole four-module package, the tier vocabulary it emits into, the profile contract that defines its one self-sufficient route, and the act machinery that makes any of it honored |
| **Scope** | Evidence-adapter changes touching gate provenance (RFC4-13 routes), capture cadence or retention (RFC4-16), or fidelity labels (RFC4-24/25), **where the warrant spans the retention × cause coupling** — i.e. where a `reduced-fidelity` cause depends on a retention-horizon fact. A warrant touching **labels only**, with no RFC4-16 dependency, is **out of scope** and takes the smaller shard instead. Does not cover changes that also touch work-state rendering (fixture 2's class), or that add prose fields to a record, which pulls `RFC-0005/consent-egress-secrets` (scope tightened by RC-12) |
| **Reviewer** | **RC-12, independent reviewer, 2026-08-06.** Ruled `WAIVER SOUND` in `../round-2026-08b/reviews/RC-12-budget-waiver-RAW.md`, over the *selection* — not over the contracts it selects. That review's own verdict was `EXCEPTIONS`; read §5 there on what this signature can and cannot mean while no budget rule is installed |
| **Expiry / revisit trigger** | The **earlier** of (a) the first real evidence-adapter work item, or (b) **owner act 2**. RC-12 holds (b) mandatory rather than optional: CC-TEST-2 is in this packet and is act 2's subject, so every conclusion the packet supports from CC-TEST-2 is provisional until the act lands. Also retired by the two-shard split below if the owner accepts it as the default shape |
| **Decomposition reviewed** | Five alternatives measured (each re-measurable from the load command with the named files removed or added; per-module words: `CONTEXT-BUDGET-REPORT.md` §3). Shard 1 — fidelity/labeling only (modules 1 + 4, tier registry, trust floor) — **lands inside the proposed default band**: a genuine self-contained task covering declared join bases, the closed cause list, the degradation mapping. Shard 2 — tiering and records (modules 1–3, tier registry, profiles, act machinery, doctrine, craft) — still over; its floor is irreducible without dropping the four-route predicate's inputs. Dropping `RFC-0003/governance-homes-and-owner-acts.md` — still over **and** sheds the contract that makes the edited registry entry honored, the shape fixture 2 refuses for the same reason. Dropping `RFC-0002/README.md` — still over, and removes the lookup rule that makes nine cited `RFC2-n` identities resolvable without search. Adding `RFC-0001` to close its dependency edge at module granularity — far above the trigger, for clause citations whose disposition is recorded below |

**The honest finding: a lawful split exists, and only half of it fits.** Unlike
fixture 8, this task shards cleanly into a labeling packet that lands inside the
proposed default band and a tiering packet that does not. Whether the undivided
form or the two-shard form is the default is an owner trade; this fixture shows
the undivided form with the exception stated, and measures the alternative
rather than asserting one does not exist.

## Omitted applicable candidates, with reasons

- **RFC-0002** `snapshot-and-evaluation-core`, `challenge-lifecycle`,
  `reconciliation-chain` — the clauses this change turns on (RFC2-1 item 4,
  RFC2-2, RFC2-4, RFC2-6) are restated at binding strength inside RFC4-13(a)'s
  own clause text, which closes with *"[Inferred — the artifact schema;
  Observed — the immutability and consumption rules it restates from
  RFC2-1/2/6]"*. That is carriage, not citation. RFC2-17/2-19/2-20 govern
  substrate translation, observation passes, and merge-fact provenance, each
  restated inline where a loaded clause relies on it (e.g. RFC4-11: *"A merge
  fact comes only from this adapter — never inferred from scheduler closure
  (RFC2-20)"*). Challenge and reconciliation semantics are untouched.
  Suggested below, with the trigger.
- **RFC-0005** `admission-and-boundary`, `consent-egress-secrets` — no client
  admission, consent class, or egress route changes. RFC5-17's prose-field
  storage authority is cited by RFC4-19's optional prose row, which this change
  does not add; if it did, `consent-egress-secrets` becomes mandatory.
  (`admission-and-boundary` also defines RFC5-27; the declaration is recorded
  in the applied-rule paragraph above, and this off-seam task does not force
  the module.)
- **RFC-0003** `manifests-and-namespace` — physical schema and namespace, not
  the act predicate (it defines RFC3-33; declaration recorded above, module
  not forced off-seam). `RFC-0003/README.md` — deliberately **not** loaded,
  departing from fixtures 2, 4, 5 and 6: the loaded module's own front matter
  resolves every `RFC3-n` deterministically (*"every other RFC3-n lives in
  manifests-and-namespace.md"*), so the package index would add words and
  no lookup the packet lacks; the implementation-boundary declaration it
  carries is recorded verbatim in the applied-rule paragraph, as the amended
  RFC11-4 requires of an index-less selection.
- **RFC-0001** — the one open declared dependency; disposition below under
  *Dependency closure*, not here, because it is a disclosure rather than a
  dismissal.
- **RFC-0006/0007/0009** — surfaces render tiers; they do not mint them. The
  rendering obligations bind the surface implementer downstream of this change.
- **RFC-0008** — the normalized work-state mapping is explicitly *"RFC 0008's;
  this adapter's duty ends at faithful, capture-stamped transmission"*
  (RFC4-15). Fixture 2 is that task; this one is its complement.
- **RFC-0010/0011** — no mission, and no packet compilation, in this task.
- **doctrine** `vision.md` — the rules the loaded contracts take from it
  (VIS-1's ordering, VIS-2's *no evidence means Unknown*, VIS-7's identity test)
  are stated in rule-text form inside the loaded `trust-and-evidence.md`, which
  declares itself the *"normative statement of the trust floor"* and carries
  *"No evidence means Unknown, not success"* verbatim. VIS-5/VIS-6 govern write
  surfaces; a gate observer's write surface is empty under RFC4-2 item 7. The
  rule this fixture applies, and applies uniformly: **doctrine travels when a
  loaded contract relies on a rule whose normative statement no loaded artifact
  carries.** `architecture.md` — the closed snapshot rule and the identity test
  are carried by RFC4-8(b) and by the trust floor's first bullet; the loop and
  temporal model are not amended. `v1.md` — the V0 boundary the change stops at
  (*Syzygy reads reports; it does not run them*) is SEC-3's, and `security.md`
  is loaded. `README.md` — doctrine's index and amendment log; no doctrine
  amendment occurs here. **Every doctrine file is loaded or named here.**
- **craft** — `agent-provenance-and-execution-evidence.md` owns CC-PROV-1's
  capture requirement and CC-PROV-4's report-fact rendering duty; CC-TEST-2's
  own text carries the capture requirement's substance (*"a gate artifact
  additionally meets CC-PROV-1's capture requirement: it is captured by an
  observer distinct from the emitter"*), and CC-PROV-4 binds the surface that
  renders the tier, downstream of this change. Suggested below — the closest
  call in this selection. `security-and-secrets.md` — SEC-5 screening is applied
  by the code-structure observer (RFC4-12) and by prose fields (RFC4-19, optional),
  neither in scope. `engineering-bar`, `interfaces-and-dependencies`,
  `observability-and-operations`, `performance-and-visual-discipline`,
  `review-and-documentation` — no declared floor of theirs is the classifier of
  this change. **Every craft policy is loaded or named here.**
- **Topology bundle** (`.syzygy/map/topology-candidates/**`) — candidate
  material that binds nothing; no placement changes. Named so the absence is a
  decision.
- **`history/**`, `_bootstrap/**`** — historical lane, never a default reading
  path, never authority.

## Why no applicable constraint was lost

The four-route provenance predicate and both its supporting artifacts
(RFC4-13, 13(a), 13(b)), the registry and declaration set the change edits
(RFC4-2, RFC4-7), the envelope rows that decide whether route 1 is even
available (RFC4-19's profile-identity and policy-violation rows), the closed
`reduced-fidelity` cause list the change emits from (RFC4-24), the tier registry
those labels enter (RFC2-25) with its Unknown reasons and failure states
(RFC2-24, RFC2-23), the profiled run that defines route 1 (RFC5-21), the act
predicate that makes the edited artifacts honored (RFC3-16(a)/(b)/(c)), the
doctrine floor the change can violate (the trust floor and the status-claim
rule), the untrusted-actor premise (SEC-3), and the craft clause the contract
quotes (CC-TEST-2) are all mandatory-loaded. Every selected contract's
implementation-boundary declaration is in the packet or recorded verbatim in
the applied-rule paragraph above — no loaded contract's boundary rule is
missing.

**One clause in the mandatory set is pending, and the packet says so inside the
selection rather than only beside it.** CC-TEST-2 is the subject of act 2; the
amendment's digest lives in `craft-and-care/INSTALL-RECORD.md`. Until that act,
the clause text in the packet is the pre-amendment text, and any conclusion this
task draws from CC-TEST-2 is provisional on it — an RFC11-6 staleness
disclosure, not a footnote.

**Dependency closure, checked and not fully closed.** The termination rule
this fixture first declared is now the contract's own: **RFC11-14 rule 2**
(round-2026-08d lifted it from this fixture verbatim) — *direct `depends_on`
edges of every loaded module, satisfied by loading at least one module of the
depended-on contract; where an edge is left unsatisfied, the cited clauses
are enumerated and disposed of individually in the omission register.* Under
that rule, four of five edges close — RFC-0002, RFC-0003, RFC-0004 and
RFC-0005 each have at least one module in the packet. **RFC-0001 does not,
and eight of the nine loaded modules declare it.** Its twelve cited clause
identities:

| Clause | Where the packet answers it |
|---|---|
| RFC1-5 | The obligation is *delegated to* this package and discharged inside RFC4-12; also cited in RFC-0003's integration prose |
| RFC1-11 | Restated inside RFC4-12: the observer *"lets the kernel's successor machinery render the change (RFC1-11) — it never silently re-binds an identity by similarity"* |
| RFC1-15 | Restated inside RFC4-10: OpenSpec identity survival is *"[Unknown] (RFC1-15)"*, and the adapter's declared stability class is the response |
| RFC1-16 | Restated inside RFC4-26: the four capability↔code relation classes are named and kept distinct in the clause itself |
| RFC1-26 | Restated inside RFC2-24 reason #11's own row (broken anchors) |
| RFC1-6, RFC1-9, RFC1-18(b), RFC1-23, RFC1-25, RFC1-27, RFC1-29 | Appear only in §5 Integration and §6 Alternatives prose of loaded modules — a citation, not a reliance |

**Not carried, and disclosed as such:** the kernel's own text for any of the
above. Three triggers promote RFC-0001 to mandatory and none is in this
warrant — a change to code-element identity minting (RFC4-12's scheme), to the
materialization/warrant join (RFC4-17, RFC1-29), or to Execution Record run
identity (RFC4-19's `derived` origin, RFC1-5's licence). If the warrant grows to
include one, this packet is incomplete under RFC11-6 and the run does not launch
on it. Loading RFC-0001 to close the edge mechanically was measured and is far
above the trigger (see the decomposition row above).

**Limit of the index cross-check, stated (RFC11-15).** Every RFC clause
resolves through `05-CONTRACT-INDEX.yaml`. The doctrine and craft selections
cannot be cross-checked that way: `governance_sources` rows carry no clause
rows, no `governs`, no `applies_to`, and their `rule_ids` are a mention scan,
so VIS-2 resolves to several files of which one is authoritative. RFC11-15
therefore applies: those two selections are stated as judgment under the
declared rule ("doctrine travels when a loaded contract relies on a rule
whose normative statement no loaded artifact carries"), verified by reading
the files, and **not claimed deterministic**.

## Suggested inferred additions (provenance: index adjacency and declared edges)

- `RFC-0002/snapshot-and-evaluation-core.md` — RFC2-1/2-2/2-4/2-6 in
  their own words, the moment the change alters **what a snapshot must contain**
  rather than what the adapter must capture.
- `craft:agent-provenance-and-execution-evidence.md` — CC-PROV-1 and
  CC-PROV-4 for the reviewer of this change, and mandatory if the change extends
  to how Execution Records carry agent provenance.
- `RFC-0001-project-graph-identity-state-planes.md` — under any of the
  three triggers named above.
- `RFC-0005/consent-egress-secrets.md` — if the change adds prose
  fields to a record (RFC5-17, SEC-5 screening).
- `RFC-0008/state-vocabulary-and-cost.md` — if the same work item also
  touches how the ingested facts render as work state; that is fixture 2's task,
  and keeping it suggested is what keeps the two fixtures distinct.

Word costs for every module are in `CONTEXT-BUDGET-REPORT.md` §3.
Suggestion never suppresses (RFC11-5): none of these was demoted to fit the
budget, and the packet is already over it, so nothing was gained by omitting
them.

## Packet digest

sha256 over the mandatory files concatenated in listed order:
`450afc1645b91138…` (recompute: `cat <mandatory files> | sha256sum`, with
`doctrine:` resolved to `.syzygy/governance/doctrine/` and `craft:` to
`.syzygy/governance/policies/craft-and-care/`). Measured, not compiled, by
`scripts/context_load.py`.

**Selection: hand-authored golden selection. Measurement: mechanical.
Compiler implementation: absent.** `scripts/context_load.py` resolves a
path list it is handed and counts words; it has no notion of a task, a
warrant, a risk class, an `applies_to` value, or a dependency edge. The
selection above was made by a human and the trace is the reasoning that
produced it, written down — not a machine's output narrated afterwards.

**Digest-source pinning.** This digest and the totals above are computed over
the canonical-home bytes. No packet copies of doctrine or craft exist under this
root, so there is exactly one resolution and no silent source swap. The digest
exists so that a later change — act 2 landing CC-TEST-2's amendment in
`testing-and-verification.md`, an acceptance act binding the RFC modules, or
any corpus edit — **invalidates this packet rather than silently changing what
it meant**. A stale digest is the correct, visible outcome;
`check_governance.py` CG-18 recomputes it from the declared mandatory set on
every run, so staleness is detected rather than trusted.

## Verification checklist (§15)

- [x] **All mandatory context included** — for the warrant as stated, with the
      RFC-0001 edge disclosed as open and its promotion triggers named. If the
      warrant grows to any of those triggers, this item becomes *not* satisfied
      and the run blocks under RFC11-6.
- [x] **Unrelated modules excluded** — every RFC module other than the nine
      loaded RFC files is absent (the module population is
      `CONTEXT-BUDGET-REPORT.md` §3's table, not an estimate)
- [x] **Stable output for identical inputs** — same argument list, same totals;
      the totals are order-independent, the digest is not, so the listed order
      is part of the declaration
- [x] **Budget respected or waiver emitted** — **not respected**: the anchored
      figures breach the proposed trigger under both heuristics; justification
      emitted above, five alternatives measured, one lawful shard identified
      as landing inside the proposed default band
- [x] **Omissions recorded** — every RFC, every doctrine file, every craft
      policy, the topology bundle and the historical lane are loaded or named
      with a reason
- [ ] **No generated summary replaces exact authority** — *not verifiable by any
      script here.* The fixture names files; nothing checks that a consumer read
      the clause rather than an index or its own summary. This packet loads two
      package READMEs, and the reason each is loaded is stated as content it
      uniquely carries, not as a substitute for the modules it indexes — but
      that claim is reviewable, not checked.
- [ ] **Selection produced deterministically** — *false by construction.* No
      selector exists; the set above is human judgment. This item is listed and
      left unchecked so the fixture set stops implying otherwise.

*First measured 2026-08-05b by `scripts/context_load.py` and verified by
`scripts/check_governance.py` CG-18, which recomputes the digest and the word
count from the declared mandatory set rather than trusting the recorded figures.
No previous figures exist: this fixture is new.*

*Restructured 2026-08-08 (round-2026-08d): task/answer boundary added per
RD-5's blind-derivation protocol; the termination rule this fixture first
declared now lives in RFC11-14 rule 2 and is cited from there; the
index-less RFC-0005/RFC-0003 selections now record their
implementation-boundary declarations verbatim per amended RFC11-4;
transcribed measurements removed — the two anchored measurement fields and
the packet digest are the only measurements this fixture states.*

---

*Re-measured 2026-08-10 by the same CG-18 method (declared mandatory set, listed order): the round-2026-08e RD-26 repair batch edited Wave A modules this packet loads. Previous: 25,466 words, digest `781b1ec3733698b9…`. Selection unchanged; the movement is contract repairs landing under the fixture, which is the class this check exists to catch.*
