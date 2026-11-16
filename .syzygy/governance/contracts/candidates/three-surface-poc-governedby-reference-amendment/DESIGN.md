# P-115 funnel and wire design

> **Candidate — binds nothing.** Proposed v1.0; this is a dated preparation
> design, not a readiness verdict, signature or product implementation.
> R1 and R2 remain REVISE. The C4 source-method integration awaits its own
> independent confirmation and separate coordinator readiness receipt.

[Observed] Baseline is 4504514c019ca0ee0cb4a89ed97445a0bad21915. The adopted
POC-REQ-014 requires per-item Unknown values; the runtime P-100 restoration
is a separate lane. A historical duplication cost is motivation, not a claim
about the runtime at this baseline. SEMANTIC-DELTA.md quotes the complete
current and proposed requirement blocks; proposed/spec.md.patch is the
exact replacement in its adopted-file context.

## G0 — baseline and size

[Observed] Five project-shape pillars exist: doctrine under governance/
doctrine (constrains truth/authority); craft policies and in-force spec/impact
policy candidates (constrain acceptance); accepted RFCs (constrain evidence,
identity and surface semantics); candidate topology (informative placement,
not authority); intent/OVERVIEW (presentation, not authority). The adopted POC
changeset and P-100/P-108 sign-off records constrain this amendment. No
bootstrap or candidate-topology adoption is necessary.

[Inferred] Medium: an externally observable machine contract changes across
serialization, consumers, response identity and parity checks. All gates are
explicit; no new subsystem, generic reference engine or reference registry.

## G1 — problem, reader and observable success

[Observed] The owner's 2026-10-15 direction item 2 asks for the identical
`governedBy` Unknown once per observation, with items referencing it. The
machine consumer receives one copy of a value that formerly repeated on
every item. A human still reads each distinct work item's Unknown, complete
served/inside/outside counts and warrant-remediation statement. Success is
lossless expansion with one bounded local hop, not a smaller fact population.
[Unknown] Savings after P-100 restoration and authorized P-115 installation;
this candidate measures no private payload and asserts no current outage.

## G2 — doctrine and governing clauses

[Inferred] Aligned, subject to independent challenge. The material warrants
are declared on POC-REQ-014, not duplicated as a second dependency authority.
The following exact clauses constrain the design:

- VIS-1: “truth wins, and comprehension is bought by simplifying the
  presentation, never the content.” VIS-2: “No evidence means Unknown, not
  success.” VIS-4: “Shape-defining changes always need the owner's sign-off”.
  Source: `.syzygy/governance/doctrine/vision.md`.
- RFC2-24: “Every Unknown claim instance carries exactly one primary reason
  from this list”. Reason 10's route: “Repair the observer/source; new
  snapshot”. Source: contracts/rfcs/RFC-0002/rendering-vocabularies.md.
- RFC6-14 is quoted in full below; its opening, full record and aggregate
  obligations constrain the compatibility assessment. RFC6-15:
  “Same evaluation + same filters ⇒ same answer”. RFC6-18: “one fact set,
  consumed by every surface and by the endpoints”. RFC6-22: equivalence
  is “over semantics and query results, never over pixels”. Source:
  contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md.
- RFC8-22: “A broken join renders; it is never silently skipped.” RFC8-23:
  Unknown-provenance is “first-class, filterable, counted”. Source:
  contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md.
- POC-REQ-060: “No other epistemic value the machine answer serves is in the
  record-shape population.” This limits record-shape coverage to entities
  and relationships; it does not permit losing per-item Unknown claims.
- CC-REV-2: “A change that invalidates any authoritative artifact updates
  every invalidated authoritative artifact in the same logical change”.
  Source: policies/craft-and-care/review-and-documentation.md.

VIS-6's single fact set and VIS-7's determinism remain obligations. This
proposal does not amend the accepted RFCs or security/consent posture.
Broader RFC6-14 freshness, full record and secondary-annotation consequences
remain disclosed Unknown, as the inherited coverage matrix records them.

## RFC6-14 and POC-REQ-060 — contested compatibility assessment

[Observed] RFC6-14 in the accepted monolithic RFC-0006 reads exactly:

**RFC6-14 — Label parity.** Every entity and claim instance in a
machine answer carries its epistemic state **verbatim from the RFC 0002
vocabulary**:

- the label (Observed / Inferred / Unknown);
- the rendering tier (RFC2-25);
- the Unknown reason where applicable (RFC2-24); and
- the freshness state (RFC2-10).

**Secondary Unknown annotations travel with the primary**, verbatim and marked
as secondary (RFC2-24 opens them and closes their vocabulary to the same
twelve); an answer carrying the primary alone has dropped part of the claim
instance's epistemic state.

**An aggregate carries no epistemic state of its own** — no aggregate-level
label, tier, Unknown reason, or freshness state — and carries instead its
members' composition per RFC6-17: RFC 0002 defines those four for claim
instances, not for sets, and a headline label over mixed membership is
VIS-1's named violation ("rendering that region green because its neighbors
are green") whether or not an honest composition is disclosed beside it.

**A machine answer never omits epistemic state**: an answer listing entities
without their labels, or a count that folds Unknowns into a total silently, is
a violation — an agent must be exactly as unable to mistake Unknown for
success as the owner is (VIS-2).

Sibling surface states (*dismissed by decision*, *unadopted draft*, *editorial
draft* — the three RFC2-25 places deliberately outside the registry) travel
with the same fidelity, and so does `challenge-pending` (RFC2-13) — the named
disclosure a claim carries while a submitted, not-yet-admitted challenge
stands against it. It is neither a tier nor an Unknown reason and never
displaces the four values above; it travels **beside** them.


[Observed] Adopted POC-REQ-060 requires: “Every entity and every
relationship the shared model holds SHALL carry its epistemic state in one
record shape, in the shared model and in the machine answer”. Its scope
then says: “No other epistemic value the machine answer serves is in the
record-shape population.” Those entity/relationship records, every existing
per-item Unknown subject record, their identities, labels, tiers where
carried, reasons and routes remain separate and unchanged. The proposed
shared value is only the existing POC-REQ-014 three-field governedBy value;
its literal label is a value used by distinct item claims, never a headline
label on an aggregate. Counts disclose membership, not a pooled subject.

[Inferred, contested] A total one-hop same-body reference carries the same
verbatim semantic value once expanded. RFC6-14 names the required epistemic
state, but specifies no inline wire serialization. RFC6-22 explicitly makes
equivalence semantic. On that reading this representation change needs a
POC-REQ-014 successor and does not invalidate RFC6-14 or POC-REQ-060. That is
the proposed scope classification, not an author-granted interpretation or
exception to accepted contracts. This package cannot claim full RFC6-14
conformance: the inherited POC coverage matrix already leaves broader claim
records, freshness and secondary annotations Unknown, and those gaps remain
Unknown. Sharing a three-field value neither fills nor widens that gap.
No present or future per-item state/disclosure may be discarded to create
artificial equality; a non-identical complete governedBy value is refused.

The independent reviewer must challenge this reading against the actual
clause, including its opening and secondary/aggregate limbs. If “carries”
requires inline copies, or the changed representation needs an explicit
contract companion, this v1.0 POC-only proposal is REVISE/Reject: do not
offer it or silently patch the RFC. Return to source/design and prepare the
required contract semantic delta and owner gate with its full blast radius.
The old disclosed POC coverage gaps grant no new exception. Classification
is contested under VIS-4 and independent review must settle whether this
bounded offer is lawful before owner sign-off is requested.

## G3 — placement and boundaries

[Inferred: proposed] Lives in the existing Three-Surface POC spec, with
proposed same-change proposal/design/coverage/dependency successors. No new
OpenSpec tree or feature family. The six adopted subject files remain
untouched in this branch. Future authorized code work belongs in
packages/three-surface-poc-core and apps/three-surface-poc: preserve the
logical work-item observation and per-item Unknown records; add a wire
projection, validate it, recompute the response/cache identity for the
representation, and update independently written parity readers. No new
Butlers input, provider, daemon, remote reference, generic package or
cross-project dependency is admitted. The P-100 restorer owns its runtime
files; this writer changes no product file and does not pin its mutable code.

## G4 — exact proposed representation and tradeoffs

| Surface | Proposed v1.0 contract | Meaning |
|---|---|---|
| Observed `workItems.governedBy` | Exactly `{label:"Unknown", closedReason:"source-uncaptured-or-unreachable", resolutionRoutes:[{reason:"source-uncaptured-or-unreachable",route:"Repair the observer/source; new snapshot",actor:"operator",verb:"repair",target:"evaluation"}]}` | One complete value, not a claim or aggregate identity |
| Every `workItems.items[i].governedBy` | Exactly `{"ref":"observation"}` | One hop to that item's enclosing workItems result in this body |
| Per-item logical claim | Existing item identity + existing identified observation + evaluation | Separate subject, state and count even when values are equal |
| Observed empty result | One shared value, empty items, measured count zero | No instantiated item claim |
| Unknown work-item result | Existing Unknown result/reason, no invented items/shared value/count | No evidence remains Unknown |
| Invalid representation | HTTP 503, `{served:"nothing",failure:"invalid-governing-intent-reference",resolution:"Repair the governedBy wire encoding; request a new answer",evaluation:<same evaluation>,readiness:false}` | Explicit bounded wire-validation fault, no successful/partial model or replacement count |

JSON in this table uses explanatory unquoted keys; the requirement and JSON
fixtures give exact JSON. [Observed] P-100's adopted POC-REQ-014 normatively specifies the Unknown,
primary reason and RFC2-24 route, not the concrete actor/verb/target field
names. Retained Syzygy implementation context at bd95d039 (work-items.ts
and project-shape-model.ts), corroborated by the coordinator's restored
P-100 receipt, carries a route object with all five fields shown above.
Implementation is evidence of the existing carried value, not authority to
change the contract. [Inferred: proposed] v1.0 explicitly retains that entire
value to satisfy the owner's “identical ... once” direction. Its exact wire
form, including reason/route/actor/verb/target, becomes a proposed normative
requirement only if the owner signs this amendment. Those metadata values
are descriptive routing information, not authorization to perform an
operation; the human warrant-remediation caveat remains required. Converting
the object to a string would drop actionable information and is rejected.

The marker `observation` is a closed discriminant,
not a name to search for. Resolution has no cache and no external I/O. It
binds lexically to the existing identified observation (source revision,
capture instant) and the enclosing answer's evaluation. Resolving an item
detached from its enclosing body is an error, not permission to use another
body. Two bodies may contain the same value, but each must carry its own.

Producer state transition: valid identified observation + identical item
values → validate/encode one shared value and N references → apply existing
response identity and actual final encoded-byte ceiling → conditional success.
Existing authentication precedes the handler. No old-inline/expanded-size
metric replaces the actual carried bytes. Invalid
value/reference → bounded typed refusal before 200 or 304. Existing Unknown
observation → existing Unknown result, without constructing an empty success.
The independent consumer either expands locally and validates all items or
rejects the entire work-item reference representation; it never displays
partial counts or resolves from a previous response. Existing valid facts
on human pages still come from the same logical model; no human reference
resolution or extra click is introduced by this machine-only encoding.

A future value with another reason/state/route is not identical and is not
admitted by this closed v1.0 contract. It needs a future reviewed amendment,
not an added optimistic compatibility arm. The failure identifier is not an
RFC2-24 reason and does not misuse reference-unresolvable, which concerns a
captured source's unresolvable declaration anchor.

[Inferred] Chosen tradeoffs: a short fixed local marker meets the serve-once
motif without JSON-pointer parsing or a global value table. Keep the item
field to preserve explicit membership. Keep distinct epistemic records to
preserve identity. Reject inline/reference dual support: no external
consumer was verified by this candidate, and a second form increases both
validation and ambiguity. The implementation must inventory actual known
consumers before rollout; an independently discovered compatibility need
returns here before adding a mode. The error is a four-constant-field
bounded fault plus the existing evaluation identity, never an unbounded list
of failed item bodies. The explicit resolving action routes the wire fault without minting an
RFC2-24 reason. It changes no adopted resource-limit behavior.

### Protected human experience — design bar

[Inferred: proposed] The least necessary design change is no change to the
valid human flow. Trajectory keeps the same text beside the count, visible
reason/route/warrant remediation, R marked cards, N−R outside count and native
keyboard-accessible narrowing control. No extra reference disclosure,
loading phase, animation, link or lookup step. Unknown keeps POC-REQ-060's
checked-in encoding. Rendering and narrowing remain deterministic from the
same model, and the existing scriptless path remains honest. Invalid wire
consumers give the explicit error instead of an empty/green board; the human
server-rendered model does not acquire a second truth store. Future code QA
must enumerate all rendered markings and test keyboard narrowing on the
unchanged human control; screenshot polish is not a substitute for parity.

## G5 — completeness and independent oracles

[Inferred: proposed] POC-REQ-014 stays an invariant with eight scenarios:
original complete-count/narrowing and title cases, plus distinct claims,
invalid references, observation isolation, identical-value restriction,
observed-empty versus failed observation, and deterministic repetition.
Each has producible input, observable outcome, independent literal oracle
and concrete falsifier. The complete before/after is in SEMANTIC-DELTA.md.

| Risk dimension | Case / expected outcome |
|---|---|
| Success and identity | Independently enumerate N served IDs and per-item claim IDs; one value, N refs, expansion gives the same ordered distinct subjects |
| Membership / narrowing | Enumerate rendered R separately; N=R+(N−R); narrowed board exactly R with unchanged Unknown encoding |
| Unknown / absence | Observed N=0 is a measured empty set; failed observation has no numeric replacement; missing reference is an explicit fault |
| Boundaries | One local hop, no pointers/external lookup/caches/cross-observation borrowing; invalid earlier/later-body use fails |
| Validation | Missing/extra/wrong shared fields, missing/inline/extra-key/wrong references and differing item values all refuse success |
| Determinism / ordering | Repeat identical declared inputs; compare effective values, item order and evaluation/observation, not serving timestamp formatting |
| State / authority | Title containing a requirement remains unwarranted Unknown; no warrant input, link or new source |
| Resource / performance | O(N) fixed references and O(N) independent expansion; existing final encoded-byte ceiling refuses whole answer; no truncation |
| Concurrency / replay | No mutable shared pool or cache; each body independently binds to its enclosing observation/evaluation |
| Privacy / security | Existing authenticated endpoint and content/consent boundaries unchanged; refusal exposes no source/item bodies |
| Compatibility / rollout | A physical API change; update known consumers/cache/parity together only after explicit code authority; no unverified dual mode |
| Accessibility / interruption | Valid human controls, markings and scriptless reading unchanged; no new asynchronous interaction; consumers never turn invalid wire into empty content |

The literal fixture file covers 46 valid/invalid examples; preparation checks
validate the examples independently of product code. Literal expected
identities bind the complete supplied evaluation and provenance/capture pair,
not bare item IDs; independent rendered and outside lists retain multiplicity.
A body-wide exact-complete-value carrier census catches a copy even under an
unrelated key. The positive full-record fixture retains distinct existing
PocEntity, PocRelationship and PocUnknownSubject field shapes, including
prose basis, IDs and provenance: those larger records are not the exact
three-field value carrier and are not pooled. Their complete literal expected
populations reject dropped/changed records without adding a product field.
The retained round-one counterexamples now fail their named predicates.
These are review aids,
not evidence the unimplemented behavior works. Later implementation tests
must import neither the wire encoder nor its resolver into the expected
oracle; mutate each new production predicate and require its own meaningful
failure. The byte-sharing census counts only the defined value carriers,
not incidental repeats of the word Unknown elsewhere in the model.

The generic th-projects authoring checker expects REQ-<spec>-NNN identities.
Native POC-REQ identities are retained under CC-SPEC-3. Its diagnostic is
reported as a format mismatch, not a reason to rename adopted requirements;
the scoped builder independently compares the complete native ID population
and every untouched requirement block.

## G6 — acceptance, ordinary choices and owner boundary

[Inferred] Engineering acceptance: all five patches apply without fuzz only
to their six declared baseline subjects; other requirement blocks and all
inherited coverage rows stay exact; generated dependencies match the proposed
warrant union; report/manifest regenerate; mutation selftests fail for each
bounded preparation predicate. Run governance checks, the generic diagnostic
at this candidate. The coordinator separately owns the full canonical
PROJECT-STATUS battery in a clean clone at its final integrated commit,
reporting exact failures and denominators; it is not run by this writer. No new product
tests or test-suite growth in this candidate. Fresh independent non-author
review is mandatory before any owner offer.

The complete source-method assessment proposes 15 affected, 115 positively
untied and no undecidable requirement occurrences. It distinguishes affected
consumption from text invalidation; only POC014 text changes. All four earlier
compatibility readings are affected-compatible, including both GEN019 broad
PWB convention-preservation limbs. Their two current narrow interfaces remain
preserved, but do not narrow the normative obligation. Full clauses, complete
block bindings/excerpts and per-affected later obligations are retained under
evidence/ and REQUIREMENT-CONSUMPTION.json. These authored judgments await
other-party adequacy/semantic confirmation and create no authority exception.

Ordinary choices settled here: package name, local field spelling, marker,
bounded validation fault, fixtures and reuse of the dependency generator.
No owner question is needed to pick a pointer syntax or code structure.
Genuine gate: the owner may adopt or decline the independently cleared
v1.0 wire change, and separately authorize its exact implementation. No
signature/implementation is inferred from the earlier “approve both”.

[Unknown] Fresh review, actual consumer inventory, installed behavior and
measured savings. Implementation work must include same-change producer/
consumer/cache/parity compatibility and final-byte measurement, preserve all
P-100 Unknown semantics and signed P-108 records, and stop at any new source,
variant or scope need. RECORDING-PREPARATION.md names remaining integration
gates. Sign-off: absent; recommended handoff is independent review, then
coordinator preparation and a bounded owner offer. No owner direction is
written by this author.

## Source-return integration — physical and logical boundaries

[Observed] The sealed source return read all 130 complete BASE450 requirement
occurrences and the complete CC-IMPACT-2..6/CC-REV-2/4 clauses. Its 15 affected
entries include full sinks, every-field/identity/record censuses, broad wire
compatibility, actual final-byte and derived readiness consumers, even when
their normative rules remain valid. The 115 untied entries identify closed,
preserved input/effect populations. The retained exact copies and fresh-clone
replay mapping are in evidence/README.md. Neither the historical reports nor
this author supply a third semantic verdict.

[Observed] Independent synthetic compact-byte witnesses are N=0: 1692→1950,
N=1: 2612→2647 and N=2: 3553→3365. The reference is larger for these small
populations and smaller for the two-item peer. BYTE-REPLAY.json binds the
inert inputs and all 18 threshold expectations. [Inferred] Always measure
actual final encoded bytes. No guaranteed headroom, expanded/old-inline
metric, alternate inline mode or observed-empty exception follows from the
owner's saving motivation. Actual production saving remains Unknown.

[Inferred] Preserve the order: existing credential gate; captured logical
model with no new read; pure closed wire projection/validation; response
identity over the actual carried representation with its existing declared
exclusions; final serialization/byte gate; then any successful conditional
304. A malformed form must fail before revalidation success and cannot use
a prior observation. Do not silently normalize changed carriers out of the
complete-body identity. Response identity is not claim/evaluation identity.

[Inferred] The wire-validation 503's readiness:false belongs only to that
no-model refusal payload. It is neither a PWB006 numeric resource breach nor
a new retained PWB021 readiness arm or PWB022 owner-act invalidity case.
Existing actual-byte breaches still reach PWB021's existing resource arm;
its nine answers and PWB022's 84+2 population stay exact. A design persisting
a new wire-fault readiness predicate needs an explicit PWB021 companion,
not an inferred existing arm. No such design is proposed.

[Inferred] The logical model and human renderer stay unchanged. Independent
machine consumers/parity/sampling oracles expand the local wire to compare
effective facts; human rendering does not consume serialized JSON. POC060's
full-record/encoding/count/Unknown-set oracle remains affected, but its
closed entity/relationship record-shape population excludes the bare shared
value. Distinct full records, identities, prose reasons, provenance and all
route action fields remain; no new schema field or record pooling is needed.
Bounded fixtures and source reading do not prove actual HTTP/failure bounds,
complete product markers, canonical adapters or external consumers.
