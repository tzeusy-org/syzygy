# Semantic delta P-115 — one governedBy value per observation

> **Candidate — binds nothing.** Version 1.0; drafted 2026-10-21. No owner
> signature, act, installation or implementation authorization is recorded by
> this package. Rounds one and two returned REVISE. This candidate integrates
> the separately sealed CC-REV-4 source return; no confirmation is carried
> forward and no third semantic verdict is supplied here.

**Artifacts:** the six subjects under
`openspec/changes/three-surface-poc-experience/`, as named in the sibling
manifest. Five proposed unified patches; `.openspec.yaml` stays identical.
**Stable ID affected:** POC-REQ-014, amended in place. No ID minted, retired
or renumbered; POC-REQ-060 remains byte-identical.
**Change class:** Normative — the machine wire contract changes.
**Author:** OpenAI Codex, candidate writer for syzygy-318o.
**Date:** 2026-10-21.

## Current meaning — exact POC-REQ-014 text

[Observed] The adopted subject at baseline
`4504514c019ca0ee0cb4a89ed97445a0bad21915` reads:

````markdown
### Requirement: POC-REQ-014 — Every work item's governing intent renders as a counted Unknown

Group: Work-item observation. Form: **invariant**.

**Required behavior.** Every served work item SHALL carry a governing-intent
field (`governedBy`) whose value is `Unknown` with the primary reason
`source-uncaptured-or-unreachable` and that reason's RFC2-24 resolution
route. Both channels SHALL serve how many served items carry that Unknown,
over the served item set. Trajectory SHALL show that count beside how many of
those items its rendered selection (POC-REQ-042) holds and how many fall
outside it, SHALL state beside the count the reason, its route and that an
item is resolved by supplying its warrant, SHALL mark each item it renders,
and SHALL let a reader narrow the board to the marked items. No served item's
`governedBy` SHALL name an identifier taken from its title. Every item
Trajectory renders SHALL render its governing intent with the encoding the
declared table of POC-REQ-060 gives Unknown, never with an encoding for a
warranted, green or complete state.

- **Scope.** every served work item in the machine answer, and on Trajectory
  every item its rendered selection holds; items outside that selection are
  counted on Trajectory, not rendered, as POC-REQ-042 permits. This
  requirement admits no work-item column and no other input: the projection
  stays as POC-REQ-010 to POC-REQ-013 bound it. It defines no edge. An edge
  to a warrant, and the input that would carry one, need a further
  amendment. It makes no claim about orphaned work: the POC detects none, so
  how this Unknown sits beside an orphaned-work Contradiction (RFC8-23: the
  Contradiction governs) is left to the amendment that specifies orphaned-work
  detection.

- **Case (sweep + counterexample schema)**: a checker enumerates every served
  work item from the machine answer — the denominator is the complete served
  item set (POC-REQ-011) — and reads each item's `governedBy`. It then
  enumerates every item Trajectory renders — the second denominator is the
  rendered selection — before and after narrowing the board. Separately, the
  checker supplies a fixture work-item database (or an injected work-item
  read) holding one item whose title names a requirement identifier, for
  example "Implement POC-REQ-010", and observes that item.
- **Observable**: each served item's `governedBy` value, reason and route;
  the served Unknown count and item count on both channels; on Trajectory,
  the count with its inside and outside figures, the text beside the count,
  each rendered item's governing-intent encoding, and the items the board
  shows once narrowed.
- **Oracle**: decided by equality, set membership and literal match.
  - Every enumerated served item's `governedBy` is `Unknown` with the reason
    `source-uncaptured-or-unreachable` and the route RFC2-24 gives that
    reason; the served Unknown count equals the enumerated item count, and
    the two channels serve the same count.
  - On Trajectory, the count equals that enumerated count; its inside figure
    equals the number of rendered items the checker enumerated, and inside
    plus outside equals the count.
  - Read as text alone, the region holding the count contains the reason
    name and its RFC2-24 route literally, and the word "warrant" in a
    statement that supplying it resolves an item.
  - Every rendered item's governing-intent encoding equals the encoding the
    declared table of POC-REQ-060 gives Unknown, and none carries an
    encoding the table gives any other state.
  - The narrowed board lists exactly the items the un-narrowed board
    renders, since every one carries the Unknown.
  - The fixture item's `governedBy` is that same Unknown, naming no
    identifier.
- **Oracle independence**: both denominators are the checker's own
  enumerations, not served counts; the reason and its route are read from
  RFC2-24; the expected encoding is POC-REQ-060's checked-in table; the
  fixture title is the checker's own.
- **Falsifier**: a served item with no `governedBy`; a `governedBy` holding
  anything other than that Unknown, including an identifier from its title;
  any other reason, or a route that is not RFC2-24's route for this reason;
  a count that does not equal the enumeration or differs between the
  channels; inside and outside figures that do not reconcile with the
  rendered selection and the count; a count region missing the reason, the
  route or the resolution statement; a rendered item without the Unknown
  encoding, or with an encoding for a warranted, green or complete state; or
  a narrowed board that drops or adds an item.

#### Scenario: Every item's governing intent is Unknown

- **WHEN** the machine answer serves N work items and Trajectory renders a
  selection of R of them (POC-REQ-042)
- **THEN** both channels serve N of N with `governedBy` Unknown for the
  reason `source-uncaptured-or-unreachable` and its route, and Trajectory
  shows N with R inside its selection and N − R outside, states the reason,
  its route and that each item is resolved by supplying its warrant, marks
  all R items it renders with the Unknown encoding, and once narrowed still
  lists the same R

#### Scenario: A title names a requirement

- **WHEN** a served item's title reads "Implement POC-REQ-010"
- **THEN** that item's `governedBy` is the same Unknown, and nothing served
  for it names POC-REQ-010 as its governing intent

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2, VIS-6]
  contracts: [RFC2-24, RFC4-15, RFC8-22, RFC8-23, RFC8-24]
  policies: []
  decisions: []
  topology: []
  parent_requirements: []
```

````

## Proposed meaning — exact replacement text

[Inferred: proposed] Only this requirement block changes:

````markdown
### Requirement: POC-REQ-014 — Every work item's governing intent renders as a counted Unknown

Group: Work-item observation. Form: **invariant**.

**Required behavior.** Every served work item SHALL carry a governing-intent
field (`governedBy`) whose effective value, after the observation-local
reference below is expanded, is `Unknown` with the primary reason
`source-uncaptured-or-unreachable` and that reason's RFC2-24 resolution
route. The machine answer SHALL serve that identical complete value once
per identified work-item observation, with each item referencing it. Both
channels SHALL serve how many served items carry that Unknown,
over the served item set. Trajectory SHALL show that count beside how many of
those items its rendered selection (POC-REQ-042) holds and how many fall
outside it, SHALL state beside the count the reason, its route and that an
item is resolved by supplying its warrant, SHALL mark each item it renders,
and SHALL let a reader narrow the board to the marked items. No served item's
`governedBy` SHALL name an identifier taken from its title. Every item
Trajectory renders SHALL render its governing intent with the encoding the
declared table of POC-REQ-060 gives Unknown, never with an encoding for a
warranted, green or complete state.

- **Machine-wire contract.** In an observed `workItems` result, the single
  shared value SHALL be `workItems.governedBy`, exactly
  `{"label":"Unknown","closedReason":"source-uncaptured-or-unreachable","resolutionRoutes":[{"reason":"source-uncaptured-or-unreachable","route":"Repair the observer/source; new snapshot","actor":"operator","verb":"repair","target":"evaluation"}]}`.
  The route object's `reason`, literal `route` and action metadata
  (`actor: "operator"`, `verb: "repair"`, `target: "evaluation"`) SHALL all
  be retained; none may be dropped to make values compare equal. Carrying
  action metadata authorizes no operation and does not replace the required
  statement that supplying its warrant resolves an item.
  Every element of `workItems.items` SHALL carry `governedBy` exactly
  `{"ref":"observation"}`. This one-key object is a closed reference form:
  it means only the `governedBy` value of its own enclosing `workItems`
  observation in this same machine-answer body. It is not a URI, JSON
  pointer, claim identifier or reference to another item. The observation
  retains its existing source revision and capture instant, and the answer
  retains its evaluation identity. Resolution SHALL take one local hop,
  require no lookup or cache, and neither borrow a value from another body
  or observation nor fall back to an inline, previous or default value.
  There SHALL be one shared value, no per-item copy of that value and no
  second reference form. Unknown subject/claim identities, including any
  separately served per-item epistemic records, SHALL remain distinct;
  this shared value is not an aggregate claim and creates no new identity.
  This requirement pools only this identical three-field value; it SHALL
  NOT pool entity or relationship records, or differently valued claims.
- **Validation and failure.** A producer SHALL validate this closed form
  before serving a successful machine answer, including before responding
  with a cache revalidation success. A missing, malformed or differently
  valued shared value; a missing, inline, extra-key or otherwise nonliteral
  item reference; a reference that would require a recursive, external or
  cross-observation lookup; or a per-item effective value that differs from
  the complete shared value SHALL prevent a successful machine answer.
  The endpoint SHALL instead return HTTP 503 with a bounded JSON failure
  carrying `served: "nothing"`, `failure:
  "invalid-governing-intent-reference"`, `resolution: "Repair the governedBy wire encoding; request a new answer"`,
  the unchanged evaluation identity, and `readiness: false`; it SHALL serve no success-shaped model, partial
  item population or numeric replacement counts. This failure identifier
  is a wire-validation fault, not a new RFC2-24 Unknown reason. A consumer
  encountering an invalid form SHALL reject it with that explicit fault
  and SHALL NOT derive claims or totals from it. Unknown is never replaced
  by Observed, green, a zero, a guessed warrant or a value from another
  observation. A valid, explicitly observed empty item set still carries
  the one shared value and a measured count of zero; it instantiates no
  governing-intent claims. A failed/Unknown work-item observation SHALL
  retain its existing Unknown result and reason, without a fabricated
  shared value, item set or zero count. The original resource ceilings,
  authentication and response-limit refusal remain in force.
- **Scope.** every served work item in the machine answer, and on Trajectory
  every item its rendered selection holds; items outside that selection are
  counted on Trajectory, not rendered, as POC-REQ-042 permits. This
  requirement admits no work-item column and no other input: the projection
  stays as POC-REQ-010 to POC-REQ-013 bound it. It defines no edge. An edge
  to a warrant, and the input that would carry one, need a further
  amendment. It makes no claim about orphaned work: the POC detects none, so
  how this Unknown sits beside an orphaned-work Contradiction (RFC8-23: the
  Contradiction governs) is left to the amendment that specifies orphaned-work
  detection.

- **Case (sweep + counterexample schema)**: a checker enumerates every served
  work item from the machine answer — the denominator is the complete served
  item set (POC-REQ-011) — and expands each item's `governedBy` from only
  its enclosing observation. It checks the exact shared value/reference
  shapes, independently keys every effective claim by the evaluation,
  observation pair and existing item identity, and reads its state, reason
  and route. It then
  enumerates every item Trajectory renders — the second denominator is the
  rendered selection — before and after narrowing the board. Separately, the
  checker supplies a fixture work-item database (or an injected work-item
  read) holding one item whose title names a requirement identifier, for
  example "Implement POC-REQ-010", and observes that item. Independently
  constructed wire fixtures exercise empty/one/many items, distinct item
  identities with equal values, different rendered selections, failed
  observation, two observations and repeated identical inputs. Separate
  fixtures remove or alter each required shared field, alter/remove/add to
  the reference, insert an inline/recursive/external/cross-observation
  reference, supply a differing item value, and try to reuse a previously
  valid observation after its successor's shared value is removed.
- **Observable**: the single shared value, each item's reference and its
  effective `governedBy` value, reason and route; the HTTP status and typed
  failure for an invalid form;
  the served Unknown count and item count on both channels; on Trajectory,
  the count with its inside and outside figures, the text beside the count,
  each rendered item's governing-intent encoding, and the items the board
  shows once narrowed.
- **Oracle**: decided by equality, set membership and literal match.
  - Exactly one shared value has the literal three-field shape above and
    every item has the literal one-key reference above. One local expansion
    per item yields one effective claim for that same item and observation;
    distinct item identities stay distinct. No other body contributes a
    value, including when an earlier body was valid. The expansion changes
    no served item identity, membership, observation or evaluation.
  - Every enumerated served item's effective `governedBy` is `Unknown` with the reason
    `source-uncaptured-or-unreachable` and the route RFC2-24 gives that
    reason; the served Unknown count equals the enumerated item count, and
    the two channels serve the same count.
  - On Trajectory, the count equals that enumerated count; its inside figure
    equals the number of rendered items the checker enumerated, and inside
    plus outside equals the count.
  - Read as text alone, the region holding the count contains the reason
    name and its RFC2-24 route literally, and the word "warrant" in a
    statement that supplying it resolves an item.
  - Every rendered item's governing-intent encoding equals the encoding the
    declared table of POC-REQ-060 gives Unknown, and none carries an
    encoding the table gives any other state.
  - The narrowed board lists exactly the items the un-narrowed board
    renders, since every one carries the Unknown.
  - The fixture item's effective `governedBy` is that same Unknown, naming
    no identifier. Repeated identical declared inputs produce the same
    reference/value facts and membership; expansion preserves their order.
  - Every invalid-form producer fixture returns the specified HTTP 503
    failure with its own evaluation and no success model/counts; a consumer
    rejects the same fixture explicitly. In particular a missing value in
    a second observation cannot resolve using a first observation's value.
    A non-identical value is refused, never coerced or pooled. For a valid
    empty observation the enumerated count is zero, with no claim instances;
    a failed observation remains Unknown and has no numeric count.
- **Oracle independence**: both denominators are the checker's own
  enumerations, not served counts; the reason and its route are read from
  RFC2-24; the expected encoding is POC-REQ-060's checked-in table; the
  fixture title and invalid wire inputs are the checker's own; the
  reference expander is independently written from this closed contract,
  imports no producer/serializer/model helper and uses literal expected
  values, subject sets, counts and failure outcomes. The checker enumerates
  separately served per-item epistemic identities and confirms they have
  not been merged. It checks the wire occurrence/shape population rather
  than trusting a served claim that the value is shared once.
- **Falsifier**: any duplicate/inline complete value, nonliteral reference,
  dangling/mismatched/cross-observation resolution or silent fallback; a
  successful response to an invalid form; a dropped/merged subject, changed
  evaluation/observation or reduced served population; a failed observation
  converted to an empty one; or a served item with no `governedBy`; a `governedBy` holding
  anything other than that Unknown, including an identifier from its title;
  any other reason, or a route that is not RFC2-24's route for this reason;
  a count that does not equal the enumeration or differs between the
  channels; inside and outside figures that do not reconcile with the
  rendered selection and the count; a count region missing the reason, the
  route or the resolution statement; a rendered item without the Unknown
  encoding, or with an encoding for a warranted, green or complete state; or
  a narrowed board that drops or adds an item.

#### Scenario: Every item's governing intent is Unknown

- **WHEN** the machine answer serves N work items and Trajectory renders a
  selection of R of them (POC-REQ-042)
- **THEN** both channels serve N of N with `governedBy` Unknown for the
  reason `source-uncaptured-or-unreachable` and its route, and Trajectory
  shows N with R inside its selection and N − R outside, states the reason,
  its route and that each item is resolved by supplying its warrant, marks
  all R items it renders with the Unknown encoding, and once narrowed still
  lists the same R

#### Scenario: One value, separate item claims

- **WHEN** one observed work-item result serves items A and B in the same
  evaluation and identified observation, and Trajectory renders only A
- **THEN** the machine body carries one complete shared Unknown and exactly
  one local reference for each item, expansion yields distinct A and B
  Unknown claims, both channels count two, Trajectory reports one inside
  and one outside and still renders A with the original Unknown treatment

#### Scenario: Invalid references fail explicitly

- **WHEN** a producer would serialize a missing/altered shared value or an
  absent, inline, extra-key, recursive, external or otherwise nonliteral
  item reference, or a consumer receives such a body
- **THEN** the producer returns the specified bounded HTTP 503 failure
  before any success or cache-revalidation answer, and the consumer rejects
  that body explicitly without claims, partial populations, totals or
  optimistic fallback

#### Scenario: Observations cannot lend values to each other

- **WHEN** observation A has a valid shared value and a later observation B
  has item references but no valid shared value of its own, even if their
  source revisions coincide or a client still holds A
- **THEN** B fails explicitly with B's evaluation and never resolves its
  items using A's value; a valid B resolves only within B

#### Scenario: Only identical complete values are shareable

- **WHEN** any proposed item value differs in label, reason, route or field
  set from the literal shared Unknown, even if another item's value matches
- **THEN** serialization is refused by the specified typed failure; no
  value is selected, overwritten, normalized or optimistically reused

#### Scenario: Observed empty is distinct from an Unknown observation

- **WHEN** a completed identified observation explicitly contains no items,
  and a separate fixture instead fails to observe the work-item set
- **THEN** the first serves one shared value, an empty items list and zero
  measured item/Unknown counts without any item claim, while the failed
  fixture retains its Unknown result/reason and supplies no empty population
  or replacement zero

#### Scenario: Repetition preserves effective facts

- **WHEN** the same declared observation inputs are serialized twice and
  independently expanded, and its rendered selection is narrowed
- **THEN** both expanded answers have identical ordered item identities,
  effective state/reason/route, observation and evaluation; every served
  count and the rendered/inside/outside populations reconcile as above, and
  the narrowed board contains exactly its original rendered Unknown items

#### Scenario: A title names a requirement

- **WHEN** a served item's title reads "Implement POC-REQ-010"
- **THEN** that item's `governedBy` is the same Unknown, and nothing served
  for it names POC-REQ-010 as its governing intent

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2, VIS-6, VIS-7]
  contracts: [RFC2-24, RFC4-15, RFC6-14, RFC6-15, RFC6-18, RFC6-22, RFC6-23, RFC8-22, RFC8-23, RFC8-24]
  policies: []
  decisions: [OWNER-DIRECTION-MACHINE-CEILING-2026-10-15]
  topology: []
  parent_requirements: []
```

````

## What explicitly does not change

All other requirement blocks, including POC-REQ-010/011/013/020/042/060,
remain byte-identical. The complete served set, rendered subset and outside
count; every item's subject/claim identity, state/reason/route and warrant
caveat; declared Unknown encoding; narrowed-board membership; source revision,
capture instant and evaluation; authenticated single-project scope; inputs,
consent, security, retention and resource ceilings remain required. No new
warrant link, title-derived intent, column, reason, tier, record population,
provider or external lookup is admitted. The spec/proposal/design/coverage/
dependency successors are one coherent same-change amendment, not permission
to edit earlier signed manifests, patches, acts or raw reviews.

## Warrant

[Observed] `OWNER-DIRECTION-MACHINE-CEILING-2026-10-15`, item 2, says:
“Draft a POC-REQ-014 amendment that serves the identical governedBy Unknown
once per observation, with items referencing it.” The same plain direction
signs nothing and authorizes no implementation. The later approval of P-110
and P-114 names neither a P-115 signature nor P-115 implementation.
VIS-1/2/4/6/7, RFC2-24, RFC6-14/15/18/22/23 and RFC8-22/23/24 constrain this
proposal; quoted governing clauses and funnel decisions are in DESIGN.md.

## Evidence or decision basis

[Observed] The baseline adopted POC subjects include the signed P-100
POC-REQ-014 and P-108 POC-REQ-060 texts. Their sign-off records live under
`decisions/THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md` and
`decisions/THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md`.
[Observed as relayed by the coordinator] At baseline 4504514c, P-100 runtime
has been reverted and a separate authorized lane is restoring it. The
private machine response was measured at 5,276,099 bytes of 16,777,216, with
9,327 served items and 250 rendered items. Those are coordinator receipts,
not measurements made by this writer. This candidate alleges no current
outage or current duplicate governedBy runtime field. The older ~2 MB saving
is a historical estimate in the owner's direction, not a new measurement.
[Unknown] Exact saving and live behavior after restoration and P-115
implementation; no private response or observed repository body was read.

## Terms introduced / retired

No doctrine term, stable claim identity, Unknown reason or graph edge is
introduced or retired. The closed wire discriminant `ref: "observation"`
and fault identifier `invalid-governing-intent-reference` are local protocol
spelling, fully defined in the replacement requirement, not generic reference
or epistemic vocabularies.

## Downstream impact

IMPACT-LEDGER.md, the block-bound REQUIREMENT-CONSUMPTION.json and generated
IMPACT-SWEEP.json enumerate the subject, reverse-spec and tracked-citer
sweeps, semantic classifications and unknowns. The complete source-method
successor proposes 15 affected / 115 positively untied / 0 undecidable
occurrences, with affectedness separate from normative text invalidation.
Only POC014 text changes; fourteen affected-compatible blocks remain exact.
ROUND-1-DISPOSITIONS.md and the byte-exact ROUND-2-DISPOSITIONS.md retain both
actual REVISE rounds. SOURCE-RETURN-OUTCOME-2026-10-21.md records the subsequent
upstream reconciliation; only a new exact freeze can receive independent
confirmation. Runtime
consumers and cache/parity seams are named in DESIGN.md. This package edits
preparation tooling and proposed patch files only; it does not implement the
wire contract. Earlier signed artifacts remain evidence and retain their
exact bytes. Integration/recorder/CI successor recognition is prepared in
RECORDING-PREPARATION.md, assigned to the coordinator, and gates any owner
offer/adoption transaction.

## Migration / supersession plan

A fresh non-author reviews the frozen proposed subject manifest and packet.
Only an independently cleared exact version may be offered under
`OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14`. Only the owner may sign
`three-surface-poc-governedby-reference-amendment-v1.0`. The coordinator must
register the package and prove recorder, reconciliation, predecessor
recognition and generated-view checks before that offer. After signature,
apply all five patches and regenerate dependencies/records in the same
logical change (CC-REV-2); no split landing with broken gates. Historical
subjects/manifests and raw reviews are never rewritten. Code rollout needs
separate explicit implementation authorization and an atomic consumer/
serializer/cache/parity change; no dual wire format is proposed. A rollback
that changes the adopted wire contract needs owner direction, not a silent
return to inline duplication.

## Review

**Required class:** fresh-context spec/semantic-delta, consequence coverage,
impact and digest-binding confirmation under CC-REV-1/2/6, CC-SPEC-4/8/9/11
and CC-IMPACT-5. **Recorded history:** round one and C3 round two both returned
REVISE; the source return is evidence, not a new review. This author issues
no verdict. **Raw records:** the coordinator retains both failed raws
verbatim; any later independent round keeps the numbering and names its new
exact subject. **Owner sign-off/implementation:** neither is performed or
authorized by this package; current offer readiness belongs to the
coordinator's separate exact-head receipt.

## Source-method consequence, 2026-10-21

[Inferred] Same semantic facts do not imply the same physical oracle inputs.
PWB006 still measures actual final encoded bytes under its existing ceilings;
small populations can grow (synthetic N=0 +258 bytes, N=1 +35), while the
retained N=2 pair shrinks by 188. No all-N saving, inline fallback, empty-set
exception or changed metric is proposed. Bound copies and all 18 threshold
expectations are in evidence/encoded-byte/.

[Inferred] Both GEN019 convention-preservation limbs are affected even
though the current source adapter and PWB anchor projections remain
separate. PWB021's existing resource-breach arm consumes changed byte
outcomes. The new wire-validation readiness:false is response-level refusal
only; it neither persists a new model-readiness predicate nor changes PWB022
84+2 act validity. Human rendering remains on the existing logical model;
independent machine comparators/consumers perform the closed expansion.
The full 130-row source assessments, exact clauses/excerpts and per-affected
later obligations are retained under REQUIREMENT-CONSUMPTION.json and
evidence/. No inherited coverage Unknown is closed by these examples.
