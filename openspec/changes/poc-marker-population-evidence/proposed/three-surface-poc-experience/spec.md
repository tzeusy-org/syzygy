# Three-Surface POC marker population evidence

> Candidate delta for independent review. The signed P-108 requirements continue to govern.

## MODIFIED Requirements

### Requirement: POC-REQ-055 — Every relationship is named in or flagged outside the closed vocabulary

Group: Cross-cutting experience. Form: **invariant**.

**Required behavior.** Every relationship the shared model emits SHALL either
carry a relation name from RFC1-25's closed table, emitted with its source and
target in the roles that table assigns the relation — read through a
checked-in declaration that maps each shared-model entity kind to the RFC 0001
class it corresponds to, or to none — or carry an explicit
outside-closed-vocabulary flag with a stated reason. The flag and its reason
SHALL be carried in the machine answer and rendered in every rendered element
that marks the relationship; an element marks a relationship when it carries
the relationship's served `id` in one of the surfaces' declared relationship
markers. A flag discloses that a relationship is outside the closed
vocabulary; it never adds a kind or a role pair to that vocabulary. A
rendering of a relationship that carries no declared relationship marker is
outside this requirement's sweep.

An independently authored, checked-in oracle declaration SHALL fix the
applicable served regions and relationship marker attributes before the
sweep. It SHALL include the existing `data-relationship-id` markers in the
regions that serve those rows. The checker SHALL enumerate every
qualifying occurrence within the declared scope and report that scope and
its observed count. For a fixed fixture, separately authored expected
occurrences SHALL name the served region, attribute and served relationship
identifier with literal multiplicities. They SHALL be determined independently
of renderer output and extraction code. The fixed nonempty fixture SHALL
match the expected occurrences exactly before its rendering check can pass.

The checker SHALL report an undeclared scope as Unknown with
missing-declaration and route it to recording the scope. An evaluated
declared scope with zero qualifying occurrences SHALL report the
marker-dependent rendering limb as Unknown with missing-evidence and
route it to capturing relevant marker evidence. The zero is an observed
population count only. Report the outcomes for other limbs separately.
For a fixed nonempty fixture, a missing, substituted or extra occurrence
SHALL also fail the fixture's occurrence comparison.

- **Scope.** every relationship in the machine answer, and every rendered
  element on any surface that marks a relationship.

- **Case (sweep)**: a checker enumerates every relationship in the
  machine answer — the denominators are that population and its distinct
  kinds — and, for each, checks its kind against a copy of RFC1-25's
  relation names and its source and target kinds, mapped through the
  declared correspondence, against the set of role pairs the table
  assigns that relation; it loads each surface and extracts every
  rendered element carrying a declared relationship marker — the
  denominator is the complete declared marker population, which the check
  counts and reports — and checks every flagged relationship for a non-empty
  reason in the machine answer and in every element that marks it. The fixed
  fixture includes a rendered flagged relationship with a reason. The
  checker compares its observed occurrences to the literal expectation.
- **Observable**: every relationship is a closed relation name in a role
  pair the table assigns it, or is flagged with a reason in the machine
  answer and in every rendered element that marks it. The report identifies
  the rendering scope and its separate evidence disposition.
- **Oracle**: per-relationship membership-or-flag over the exhausted
  population, and per-element reason presence over the exhausted marker
  population. Zero unflagged relationships whose kind is outside the
  table, zero unflagged relationships whose mapped role pair the table
  does not assign that relation, zero flagged relationships whose kind
  and mapped role pair the table assigns, and zero flagged relationships
  answered without their reason decide the machine-side checks. Zero
  rendered flagged-relationship occurrences without their reason decides
  the rendering predicate only for a complete, declared, nonempty sweep.
  The fixed fixture also requires exact occurrence agreement.
- **Oracle independence**: the relation names and each relation's set of
  role pairs are literals transcribed from RFC1-25's table, and the
  kind-to-class correspondence is a checked-in declaration; none is
  imported from the model. Served output supplies actual occurrences.
  The separately authored declared scope and fixed-fixture expectations
  supply the bounds and oracle values.
- **Falsifier**: an unflagged relationship whose kind is outside
  RFC1-25's table, an unflagged closed name in a role pair the table does
  not assign it (reversed roles included), a flag on a relationship whose
  kind and mapped role pair the table assigns, or a flagged relationship
  answered without its reason or marked by a rendered element that
  carries no reason. A rendering pass reported for an undeclared or empty
  population, or a fixed-fixture pass after occurrence drift, also falsifies
  this requirement.

#### Scenario: A kind outside the closed table is disclosed

- **WHEN** the shared model emits a relationship whose kind has no
  counterpart in RFC1-25's closed table
- **THEN** the machine answer and every rendered element that marks the
  relationship carry its outside-closed-vocabulary flag and reason, and
  the check reports the number of relationships, of distinct kinds and of
  relationship markers as its denominators

#### Scenario: Relationship marker scope is undeclared

- **WHEN** the sweep has no declaration for its applicable relationship marker scope
- **THEN** the marker-dependent rendering limb is Unknown with
  missing-declaration and a route to record its scope
- **AND** the check reports the other limb outcomes separately

#### Scenario: Relationship marker scope is declared and empty

- **WHEN** the sweep captures its complete declared relationship marker scope and
  measures zero qualifying occurrences
- **THEN** it reports the observed count zero and an Unknown rendering
  limb with missing-evidence and a route to capture relevant evidence
- **AND** a machine-side conformance result remains independently reported

#### Scenario: Relationship fixed fixture exercises the rendering predicate

- **WHEN** a fixed fixture yields its declared nonempty relationship marker occurrence
  population exactly and every qualifying occurrence satisfies the
  rendering predicate
- **THEN** the checker reports the complete observed count and a pass
  for that rendering predicate
- **AND** the fixture exercises a flagged relationship's reason on a marked element

#### Scenario: Relationship occurrence drift fails fixture validation

- **WHEN** a fixed nonempty fixture loses every declared relationship marker
  occurrence, or one expected occurrence is replaced while the count
  stays the same
- **THEN** the checker detects the occurrence mismatch and the fixture
  fails validation
- **AND** if every occurrence was lost, the rendering limb reports Unknown
  with missing-evidence

```yaml
warrants:
  primary: VIS-1
  doctrine: [VIS-1, VIS-2, VIS-7]
  contracts: [RFC1-25, RFC1-26, RFC2-24]
  policies: []
  decisions: [POC-DIR-2026-09-21]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-060 — One design language, one epistemic encoding and record shape

Group: Cross-cutting experience. Form: **invariant**.

**Required behavior.** The three surfaces SHALL draw from one declared set of
design tokens, and SHALL encode epistemic states (Observed, Inferred, Unknown,
and their reasons) identically wherever they appear. Every entity and every
relationship the shared model holds SHALL carry its epistemic state in one
record shape, in the shared model and in the machine answer: a label from the
closed three (Observed, Inferred, Unknown); a rendering tier, where the record
carries one, from RFC2-25's closed six and always inside its parent label;
and, where the label is Unknown, exactly one primary reason from RFC2-24's
closed twelve with its resolution route. The declared token/encoding table
SHALL give Observed, Inferred and Unknown three pairwise distinct entries. An
Inferred state SHALL arise only from an agent's assertion, SHALL never count
toward an Observed total or clear an Unknown, SHALL name the agent assertion
it arises from, and SHALL render with the declared table's Inferred entry in
every rendered element that marks its record; an element marks a record when
it carries the record's served `id` in one of the surfaces' declared record
markers.

An independently authored, checked-in oracle declaration SHALL fix the
applicable served regions and record marker attributes before the sweep.
It SHALL include the existing `data-entity-id` and `data-relationship-id`
markers in the regions that serve those rows. The checker SHALL enumerate every
qualifying occurrence within the declared scope and report that scope and
its observed count. For a fixed fixture, separately authored expected
occurrences SHALL name the served region, attribute and served record
identifier with literal multiplicities. They SHALL be determined independently
of renderer output and extraction code. The fixed nonempty fixture SHALL
match the expected occurrences exactly before its rendering check can pass.

The checker SHALL report an undeclared scope as Unknown with
missing-declaration and route it to recording the scope. An evaluated
declared scope with zero qualifying occurrences SHALL report the
marker-dependent rendering limb as Unknown with missing-evidence and
route it to capturing relevant marker evidence. The zero is an observed
population count only. Report the outcomes for other limbs separately.
For a fixed nonempty fixture, a missing, substituted or extra occurrence
SHALL also fail the fixture's occurrence comparison.

- **Scope.** every epistemic encoding across the three surfaces, and every
  element of the machine answer's entity and relationship lists, with its
  epistemic record. No other epistemic value the machine answer serves is
  in the record-shape population. The shared model's records are observed
  through the machine answer, which serves the shared model's fact set
  (POC-REQ-020); no check reads the shared model directly. An Observed
  total is every count the machine answer serves, except a count the
  machine answer declares to be of Inferred records.

- **Case (sweep)**: a checker enumerates every epistemic encoding on
  all three surfaces — the denominator is that population — and
  compares each against the declared token/encoding table; it
  enumerates every element of the machine answer's entity and
  relationship lists — the denominator is that population — checks that
  each carries exactly one epistemic record, and validates each record
  against the closed label, tier and reason vocabularies. While no agent
  has asserted anything, the Inferred limbs are exercised by a fixture
  record injected at the model seam; for that record the checker
  extracts every rendered element carrying a declared record marker that
  names it — the denominator is that complete declared population,
  which the check counts and reports. The fixed fixture exercises at
  least one marked occurrence of the Inferred fixture record. The checker
  compares the observed occurrences to that fixture's separately authored
  expectation.
- **Observable**: identical states render with identical declared
  encodings on every surface, and the table's three label entries are
  pairwise distinct; every entity and relationship carries exactly one
  record, in the closed-vocabulary shape; an Inferred record names the
  agent assertion it arises from, is absent from every Observed total,
  leaves every Unknown entity and relationship record Unknown, and
  renders with the table's Inferred entry in every element that marks
  it. The report identifies the rendering scope and its separate evidence
  disposition.
- **Oracle**: per-encoding equality with the declared table, a pairwise
  comparison of the table's Observed, Inferred and Unknown entries, and
  per-element record presence and per-record vocabulary validation, over
  the exhausted populations; for each Inferred record, a check that it
  names an agent assertion, a recount of every Observed total without
  it, each of which must equal the count served with it, a recount of
  the entity and relationship records labelled Unknown with and without
  it, whose two sets, each member keyed by the list it is served in and
  the identifier the machine answer serves it under and the injected
  record excluded, must be equal, and an encoding comparison of every
  rendered element that marks it with the declared Inferred entry; the
  table is a checked-in declaration; zero equal label entries, zero
  entities or relationships without exactly one record, zero records off
  the closed-vocabulary shape (label, tier nesting, exactly one primary
  reason with its route) and zero breached non-marker Inferred limbs
  decide those checks. Zero marked-element encoding mismatches decides
  the encoding predicate only for a complete, declared, nonempty sweep.
  The fixed fixture also requires exact occurrence agreement.
- **Oracle independence**: the declared table and the closed RFC2-24 and
  RFC2-25 lists are expected values written as literals; the sweep reads
  served output and the machine answer. The separately authored declared
  scope and fixed-fixture expectations supply the bounds and oracle values
  for the Inferred rendering limb.
- **Falsifier**: one surface encoding Unknown (or Observed, or Inferred)
  differently from the declared table, or a surface styling epistemic
  state ad hoc; a declared table giving two of the three labels one
  entry; an entity or relationship with no epistemic record or with more
  than one; a record with no label, a tier outside its parent label, a
  reason outside the twelve or an Unknown with no route; or an Inferred
  record counted in an Observed total, clearing an Unknown, naming no
  agent assertion, or marked by a rendered element whose encoding is not
  the declared Inferred entry. A rendering pass reported for an
  undeclared or empty marker population, or a fixed-fixture pass after
  occurrence drift, also falsifies this requirement.

#### Scenario: Unknown looks the same everywhere

- **WHEN** the same Unknown relationship appears on Polaris,
  Trajectory, and Orrery
- **THEN** all three render it with the declared Unknown encoding from
  the shared token set

#### Scenario: An agent assertion stays Inferred

- **WHEN** an agent-asserted record is present in the shared model
  beside Observed records of the same kind
- **THEN** it carries the label Inferred and names the agent assertion
  it arises from, changes no Observed total the machine answer serves,
  leaves every Unknown entity and relationship record in the machine
  answer Unknown, and renders with the declared Inferred encoding in
  every rendered element that marks it, and the check reports that
  marker population as its denominator

#### Scenario: Inferred record marker scope is undeclared

- **WHEN** the sweep has no declaration for its applicable record marker scope
- **THEN** the marker-dependent rendering limb is Unknown with
  missing-declaration and a route to record its scope
- **AND** the check reports the other limb outcomes separately

#### Scenario: Inferred record marker scope is declared and empty

- **WHEN** the sweep captures its complete declared record marker scope and
  measures zero qualifying occurrences
- **THEN** it reports the observed count zero and an Unknown rendering
  limb with missing-evidence and a route to capture relevant evidence
- **AND** a machine-side conformance result remains independently reported

#### Scenario: Inferred record fixed fixture exercises the rendering predicate

- **WHEN** a fixed fixture yields its declared nonempty record marker occurrence
  population exactly and every qualifying occurrence satisfies the
  rendering predicate
- **THEN** the checker reports the complete observed count and a pass
  for that rendering predicate
- **AND** the fixture exercises the declared Inferred encoding on a marked element

#### Scenario: Inferred record occurrence drift fails fixture validation

- **WHEN** a fixed nonempty fixture loses every declared record marker
  occurrence, or one expected occurrence is replaced while the count
  stays the same
- **THEN** the checker detects the occurrence mismatch and the fixture
  fails validation
- **AND** if every occurrence was lost, the rendering limb reports Unknown
  with missing-evidence

```yaml
warrants:
  primary: VIS-3
  doctrine: [VIS-1, VIS-2, VIS-3]
  contracts: [RFC2-24, RFC2-25, RFC6-14, RFC6-18, RFC6-22, RFC8-31]
  policies: []
  decisions: [POC-DIR-2026-08-30, POC-DIR-2026-09-21]
  topology: []
  parent_requirements: []
```
