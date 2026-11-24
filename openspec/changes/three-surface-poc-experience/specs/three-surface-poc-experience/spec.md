# Specification — three-surface-poc-experience

> **Candidate.** Binds nothing until owner sign-off
> (`.syzygy/governance/decisions/THREE-SURFACE-POC-SPEC-AUTHORIZATION.md`).

## Purpose

Lets a person and a machine read one observed external project through
three honest, visually distinct surface experiences — Polaris as a
long-form white-paper, Trajectory as a work-item board with time
visualization over the project's Beads Dolt database, Orrery as a
deterministic spatial code map — all consuming one shared fact model,
with every Unknown visible with its reason and every positive claim
carrying resolvable provenance.

## ADDED Requirements

Reader notes, binding on how this file is read:

- **Subject.** "The POC" names the Three-Surface POC application and
  core packages under specification. "The shared model" is the one
  in-memory fact model both `GET /api/poc` and every human surface
  consume. "The configured project" is the single Butlers repository
  the 2026-08-29 direction bounds the POC to. A "human surface" is any
  rendering a person reads (server- or client-rendered); the "machine
  answer" is the authenticated `GET /api/poc` response. Both are
  observation points for every oracle below.
- **Groups.** Requirements are organized into seven literal groups,
  named in each requirement's `Group` line: *Code-structure
  observation* (001–004), *Work-item observation* (010–014), *Client
  rendering and parity* (020–022), *Polaris* (030–032), *Trajectory*
  (040–045), *Orrery* (050–053), *Cross-cutting experience* (055, 060–061).
  Identifiers are stable and literal: minted once, amended in place,
  retired rather than reused, never renumbered (CC-SPEC-3). Gaps in the
  numbering are deliberate.
  POC-REQ-055 carries the identifier the owner's ruling named; its number
  range does not place it in the Orrery group; its `Group` line places it
  in *Cross-cutting experience*.
- **Warrants.** Each requirement ends with a machine-readable
  `warrants` block in CC-SPEC-2's six classes. `decisions` entries cite
  recorded owner directions by their record file in
  `.syzygy/governance/decisions/`: `POC-DIR-2026-08-29` names
  `THREE-SURFACE-POC-MODE-DIRECTION.md`, `POC-DIR-2026-08-30` names
  `THREE-SURFACE-POC-REDESIGN-DIRECTION.md` and `POC-DIR-2026-09-21`
  names `POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md` (ruling
  P-75). `contracts[]` entries come
  from the CC-SPEC-8 sweep recorded in this change's
  `CONTRACT-COVERAGE.md`: a clause is listed exactly where the sweep
  found the requirement's oracle observes one of that clause's
  consequences. POC-REQ-021's empty `contracts[]` is a sweep result
  (no accepted clause maps to it; it rests on doctrine and decisions),
  not an authoring gap.
- **Vocabulary.** No verifying evidence → `Unknown`, never success
  (VIS-2); every Unknown rendered by a surface carries its reason. An
  "identified observation" is the pair (source revision, capture
  instant). The "registered bead-prefix" is the issue-identifier prefix
  the configured project's Beads database is registered under (for
  Butlers: `bu`).
- **Determinism.** Where a requirement says "deterministic", it means:
  two runs over identical source revisions and identical declared
  inputs produce identical fact content and identical layout
  assignments, with only display formatting and serving timestamps
  excluded.

### Requirement: POC-REQ-001 — Code-structure observation is bound to an exact revision

Group: Code-structure observation. Form: **event-response**.

**Required behavior.** WHEN the POC observes the configured project's code
structure, it SHALL produce one identified observation naming the exact git
revision observed, containing a directory and file inventory (paths, sizes,
per-file content digests, and declared language classifications) whose every
entry carries that revision as provenance.

- **One statement of provenance.** The observation so produced SHALL state
  its provenance once, as one record in the shape each element of the machine
  answer's entity and relationship provenance lists takes, and that record
  names the revision. No other field of the observation, its own or an
  entry's, SHALL hold the revision as its whole value.
  - The capture instant stays on the observation beside that record, as the
    second half of the observation's identity. It is not a second statement
    of provenance.
  - Every inventory entry carries that revision as provenance by belonging to
    the observation. No inventory entry SHALL carry a field whose whole value
    is the observation's revision or its capture instant.

- **Case**: a checker runs the POC against the configured repository at
  a known commit, then sweeps every field of the served observation, its
  own and every entry's; the denominator is the observation's own fields
  and the complete served inventory.
- **Observable**: the observation's provenance record and inventory
  appear in the machine answer; Orrery renders from it (POC-REQ-050).
- **Oracle**: compare the revision the provenance record names against
  `git rev-parse HEAD` of the observed checkout, and a sampled file's
  served size and digest against `stat` and an independent digest of the
  same path at that commit; equality decides. Over every field of the
  served observation, compare each whole value against the revision and
  the capture instant: exactly one field holds the revision, the
  provenance record's, and exactly one holds the capture instant, the
  observation's own; an exhausted sweep decides. Bounded: one revision,
  sampled entries for size and digest, every field for the sweep.
- **Oracle independence**: expected values come from git and the
  filesystem directly, never from the POC's own output; the provenance
  shape compared against is the one the machine answer's entities carry.
- **Falsifier**: a provenance revision, or a sampled entry's size or
  digest, that differs from the repository's own state at the named
  commit; an observation served without a provenance record, with it in
  another shape, or with any other field holding the revision; or an
  inventory entry that carries the observation's revision or capture
  instant.

#### Scenario: Structure observed at a commit

- **WHEN** the POC observes the configured project checked out at
  commit R
- **THEN** the machine answer serves one code-structure observation
  identified by R, whose one provenance record names R, and every
  inventory entry takes R as its provenance revision from that record
- **AND** no inventory entry carries R, or the observation's capture
  instant, in a field of its own

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-2, VIS-6, VIS-7]
  contracts: [RFC1-5, RFC2-1, RFC4-3, RFC4-11, RFC4-12, RFC6-15, RFC9-38]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-002 — Structure observation captures metadata, never indexed contents

Group: Code-structure observation. Form: **prohibition**.

**Required behavior.** The POC SHALL NOT index, store, or serve observed file
contents from the code-structure observation.

- **Scope.** every field of every served code-structure fact. Only paths,
  sizes, counts, language classifications, digests, revisions, and capture
  instants may appear.

- **Case (counterexample schema + sweep)**: a checker plants a file
  containing a unique sentinel string in the observed repository,
  triggers observation, then sweeps the entire machine answer and every
  human surface for the sentinel. The denominator is the full byte
  content of both channels.
- **Observable**: the sentinel appears nowhere in either channel.
- **Oracle**: substring search for the sentinel over the complete
  served bytes; absence over the exhausted population decides.
- **Oracle independence**: the sentinel is authored by the checker,
  unknown to the implementation.
- **Falsifier**: the sentinel — or any observed file's body text —
  appearing in any served output.

#### Scenario: Planted content never served

- **WHEN** an observed file contains a checker-authored sentinel and
  observation runs
- **THEN** no served human or machine output contains the sentinel;
  the file appears only as path, size, digest, and classification

```yaml
warrants:
  primary: SEC-5
  doctrine: [SEC-2, SEC-3, SEC-5]
  contracts: [RFC1-5, RFC4-12, RFC5-16]
  policies: []
  decisions: [POC-DIR-2026-08-29, POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-003 — Failed structure observation renders Unknown with its reason

Group: Code-structure observation. Form: **event-response**.

**Required behavior.** WHEN the code-structure observation cannot be produced
(repository unreadable, revision unresolvable, observer failure), the POC
SHALL serve the code-structure region as Unknown carrying a named reason, and
SHALL NOT serve a partial inventory as if complete.

- **Case**: a checker points the POC at an unreadable or absent
  repository path and requests both channels.
- **Observable**: both channels serve Unknown with a reason for the
  code-structure region; Orrery renders its Unknown state
  (POC-REQ-051), never an empty-but-green map.
- **Oracle**: the served epistemic label equals `Unknown` and the
  reason field is non-empty and names the failure class; string
  comparison decides.
- **Oracle independence**: the checker induced the failure and knows
  its class independently of the POC's report.
- **Falsifier**: a green or populated structure rendering, a
  reason-less Unknown, or a partial inventory served without
  distinguishing itself from a complete one.

#### Scenario: Unreadable repository

- **WHEN** the configured repository path is unreadable at observation
  time
- **THEN** the code-structure region is served Unknown with a named
  reason on both channels

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2]
  contracts: [RFC1-31, RFC2-2, RFC2-23, RFC2-24, RFC4-2, RFC4-4, RFC4-12, RFC9-24, RFC9-27, RFC9-29]
  policies: []
  decisions: [POC-DIR-2026-08-29]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-004 — Structure facts are deterministic per revision

Group: Code-structure observation. Form: **invariant**.

**Required behavior.** For any revision R of the configured project, two
code-structure observations of R SHALL produce identical fact content.

- **Scope.** all served code-structure facts across repeated runs at the same
  revision.

- **Case (sweep)**: a checker runs observation twice at the same
  commit, holding declared inputs fixed, and diffs the two machine
  answers' code-structure regions in full — the denominator is every
  field of both.
- **Observable**: the two fact sets are byte-identical outside
  capture-instant fields.
- **Oracle**: structural diff excluding declared capture-instant
  fields; emptiness decides.
- **Oracle independence**: the diff tool is generic, not POC code.
- **Falsifier**: any fact field differing between the two runs.

#### Scenario: Repeated observation at one commit

- **WHEN** observation runs twice at commit R with identical inputs
- **THEN** the served code-structure facts are identical apart from
  capture instants

```yaml
warrants:
  primary: VIS-7
  doctrine: [VIS-6, VIS-7]
  contracts: [RFC1-5, RFC2-1, RFC2-3, RFC4-2, RFC6-15, RFC9-14, RFC9-17]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-010 — Work items are read from the Dolt database and revision-stamped

Group: Work-item observation. Form: **event-response**.

**Required behavior.** WHEN the POC observes the configured project's work
items, it SHALL read them from the project's Beads database hosted on Dolt,
and SHALL serve the observation identified by the exact Dolt revision read,
with every served work-item fact carrying that revision as provenance.

- **One statement of provenance.** The observation so served SHALL state its
  provenance once, as one record in the shape each element of the machine
  answer's entity and relationship provenance lists takes, and that record
  names the Dolt revision. No other field of the observation, its own or a
  work-item fact's, SHALL hold the Dolt revision as its whole value.
  - The capture instant stays on the observation beside that record, as the
    second half of the observation's identity. It is not a second statement
    of provenance.
  - Every served work-item fact carries that revision as provenance by
    belonging to the observation. No work-item fact SHALL carry a field whose
    whole value is the observation's Dolt revision, or carry the capture
    instant in any field other than a time the database itself records for
    that item.

- **Case**: a checker runs work-item observation against the configured
  Beads Dolt database at a known Dolt head, then sweeps every field of the
  served observation, its own and every item's; the denominator is the
  observation's own fields and the complete served item set.
- **Observable**: the machine answer names the Dolt revision in the
  observation's provenance record; a sampled item's served status and
  timestamps match the database.
- **Oracle**: compare the Dolt revision the provenance record names
  against the database's own head revision queried directly, and a
  sampled item's fields against a direct SQL read at that revision;
  equality decides. Over every field of the served observation, compare
  each whole value against the Dolt revision and the capture instant:
  exactly one field holds the Dolt revision, the provenance record's, and
  exactly one holds the capture instant, the observation's own, leaving
  out each item's created, updated and closed times, which the database
  records; an exhausted sweep decides.
- **Oracle independence**: expected values come from querying Dolt
  directly, never from the POC's output; the provenance shape compared
  against is the one the machine answer's entities carry.
- **Falsifier**: a served work-item observation with no Dolt revision,
  without a provenance record, with it in another shape, or with any other
  field holding the Dolt revision; a sampled field differing from the
  database's value at the named revision; or a work-item fact that carries
  the observation's Dolt revision, or its capture instant outside a time
  the database records for that item.

#### Scenario: Items read at a Dolt head

- **WHEN** work-item observation runs while the Beads Dolt database is
  at revision D
- **THEN** the served observation is identified by D, its one provenance
  record names D, and sampled item facts equal direct reads at D
- **AND** no work-item fact carries D, or the observation's capture
  instant, in a field of its own

```yaml
warrants:
  primary: VIS-6
  doctrine: [VIS-2, VIS-6, VIS-7]
  contracts: [RFC1-5, RFC1-9, RFC2-1, RFC4-3, RFC4-5, RFC4-15, RFC6-15]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-011 — Work-item observation is scoped to the registered bead-prefix

Group: Work-item observation. Form: **invariant**.

**Required behavior.** Every served work item SHALL carry an identifier under
the configured project's registered bead-prefix.

- **Scope.** all work items in the machine answer and on every human surface.

- **Case (sweep)**: a checker enumerates every served work-item
  identifier from the machine answer — the denominator is the complete
  served item set — and checks each against the registered prefix.
- **Observable**: every identifier matches `<prefix>-*`.
- **Oracle**: prefix match per enumerated item; an exhausted population
  with zero mismatches decides.
- **Oracle independence**: the registered prefix comes from the
  project's registration, not from the observation output.
- **Falsifier**: one served item whose identifier is outside the
  registered prefix.

#### Scenario: Only prefix-scoped items served

- **WHEN** the machine answer serves N work items for a project
  registered under prefix `bu`
- **THEN** all N identifiers begin `bu-`

```yaml
warrants:
  primary: POC-DIR-2026-08-30
  doctrine: [VIS-6, VIS-7]
  contracts: [RFC6-16]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-012 — The passive export is never a work-item source

Group: Work-item observation. Form: **prohibition**.

**Required behavior.** The POC SHALL NOT read work-item facts from the Beads
JSONL export or any derived file; the Dolt database is the only work-item
source.

- **Scope.** every work-item fact served in either channel.

- **Case (counterexample schema + sweep)**: a checker mutates the JSONL
  export to disagree with the Dolt database on one item's status, then
  triggers observation and reads both channels. The denominator is
  every served fact about that item.
- **Observable**: served facts follow the database, never the mutated
  export.
- **Oracle**: compare the served status against both sources; equality
  with the database and inequality with the export decides.
- **Oracle independence**: both expected values are read directly from
  the two sources by the checker.
- **Falsifier**: any served fact matching the mutated export against
  the database, or observation failing because the export is absent.

#### Scenario: Divergent export ignored

- **WHEN** the JSONL export disagrees with the Dolt database on an
  item's status and observation runs
- **THEN** the served status equals the database's value, and deleting
  the export entirely does not change the observation

```yaml
warrants:
  primary: POC-DIR-2026-08-30
  doctrine: [VIS-6, VIS-7]
  contracts: [RFC1-5, RFC1-9, RFC4-15]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-013 — An unreadable work-item source renders Unknown

Group: Work-item observation. Form: **event-response**.

**Required behavior.** WHEN the Beads Dolt database is absent, unreachable, or
unreadable, the POC SHALL serve the work-item region as Unknown with a named
reason on both channels, and Trajectory SHALL render that Unknown state —
never an empty board presented as "no work".

- **Case**: a checker makes the database unreachable and requests both
  channels.
- **Observable**: the work-item region carries `Unknown` and a reason;
  Trajectory shows its Unknown rendering, visually distinct from an
  empty-but-observed board.
- **Oracle**: the served epistemic label equals `Unknown` with a
  non-empty reason naming the failure class; and the Trajectory
  rendering carries the Unknown marker, not the zero-items marker.
- **Oracle independence**: the checker induced and independently knows
  the failure.
- **Falsifier**: an empty kanban rendered without an Unknown marker, a
  reason-less Unknown, or stale items served as current without their
  observation revision.

#### Scenario: Database unreachable

- **WHEN** the Dolt database cannot be read at observation time
- **THEN** both channels serve the work-item region Unknown with a
  named reason, and Trajectory renders that state distinctly from an
  observed-empty board

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2]
  contracts: [RFC1-31, RFC2-2, RFC2-23, RFC2-24, RFC4-2, RFC4-4, RFC4-15, RFC9-24, RFC9-27]
  policies: []
  decisions: [POC-DIR-2026-08-29]
  topology: []
  parent_requirements: []
```

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

- **WHEN** the tracker holds an item whose title reads "Implement
  POC-REQ-010" (the POC withholds titles, SEC-5, so the title is never read
  into the model)
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

### Requirement: POC-REQ-020 — Client-rendered facts are the shared model's facts

Group: Client rendering and parity. Form: **invariant**.

**Required behavior.** Every fact a client-rendered surface presents SHALL be
present, with equal value, in the machine answer for the same evaluation.

- **Scope.** all facts rendered by client-side code across the three surfaces.

- **Case (sweep)**: a checker loads each surface, extracts every
  rendered fact through the surfaces' declared parity markers — the
  denominator is the complete marker population, which the check counts
  and reports — and compares each against the machine answer.
- **Observable**: every marked rendered fact has an equal counterpart
  in the machine answer.
- **Oracle**: field-by-field equality over the exhausted marker
  population; the independent parity comparator (not surface code)
  decides.
- **Oracle independence**: the comparator reads the wire outputs of
  both channels; it imports no rendering code.
- **Falsifier**: one rendered fact absent from, or unequal to, the
  machine answer at the same evaluation.

#### Scenario: Surface and machine answer agree

- **WHEN** a surface renders N marked facts at evaluation E
- **THEN** all N appear with equal values in `GET /api/poc` for E, and
  the check reports N as its denominator

```yaml
warrants:
  primary: VIS-1
  doctrine: [VIS-1, VIS-3, VIS-7]
  contracts: [RFC6-13, RFC6-14, RFC6-18, RFC6-22, RFC6-23, RFC7-18, RFC7-33, RFC9-1, RFC9-46, RFC9-48]
  policies: []
  decisions: [POC-DIR-2026-08-29, POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-021 — Client code is a build output, never fetched at runtime

Group: Client rendering and parity. Form: **prohibition**.

**Required behavior.** The POC SHALL NOT load executable client code from
outside its own built, version-controlled outputs: no runtime fetch of scripts
from external origins.

- **Scope.** every script the served pages cause a browser to execute.

- **Case (sweep)**: a checker enumerates every script reference in the
  served pages and every network origin contacted during page load —
  the denominator is the complete reference set.
- **Observable**: all executable references resolve to the POC's own
  served build outputs.
- **Oracle**: origin check per enumerated reference over the exhausted
  set; zero external executable origins decides.
- **Oracle independence**: the enumeration reads served bytes and
  observed network activity, not the build configuration.
- **Falsifier**: one script reference to an origin outside the POC's
  own serving.

#### Scenario: Offline page load

- **WHEN** a served page loads with all external network origins
  blocked
- **THEN** every surface still renders fully from the POC's own served
  assets

```yaml
warrants:
  primary: SEC-3
  doctrine: [SEC-1, SEC-3]
  contracts: []
  policies: []
  decisions: [POC-DIR-2026-08-29]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-022 — Script-less reading still gets honest facts

Group: Client rendering and parity. Form: **event-response**.

**Required behavior.** WHEN a human surface is read without script execution,
the POC SHALL still serve the surface's facts in exact, accessible form (the
server-rendered exact tables/routes), or an explicit statement that the
enhanced rendering is unavailable — never a blank or silently degraded region
presented as complete.

- **Case**: a checker requests each surface with scripting disabled and
  reads the served HTML.
- **Observable**: the facts remain reachable through server-rendered
  exact form, or the region explicitly states its unavailability.
- **Oracle**: for a sampled fact set, presence in the no-script served
  HTML (or presence of the explicit unavailability statement); string
  comparison decides.
- **Oracle independence**: the sampled expected facts come from the
  machine answer.
- **Falsifier**: a region that renders empty without an unavailability
  statement when scripts are disabled.

#### Scenario: No-script request

- **WHEN** a surface page is fetched and rendered without JavaScript
- **THEN** its facts are served in exact server-rendered form, or the
  region explicitly discloses that the spatial/board rendering is
  unavailable without script

```yaml
warrants:
  primary: VIS-3
  doctrine: [VIS-1, VIS-2, VIS-3]
  contracts: [RFC6-13, RFC7-33, RFC7-34, RFC9-24]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-030 — Polaris renders a multi-page long-form narrative from intent facts

Group: Polaris. Form: **state projection/query**.

**Required behavior.** WHEN Polaris is read, it SHALL project the shared
model's intent entities as a long-form narrative document in multiple titled
pages/sections, each section traceable to the entity or entities it presents.

- **Case**: a checker loads Polaris at a known evaluation with a known
  entity set.
- **Observable**: a paginated/sectioned document whose sections carry
  entity references.
- **Oracle**: for each intent entity in the machine answer, at least
  one Polaris section references it, and each section's references
  resolve to model entities; resolution over the enumerated entity set
  decides.
- **Oracle independence**: the entity list comes from the machine
  answer, not from Polaris's rendering.
- **Falsifier**: an intent entity absent from every section, or a
  section presenting substantive content traceable to no entity.

#### Scenario: Narrative covers the intent entities

- **WHEN** the shared model holds N intent entities and Polaris is
  loaded
- **THEN** the document presents titled sections in which each of the N
  entities is referenced, and no section's substantive claims lack an
  entity reference

```yaml
warrants:
  primary: VIS-3
  doctrine: [VIS-1, VIS-3]
  contracts: [RFC1-7, RFC7-5, RFC7-6, RFC7-9, RFC7-13]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-031 — Every positive Polaris claim carries resolvable provenance

Group: Polaris. Form: **invariant**.

**Required behavior.** Every positive claim Polaris presents SHALL cite
provenance that resolves to an identified observation or governed artifact in
the shared model.

- **Scope.** all claim-bearing elements Polaris marks (its declared claim
  markers).

- **Case (sweep)**: a checker enumerates Polaris's claim markers — the
  denominator is the complete marker population, counted and reported —
  and resolves each citation against the machine answer.
- **Observable**: every marked claim's citation resolves.
- **Oracle**: resolution per marker over the exhausted population; zero
  dangling citations decides.
- **Oracle independence**: resolution targets come from the machine
  answer.
- **Falsifier**: one marked positive claim with no citation, or a
  citation resolving to nothing.

#### Scenario: Claims resolve

- **WHEN** Polaris renders M marked claims
- **THEN** all M citations resolve against the shared model, and the
  check reports M as its denominator

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2, VIS-7]
  contracts: [RFC1-7, RFC1-24, RFC1-26, RFC6-19, RFC6-20, RFC7-2, RFC7-5, RFC7-9, RFC7-10, RFC7-11, RFC7-29]
  policies: []
  decisions: [POC-DIR-2026-08-29]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-032 — Polaris never fills evidence gaps with narrative

Group: Polaris. Form: **prohibition**.

**Required behavior.** Polaris SHALL NOT present prose asserting states of the
project for which the shared model holds no evidence; where the model is
Unknown, the narrative SHALL disclose the Unknown and its reason in place.

- **Scope.** every substantive assertion in the rendered document.

- **Case (counterexample schema + sweep)**: a checker takes a model
  whose relationships include declared Unknowns, renders Polaris, and
  sweeps every marked assertion — the denominator is the marked
  assertion population — verifying that no assertion speaks positively
  about an Unknown relationship.
- **Observable**: Unknown regions appear as disclosed Unknowns inside
  the narrative flow.
- **Oracle**: for each model Unknown, the document's corresponding
  section carries the Unknown disclosure and no positive assertion
  cites that relationship; the marker sweep decides.
- **Oracle independence**: the Unknown list comes from the machine
  answer.
- **Falsifier**: prose asserting verification, health, or completion
  for a relationship the model holds as Unknown.

#### Scenario: Unknown disclosed in the narrative

- **WHEN** the shared model holds the test-evidence relationship as
  Unknown
- **THEN** Polaris's corresponding section states the Unknown and its
  reason, and no section asserts test success

```yaml
warrants:
  primary: VIS-1
  doctrine: [VIS-1, VIS-2]
  contracts: [RFC1-7, RFC1-19, RFC7-2, RFC7-13, RFC7-19, RFC7-29, RFC9-24]
  policies: []
  decisions: [POC-DIR-2026-08-29]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-040 — Trajectory columns come from the closed status vocabulary

Group: Trajectory. Form: **state projection/query**.

**Required behavior.** WHEN Trajectory is read, it SHALL project observed work
items onto board columns drawn from a declared closed mapping of the Beads
status vocabulary, with every rendered item placed by its observed status and
carrying its identifier. Each rendered item SHALL also show, as text, its
tracker priority and its recorded created, updated and (when present) closed
instants, each equal to the machine answer's value for that item
(`trajectory.rendered[]`).

- **Case**: a checker loads Trajectory at a known Dolt revision with
  known item statuses, priorities and recorded instants.
- **Observable**: each rendered item sits in the column its observed
  status maps to, and its card shows its priority and recorded instants.
- **Oracle**: per sampled item, the rendered column equals the declared
  mapping applied to the status read directly from Dolt at the served
  revision, and the priority and instants shown equal the machine
  answer's for that item; equality decides.
- **Oracle independence**: expected statuses, priorities and instants
  are direct database reads (in a fixture, the checker's own rows), never
  the renderer's model.
- **Falsifier**: an item rendered in a column that contradicts its
  observed status, a column outside the declared mapping, or a card whose
  priority or recorded instant differs from the machine answer's or is
  missing.

#### Scenario: Items placed by observed status

- **WHEN** an item's status in the Dolt database at revision D is
  `in_progress`
- **THEN** Trajectory at the observation of D renders that item in the
  column the declared mapping assigns to `in_progress`

#### Scenario: A card shows its own facts

- **WHEN** an item at revision D has priority 3 and recorded created,
  updated and closed instants
- **THEN** its card shows priority 3 and those three instants as text,
  each equal to the machine answer's value for that item

```yaml
warrants:
  primary: VIS-6
  doctrine: [VIS-3, VIS-6]
  contracts: [RFC4-6, RFC8-12]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-041 — Trajectory's time visualization uses recorded instants only

Group: Trajectory. Form: **invariant**.

**Required behavior.** Every temporal position, duration, or ordering
Trajectory renders SHALL derive from instants recorded in the observed
work-item facts (created, updated, closed), or from the work-item
observation's own capture instant (`workItems.capturedAt`, the instant an
age runs to, POC-REQ-045), never from render-time clocks or inferred
ordering.

- **Scope.** all temporal encodings on the surface: each card's recorded
  instants and the elapsed-time charts and tables of POC-REQ-045.

- **Case (sweep)**: a checker enumerates Trajectory's temporal markers
  — the denominator is the marker population — and recomputes each
  position from the machine answer's recorded instants.
- **Observable**: rendered positions match recomputation; re-rendering
  later without a new observation changes nothing.
- **Oracle**: recomputation equality per marker, and byte-equality of
  temporal encodings across two renders of one observation at different
  wall-clock times.
- **Oracle independence**: recomputation uses the machine answer's
  instants and a checker-owned formula.
- **Falsifier**: a temporal encoding that shifts between renders of the
  same observation, or one not derivable from recorded instants.

#### Scenario: Same observation, later render

- **WHEN** one observation is rendered at two different wall-clock
  times
- **THEN** every temporal encoding is identical across the two renders

```yaml
warrants:
  primary: VIS-6
  doctrine: [VIS-2, VIS-6, VIS-7]
  contracts: [RFC2-3, RFC6-22, RFC6-23]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-042 — Trajectory declares its scope and denominator

Group: Trajectory. Form: **invariant**.

**Required behavior.** Trajectory SHALL visibly declare which work-item
population it renders (its selection rule) and the counts inside and outside
that selection, so an excluded-item population is never silently invisible.
Every served item SHALL be reachable: the route SHALL accept a closed
parameter set, `status` (one of the seven tracker statuses of POC-REQ-040),
`governing-intent=unknown` (the items carrying POC-REQ-014's governing-intent
Unknown), `group=parent` and `page` (a positive integer). These parameters SHALL give a view
of the matching items in ascending item id (with `group=parent`, in the
grouped order below), one page of a declared fixed size, whose scope
statement names the page, the page count and the matching count. When no
parameter is supplied, the default SHALL be the first page of the
non-closed work-item population grouped by parent. The machine answer
SHALL give the same default selection. The set also holds
`changed` (one of POC-REQ-044's change windows, `day`, `week` or
`since-last`), which selects the window the changed answer shows and
nothing else: alone it SHALL keep the default selection, and with another
parameter it SHALL ride that view. `selection=recent` SHALL give a
single status board with up to 200 most recently updated non-closed items
and up to 50 most recently closed items. It SHALL put missing, invalid or
timezone-less times last, break timestamp ties by ascending item id and
order cards by ascending item id within each status column. It accepts
`changed` and optional `page=1`. Any other name, a repeated name, a value
outside its set, an incompatible selection parameter, a page that is not
a positive integer, or a page past the last SHALL be refused with HTTP 400 naming the
parameter, the reason and the allowed set, never ignored. When the
work-item population is Unknown, a well-formed view SHALL render the
Unknown board, since no served item gives a view or a last page. Every page SHALL
link, by real anchors outside any collapsed element and reachable by
keyboard, to the default outline, recent work, every item by id, each
status, the governing-intent Unknown with their whole-population counts,
and the current view's previous and next page. The machine answer SHALL
take no parameter and SHALL declare the parameter set, the default
selection, the recency limits, the default change window, the page size,
the order, and the grouped order and its page unit, `position`
(`trajectory.narrowing`), so any page is recomputable from
`workItems.items` and `trajectory.outline`.

**Grouped by parent.** The default and `group=parent` SHALL group the matching items by
parent, where the matching items are the non-closed served items unless
`status` names a status, closed included. An item's parents are the
`depends_on_issue_id` of its `parent-child` rows, read by POC-REQ-062's
same-revision dependency read and its identifier rules. The machine answer
SHALL carry them once, as `trajectory.outline`: each served item's served
parents, the items whose parent row names an external item, a wisp or
another prefix, the items whose in-prefix parent is not served, and every
set of served items whose parent links form a cycle; or, when that read is
Unknown, the read's reason. An item SHALL sit under each served parent it
has, once per parent; under "parent outside this tracker" for a parent row
that names an external item, a wisp, another prefix or no target, and under
"parent not served" for an in-prefix parent the observation did not serve; under "no parent recorded" when it has none of
these; and, when the read is Unknown, every item SHALL sit under one
"parent Unknown" group that states the reason. A parent outside the tracker
or not served SHALL be counted and never named. Parent groups SHALL come
first in ascending parent id, then those four groups in that order, and
items in ascending id within a group; the page size counts positions, so
an item under two parents takes two, and the view SHALL state the position
total and that an item with several parents sits under each. A group's
heading SHALL name its parent with the parent's tracker status as recorded,
link to the parent's card and to the groups the parent itself sits under
(to that parent's card on its all-items page when it has no group in this
view),
state the group's whole count and its count on this page, and mark a group
split across pages at both ends with a link to the other page. A cycle
SHALL be stated once, with its members, in the group of its first member in
the grouped order; each other member's group SHALL link to that statement,
and the cycle SHALL NOT be followed. Element ids of parent groups and of the
four classes SHALL NOT collide, whatever an item's identifier. A closed parent with non-closed items, or the reverse, SHALL be
shown as recorded: no group states completion, progress or a percentage of
its parent (RFC8-15, RFC8-30). An item rendered twice on one page SHALL
carry its fragment target once. The rendered count SHALL count each item
once on the page. The governing-intent checkbox in POC-REQ-014 SHALL
narrow the visible cards of the default outline.

- **Scope.** the rendered scope statement against the full observed item
  set; the route's parameters, refusals and view links; the grouped view and
  `trajectory.outline`.

- **Case**: a checker loads Trajectory over a database whose total item
  count exceeds the rendered selection; then, over 640 items (three pages),
  loads the query-free outline, every page of the unnarrowed view, every
  status view, the governing-intent and recent-work views, a page
  recomputed from the machine answer, refused requests, and the links on
  the direct and the tailnet path.
- **Observable**: the surface states the selection rule, the rendered
  count, and the excluded count; each view's cards and counts; each
  refusal's status and reason; the links and their keyboard reach.
- **Oracle**: rendered count + excluded count equals the total count
  read directly from Dolt at the served revision; every served item appears
  on exactly one page of the unnarrowed view and of its status view, and the
  governing-intent pages hold exactly the items carrying that Unknown; a
  page's cards and counts equal the checker's own slice of
  `workItems.items` (filter, ascending id, page size); `type=bug`,
  `status=done`, `page=0`, `page=1.5` and a page past the last each return
  400 with that reason; the links equal the expected list on both paths and
  Tab reaches each. Arithmetic and equality decide.
- **Oracle independence**: the total comes from a direct database
  count; expected pages are the checker's own slices of the machine answer.
- **Falsifier**: a board whose counts do not reconcile with the
  database total, or no visible scope statement; a served item on no page
  or on two of an ungrouped view; a parameter outside the set ignored rather than refused; a
  view link missing, inside a collapsed element or unreachable by keyboard;
  or a page the machine answer cannot reproduce; in the grouped view, a
  non-closed item missing from a parent it has, a parent outside the tracker
  named, a cycle followed past its members, a group stating its parent's
  completion, a cycle stated twice, two elements sharing an id, or a split
  group unmarked.

#### Scenario: Bounded board over a large history

- **WHEN** the database holds 6,964 items and Trajectory renders a
  selection of 192
- **THEN** the surface states the selection rule and that 6,772 items
  are outside it, and the three numbers reconcile

#### Scenario: Items grouped under their parents

- **WHEN** a closed parent has two open items, one of them also sits under
  a second parent, two items are each other's parent, one item's parent is
  in another tracker and the reader opens Trajectory without parameters
- **THEN** the shared item appears under both parents with one fragment
  target, the closed parent is shown closed with its items' own statuses,
  the two-item cycle is stated once and not followed, the other tracker's
  parent is counted under "parent outside this tracker" and never named,
  and the groups' items equal the checker's own grouping of the machine
  answer. The explicit `group=parent&page=1` view gives the same groups
  and counts.

#### Scenario: Recent work remains reachable

- **WHEN** the reader follows the recent-work link from the outline
- **THEN** the recency rule selects the capped populations by their
  recorded instants in the same evaluation, and the linked default
  outline remains reachable by keyboard

#### Scenario: Every item reachable by state and page

- **WHEN** 640 items are served and the reader follows the view links
- **THEN** each item appears on exactly one page of the unnarrowed view
  and of its status view, every page states its scope and counts, and a
  parameter outside the declared set is refused with 400 and its reason

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2, VIS-3]
  contracts: [RFC2-6, RFC6-14, RFC6-16, RFC6-17, RFC6-22, RFC6-23, RFC8-15, RFC8-23, RFC8-30]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: [POC-REQ-014, POC-REQ-062]
```

### Requirement: POC-REQ-043 — Activity is never rendered as satisfaction

Group: Trajectory. Form: **prohibition**.

**Required behavior.** Trajectory SHALL NOT render work-item activity,
closure, or merge state as intent satisfaction or verification. No text in
the wording population (Scope) SHALL name tracker closure or a tracker claim
with the words done, complete, completed, finished, resolved, satisfied, in
progress or active: the closed column is headed "Closed" and the claimed
column "Claimed", and the worker-change state label says only what git
showed on the bounded seam. One notice above the board SHALL state how many
rendered items are closed and that verification is Unknown for each of
them, with its reason. Trajectory SHALL state the verification Unknown once
per board: one notice giving how many served items it holds for, how many of
those the selection renders and how many it leaves outside, each equal to
the machine answer (`trajectory.verificationUnknown`), with the reason
sentence and its route. Each rendered item SHALL keep its own verification
mark, carrying the Unknown encoding and closed reason and referring to that
notice; the reason sentence and route are not repeated per item.

- **Scope.** every satisfaction/verification encoding on the surface, and
  the wording population: the page heading and lede, every board heading
  and label, every worker-change label, every notice, and every
  `trajectory.rendered[].column` and status-to-column value on the machine
  answer. The card's own tracker status word and the worker-change state
  identifier are outside it.

- **Case (counterexample schema + sweep)**: a checker closes an
  observed item whose governing relationship holds no verification
  evidence, re-observes, and sweeps Trajectory's rendered encodings for
  that item — the denominator is that item's full rendered marker set.
- **Observable**: the item shows closed/merged state and the
  verification relationship stays visibly not-verified/Unknown.
- **Oracle**: the rendered verification encoding equals the machine
  answer's relationship state (not the item's activity state); equality
  decides. For wording, a case-folded, word-bounded match of
  `done|complete|completed|finished|resolved|satisfied|in[ _-]progress|active`
  over the wording population finds nothing, and the notice's closed count
  equals the machine answer's rendered items with status closed. For the
  board-level count, the notice's served, inside and outside figures equal
  `trajectory.verificationUnknown`; every rendered item carries exactly
  one verification mark whose reference resolves to that notice (the mark
  names the notice's subject and links to its element); and no rendered
  item's card contains the reason sentence or the route literal, each of
  which occurs once on the page.
- **Oracle independence**: the relationship state comes from the
  machine answer; the checker induced the mismatch.
- **Falsifier**: a closed or merged item rendered with a verified,
  satisfied, or green encoding while its relationship lacks evidence; or a
  heading, label, sentence or served column value in the wording
  population that names closure as done, complete, finished or resolved,
  or a claim as in progress or active; or a verification notice whose
  counts differ from the machine answer's, a rendered item with no
  verification mark or a mark referring to no notice, or a card that
  repeats the reason sentence or route.

#### Scenario: Closed but unverified

- **WHEN** an observed item is closed and no verification artifact has
  been ingested
- **THEN** Trajectory renders the closure as activity and the
  verification state as not verified/Unknown, distinctly encoded

#### Scenario: Closed is the tracker's word, not done

- **WHEN** the board renders closed and claimed items
- **THEN** their columns read "Closed" and "Claimed" on the page and on the
  machine answer, no heading, label or notice in the wording population
  reads done, complete, finished, resolved, in progress or active, and one
  notice above the board states the rendered closed count and that
  verification is Unknown for each of them

#### Scenario: Verification is Unknown once per board, with its count

- **WHEN** 252 items are served and the selection renders 250
- **THEN** one notice says verification is Unknown for 252 served items,
  250 in the selection and 2 outside it, with the reason and route, and
  each of the 250 cards carries one verification mark that refers to it
  and repeats neither the reason sentence nor the route

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2]
  contracts: [RFC1-19, RFC1-22, RFC1-23, RFC1-24, RFC2-20, RFC6-17, RFC8-2, RFC8-15, RFC8-24, RFC8-30]
  policies: []
  decisions: [POC-DIR-2026-08-29, POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-044 — Trajectory opens with its five answers

Group: Trajectory. Form: **state projection/query**.

**Required behavior.** Trajectory's first content, before its scope
statement, notices and board, SHALL be five answers in this fixed order,
one per question of the Trajectory row of `README.md`: what remains, what
is running, what changed, what it cost, and whether the result has been
verified against intent. Each answer SHALL be a fact with its count and
denominator over every served work item, never the rendered selection
(POC-REQ-042), or an explicit Unknown carrying its closed reason and route;
an answer whose value is Unknown SHALL be rendered, never dropped. The
machine answer SHALL carry the same five answers, in the same order, with
equal values (`trajectory.answers`). Today:

- *What remains* SHALL give the served items' count for every tracker
  status in the status vocabulary (POC-REQ-040), summing to the served
  total, and SHALL say that these are the tracker's items only, not
  checked against materialization records, and that RFC8-8's other two
  planes (approved claims no proposal covers; approved intent not yet
  materialized) are not enumerated.
- *What is running* SHALL give how many served items the tracker marks
  `in_progress`, worded as the tracker's claim, and their liveness as the
  state `activity-undetermined` while no staleness bound is declared
  (RFC8-16): state-local, carrying no RFC2-24 reason and no machine
  Unknown, with what resolves it.
- *What changed* SHALL be the tracker's net change between two named Dolt
  revisions, for three windows in this order: `day` and `week`, each from
  the newest commit in the observed revision's own history at or before
  the observation instant less 24 hours or 7 days, and `since-last`, from
  the previous evaluation's work-item revision. Every window SHALL end at
  the observed work-item revision, never a fresh head, and SHALL be read
  through the same read-only runner as the work items, by two statements
  naming only commit hash and date (`dolt_log`), commit hash and parent
  index (`dolt_commit_ancestors`), and item id, status and diff type
  (`dolt_diff` over `issues`). SEC-5 excludes titles, messages, committers
  and other free text. For an observed window the answer SHALL
  state both revisions with their recorded instants and count each changed
  item, ascending id, as exactly one of: added (a row the window start did
  not hold), closed (a status other than `closed` became `closed`),
  reopened (`closed` became another status), re-stated (another status
  change) or removed (a row the observed revision no longer holds); the
  counts SHALL sum to the listed items. A row whose status did not change
  SHALL be counted as updated without a status change and never listed, and
  a row outside the observed prefix SHALL be counted and never named. No
  window SHALL state a rate, a velocity, a verdict or a per-person figure,
  and a readable window with no change SHALL say it is an observed zero.
  A window SHALL be Unknown with its reason, never zero, when the work-item
  revision or the observation instant is unavailable, when a history read
  fails, returns another shape or does not confirm the observed revision,
  or when a returned instant is invalid, beyond its window bound for a
  start, or beyond the observation instant for the observed revision.
  Each of those cases makes every timed window Unknown. A window SHALL
  also be Unknown when the history holds no commit as old as the window
  bound, when the history between the window start and the observed
  revision holds a merge, when an ancestor of the start is dated after
  the bound, when a descendant of the start in the observed history is
  dated at or before the bound, or, for `since-last`, while no previous
  evaluation's revision is recorded. The
  machine answer SHALL carry every window with every changed item; the page
  SHALL show one window (the `changed` parameter of POC-REQ-042, `day` by
  default), link to the others with their counts, and list at most 250
  changed items, counting the rest. Every Unknown window SHALL be stated in
  one disclosure with each window's reason and the route, and every page
  SHALL show each Unknown window's reason and that disclosure, whichever
  window it selects.
- *What it cost* SHALL be an Unknown with its closed reason and route
  while no cost record is read (RFC8-19: absent cost is Unknown, never
  zero).
- *Verified against intent* SHALL give three separately labelled counts,
  each with its own denominator, and no element SHALL add any two of them:
  (a) Unknown-provenance, the served items with no traceable warrant, n of
  N, referring to POC-REQ-014's governing-intent disclosure; (b) the
  reconciliation chain, the count of materialized work items whose change
  is on the default branch, of the materialized work items, its members
  stated as "reconciliation evidence absent / Unknown" with their route
  (run a reconciliation evaluation) and no RFC2-24 reason, or an Unknown
  with its reason when the materialized item's change could not be
  observed; and (c) orphaned work among the served items, stated as not
  checked, its count an Unknown with its reason, never 0. The word
  "verified" SHALL NOT name a state among the answers.

When work items are not observed, all five answers SHALL render, each an
Unknown referring to the work-items disclosure, and no count SHALL appear.

- **Scope.** the answers region of Trajectory and `trajectory.answers` on
  the machine answer, and the history read behind the changed answer. The
  wider charter (what is planned, blocked, and why the work exists),
  orphaned-work detection, any reconciliation verdict, a record of the
  previous evaluation's revision, a join to commit subjects, and merge
  facts are outside it.

- **Case**: a checker serves 252 work items, of which the selection
  renders 250, and reads Trajectory and the machine answer; then repeats
  with a materialized item whose change is on the default branch, and with
  the work-item observation Unknown; then reads the changed answer over a
  history fixture holding each kind of change, a status-only update and an
  out-of-prefix row, over a history shorter than the week, over each
  failed or malformed history read, and with each `changed` value.
- **Observable**: five answers in order before the scope statement; the
  status counts, claimed count and three fifth-answer counts with their
  denominators; the liveness state; each Unknown part's reason and route.
- **Oracle**: the five question labels and the machine answer's ids
  equal the fixed order; each status count equals the count of served
  items with that status, they sum to the served total, and the closed
  count differs from the rendered Closed column when the selection leaves
  a closed item outside; the claimed count equals the served `in_progress`
  items, and the liveness state renders `activity-undetermined` with no
  Unknown encoding, reason or machine Unknown; each Unknown part carries a
  closed reason and a route and has a machine twin under its id
  (POC-REQ-060); every count and every denominator on the page equals the
  machine answer's; count (a) equals `workItems.governedByUnknownCount`;
  count (b) is 1 of 1 with a merged materialized item and 0 of 0 without
  one while (a) is unchanged; (c) renders Unknown, never a number; with
  work items Unknown, five answers render and none carries a count. For
  the changed answer: each fixture item is listed once under its kind,
  ascending id, the kind counts sum to the list, the status-only and
  out-of-prefix rows are counted and never listed, both revisions and the
  listed items equal the machine answer's, the history statements name no
  free-text column, a short history makes only that window Unknown, every
  failed or malformed read makes both timed windows Unknown, and
  `since-last` renders Unknown with its reason. Equality decides.
- **Oracle independence**: expected counts are the checker's own fixture
  rows, counted by the checker, never the renderer's model.
- **Falsifier**: an answer missing, out of order or dropped for being
  Unknown; a count taken over the rendered selection; status counts that
  do not sum to the served total; a running count worded as observed
  activity, or liveness rendered as `active` or under an RFC2-24 reason;
  a count shown without its denominator; an Unknown part with no reason
  or route; a change window rendered as zero when unread, ending anywhere
  but the observed revision, stating a rate or a per-person figure, naming
  a free-text column or an out-of-prefix item, or listing an item twice or
  under two kinds; an element adding two
  of the fifth answer's counts; orphaned work rendered as 0; a chain member
  stated under an RFC2-24 reason; or "verified" naming a state.

#### Scenario: Five answers before the board

- **WHEN** 252 work items are served and the selection renders 250
- **THEN** five answers render first, in order: the served count of each
  tracker status summing to 252, the tracker's claimed count with liveness
  `activity-undetermined`, what changed per window, what it cost as an
  Unknown with its reason and route, and three separate counts for verification against intent; the
  machine answer carries the same five with equal values

#### Scenario: A merged materialized item enters the chain

- **WHEN** the materialized work item's change is on the default branch
- **THEN** the reconciliation-chain count is 1 of 1, stated with
  "reconciliation evidence absent / Unknown" and its route, and the
  Unknown-provenance count is unchanged

#### Scenario: Work items not observed

- **WHEN** the work-item observation is Unknown
- **THEN** all five answers render, each an Unknown referring to the
  work-items disclosure, and no count appears

#### Scenario: What changed in the last day

- **WHEN** the tracker's history holds a commit older than a day and,
  between it and the observed revision, one item was added, one closed and
  one removed, one item was updated without a status change, and two
  out-of-prefix rows changed
- **THEN** the changed answer names both revisions with their instants,
  lists the three items with their kinds and statuses (3 changed: 1 added,
  1 closed, 1 removed), counts the update and the two outside rows without
  naming them, links the week and since-last windows with their counts,
  and the machine answer carries the same window with equal values

#### Scenario: A window the history cannot answer

- **WHEN** the history holds no commit as old as the week bound, or a
  history read fails
- **THEN** that window (or, for a failed read, every timed window) renders
  Unknown with its reason and the disclosure's route, never zero, and
  `since-last` renders Unknown while no previous evaluation's revision is
  recorded

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-2, VIS-3]
  contracts: [RFC2-2, RFC2-18, RFC2-19(a), RFC2-24, RFC6-17, RFC8-2, RFC8-8, RFC8-16, RFC8-19, RFC8-23, RFC8-28, RFC8-29]
  policies: []
  decisions: []
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-045 — Trajectory measures elapsed time over every served item

Group: Trajectory. Form: **state projection/query**.

**Required behavior.** Trajectory SHALL measure elapsed time over every
served work item, never the rendered selection (POC-REQ-042), as four
independent measures, each with its coverage, "n of m" items, stated beside
it: (1) lead time, closed items from created to closed instant; (2) age,
non-closed items from created instant to the observation's capture instant
(`workItems.capturedAt`), never a render-time clock (POC-REQ-041); (3)
arrivals per ISO 8601 week in UTC, by created instant; and (4) closures per
ISO 8601 week in UTC, by closed instant. Lead time and age SHALL be the
median and the 90th percentile by nearest rank, in whole hours rounded
down; with no item covered each SHALL be stated Unknown with its "0 of m"
coverage, never 0 (RFC8-19). An item whose needed instant is missing,
invalid, written without a timezone, after the capture instant, or
reversed (a closed instant before its created instant) SHALL be counted in
the denominator and not covered by any measure, never dropped. The weekly
series SHALL list every week from the first to the last covered event, at
most the last 104 of them, and state how many covered arrivals and
closures fall in earlier weeks; its chart and table SHALL state the
coverage they are counted over, so a week's 0 is read over the covered
items only.
The measures SHALL declare their source (the tracker's recorded instants)
and evidence class (observed), and no element SHALL combine two measures
into one number (RFC8-18). The page SHALL draw them as charts, one unit per
axis (counts per week; hours), each with a title, labelled axes and a text
alternative, using no script, and SHALL give every number a chart draws in
a table, each cell equal to the machine answer
(`trajectory.timeMeasures`). The cost answer (POC-REQ-044) SHALL stay
Unknown for every other cost and point at these measures.

- **Scope.** the elapsed-time region of Trajectory and
  `trajectory.timeMeasures`. Effort, compute, token, money and
  blocked-time costs, cycle time and any history of status changes are
  outside it.

- **Case**: a checker serves closed items with a 48-hour and a 12-hour
  lead time, a closed item with a timezone-less created instant, a closed
  item closed before it was created, and two open items 48 and 12 hours
  old at the capture instant, spanning ISO weeks 31 to 35 of 2026; it
  renders the page at two wall-clock times; separately it serves a closed
  item with no usable instants, and measures weeks across a year change and
  over a span longer than 104 weeks.
- **Observable**: the four measures, each with its covered and total
  counts; the weekly rows and the earlier-week counts; the two charts'
  titles, axis labels, text alternatives and marks; both renders' bytes.
- **Oracle**: lead time 2 of 4 covered, median 12 and p90 48 hours; age 2
  of 2, median 12 and p90 48; arrivals 5 of 6; closures 2 of 4; five weekly
  rows W31 to W35 with W33 and W34 at 0; each table cell, each bar's value
  and each week's hover title equals the machine answer, each line's point
  heights order as its weekly values, and a mutated cell or mark is named;
  with no usable instant, lead time renders "Unknown: 0 of 1 covered" and no
  0; the two renders are byte-equal; ISO week names equal the checker's own
  calendar (2027-01-01 is 2026-W53); a longer span lists 104 weeks and
  counts the earlier events. Equality decides.
- **Oracle independence**: expected values are computed by hand from the
  checker's fixture instants, and ISO weeks by an independent calendar,
  never by the module under test.
- **Falsifier**: a measure without its coverage; an uncovered item dropped
  from a denominator or counted as 0 hours; a measure with no covered item
  rendered as 0; an instant after the capture instant counted; an age
  measured to a render-time clock; a week missing between covered events,
  or an earlier event dropped; two units on one axis; a chart number absent
  from the tables or unequal to the machine answer; a composite of two
  measures; or cost rendered as known.

#### Scenario: Elapsed time with partial coverage

- **WHEN** four closed items are served, two with valid instants (48 and 12
  hours), one with a timezone-less created instant and one closed before it
  was created, and two open items 48 and 12 hours old at the capture instant
- **THEN** lead time is covered for 2 of 4, median 12 and p90 48 hours; age
  for 2 of 2, median 12 and p90 48 hours; and the tables equal the machine
  answer

#### Scenario: No covered item

- **WHEN** no closed item has valid created and closed instants
- **THEN** lead time is stated Unknown with 0 of its total covered, never
  0 hours

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-2, VIS-6]
  contracts: [RFC8-18, RFC8-19, RFC2-3, RFC6-22]
  policies: []
  decisions: []
  topology: []
  parent_requirements: [POC-REQ-041, POC-REQ-044]
```

### Requirement: POC-REQ-050 — Orrery projects declared mappings deterministically

Group: Orrery. Form: **state projection/query**.

**Required behavior.** WHEN Orrery is read, it SHALL render a spatial
projection of the observed code structure in which regions derive from the
directory structure and declared capability-to-path mappings, with a
deterministic layout per observation.

- **Case**: a checker loads Orrery twice over one observation and once
  over a second observation at the same revision.
- **Observable**: spatial regions correspond to observed directories
  and declared mappings; layout assignments repeat exactly.
- **Oracle**: per sampled region, the backing directory/mapping exists
  in the machine answer; and layout assignments are equal across
  renders of equal observations. Equality decides.
- **Oracle independence**: expected structure comes from the machine
  answer; layout comparison is a generic diff.
- **Falsifier**: a rendered region backed by no observed directory or
  declared mapping, or two renders of one observation with differing
  layouts.

#### Scenario: Stable city over one observation

- **WHEN** Orrery renders the same code-structure observation twice
- **THEN** every region's position and extent is identical, and every
  region resolves to an observed path or declared mapping

```yaml
warrants:
  primary: VIS-7
  doctrine: [VIS-3, VIS-6, VIS-7]
  contracts: [RFC1-16, RFC1-25, RFC4-26, RFC9-3, RFC9-4, RFC9-5, RFC9-9, RFC9-14, RFC9-17]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-051 — Unmapped code is a visible Unknown region with a denominator

Group: Orrery. Form: **invariant**.

**Required behavior.** Orrery SHALL render observed code outside every
declared mapping as an explicit unmapped/Unknown region, and SHALL state the
mapped and unmapped counts against the observed total.

- **Scope.** every observed file in the structure observation.

- **Case (sweep)**: a checker counts observed files directly from the
  machine answer, and reads Orrery's mapped/unmapped counts — the
  denominator is the observed file total.
- **Observable**: an explicit unmapped region with counts that
  reconcile.
- **Oracle**: mapped + unmapped equals the observed total; arithmetic
  over the exhausted file population decides.
- **Oracle independence**: the total is recomputed from the machine
  answer's inventory.
- **Falsifier**: observed files absent from both the mapped regions and
  the unmapped count, or no visible unmapped region when unmapped files
  exist.

#### Scenario: Partial mapping disclosed

- **WHEN** 1,240 files are observed and declared mappings cover 310
- **THEN** Orrery renders the mapped regions, an explicit Unknown
  region for the 930 unmapped files, and the counts reconcile to 1,240

```yaml
warrants:
  primary: VIS-2
  doctrine: [VIS-1, VIS-2]
  contracts: [RFC1-14, RFC2-6, RFC2-24, RFC4-27, RFC6-14, RFC6-17, RFC6-23, RFC9-5, RFC9-7, RFC9-24, RFC9-27, RFC9-29, RFC9-42, RFC9-43, RFC9-44]
  policies: []
  decisions: [POC-DIR-2026-08-29, POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-052 — Orrery never infers relationships

Group: Orrery. Form: **prohibition**.

**Required behavior.** Orrery SHALL NOT render an edge, adjacency, grouping,
or emphasis encoding a relationship the shared model does not hold.

- **Scope.** every relationship encoding the surface's legend declares.

- **Case (sweep)**: a checker enumerates every rendered relationship
  encoding per the legend — the denominator is the enumerated encoding
  population — and resolves each against the machine answer's
  relationship set.
- **Observable**: every encoded relationship exists in the model.
- **Oracle**: resolution per encoding over the exhausted population;
  zero unresolved encodings decides.
- **Oracle independence**: the relationship set comes from the machine
  answer.
- **Falsifier**: one rendered edge or declared-meaning adjacency with
  no backing model relationship.

#### Scenario: No proximity-invented edges

- **WHEN** two code regions are rendered adjacent for layout reasons
  only
- **THEN** no legend-declared relationship encoding connects them, and
  every rendered edge resolves to a model relationship

```yaml
warrants:
  primary: VIS-1
  doctrine: [VIS-1, VIS-2, VIS-6]
  contracts: [RFC1-16, RFC1-25, RFC1-26, RFC4-26, RFC9-3]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-053 — Every Orrery entity resolves to its exact route

Group: Orrery. Form: **invariant**.

**Required behavior.** Every entity Orrery renders SHALL link to the same
entity route the exact tables serve, so the spatial view and the exact view
are two projections of one graph.

- **Scope.** all interactive entity elements on the surface.

- **Case (sweep)**: a checker enumerates every interactive entity
  element — the denominator is that population — and follows each link.
- **Observable**: each link resolves to the entity's exact
  representation.
- **Oracle**: HTTP/anchor resolution per enumerated element; zero
  dangling links over the exhausted population decides.
- **Oracle independence**: the route table comes from the served exact
  view, not Orrery's code.
- **Falsifier**: one spatial entity whose link is dangling or resolves
  to a different entity.

#### Scenario: Spatial and exact agree

- **WHEN** Orrery renders K interactive entities
- **THEN** all K links resolve to the matching exact-table routes, and
  the check reports K as its denominator

```yaml
warrants:
  primary: VIS-3
  doctrine: [VIS-1, VIS-3]
  contracts: [RFC1-26, RFC6-20, RFC9-3, RFC9-46, RFC9-48]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

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

- **Scope.** every relationship in the machine answer, and every rendered
  element on any surface that marks a relationship.

- **Case (sweep)**: a checker enumerates every relationship in the
  machine answer — the denominators are that population and its distinct
  kinds — and, for each, checks its kind against a copy of RFC1-25's
  relation names and its source and target kinds, mapped through the
  declared correspondence, against the set of role pairs the table
  assigns that relation; it loads each surface and extracts every
  rendered element carrying a declared relationship marker — the
  denominator is the complete marker population, which the check counts
  and reports — and checks every flagged relationship for a non-empty
  reason in the machine answer and in every element that marks it.
- **Observable**: every relationship is a closed relation name in a role
  pair the table assigns it, or is flagged with a reason in the machine
  answer and in every rendered element that marks it.
- **Oracle**: per-relationship membership-or-flag over the exhausted
  population, and per-element reason presence over the exhausted marker
  population. Zero unflagged relationships whose kind is outside the
  table, zero unflagged relationships whose mapped role pair the table
  does not assign that relation, zero flagged relationships whose kind
  and mapped role pair the table assigns, and zero flagged relationships
  answered without their reason or marked by a rendered element that
  carries no reason decide.
- **Oracle independence**: the relation names and each relation's set of
  role pairs are literals transcribed from RFC1-25's table, and the
  kind-to-class correspondence is a checked-in declaration; none is
  imported from the model. The marker population is read from served
  output.
- **Falsifier**: an unflagged relationship whose kind is outside
  RFC1-25's table, an unflagged closed name in a role pair the table does
  not assign it (reversed roles included), a flag on a relationship whose
  kind and mapped role pair the table assigns, or a flagged relationship
  answered without its reason or marked by a rendered element that
  carries no reason.

#### Scenario: A kind outside the closed table is disclosed

- **WHEN** the shared model emits a relationship whose kind has no
  counterpart in RFC1-25's closed table
- **THEN** the machine answer and every rendered element that marks the
  relationship carry its outside-closed-vocabulary flag and reason, and
  the check reports the number of relationships, of distinct kinds and of
  relationship markers as its denominators

```yaml
warrants:
  primary: VIS-1
  doctrine: [VIS-1, VIS-7]
  contracts: [RFC1-25, RFC1-26]
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
  names it — the denominator is that marker population, which the check
  counts and reports.
- **Observable**: identical states render with identical declared
  encodings on every surface, and the table's three label entries are
  pairwise distinct; every entity and relationship carries exactly one
  record, in the closed-vocabulary shape; an Inferred record names the
  agent assertion it arises from, is absent from every Observed total,
  leaves every Unknown entity and relationship record Unknown, and
  renders with the table's Inferred entry in every element that marks
  it.
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
  reason with its route) and zero breached Inferred limbs decide.
- **Oracle independence**: the declared table and the closed RFC2-24 and
  RFC2-25 lists are expected values written as literals; the sweep reads
  served output and the machine answer.
- **Falsifier**: one surface encoding Unknown (or Observed, or Inferred)
  differently from the declared table, or a surface styling epistemic
  state ad hoc; a declared table giving two of the three labels one
  entry; an entity or relationship with no epistemic record or with more
  than one; a record with no label, a tier outside its parent label, a
  reason outside the twelve or an Unknown with no route; or an Inferred
  record counted in an Observed total, clearing an Unknown, naming no
  agent assertion, or marked by a rendered element whose encoding is not
  the declared Inferred entry.

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

### Requirement: POC-REQ-061 — The accessibility floor holds on every surface

Group: Cross-cutting experience. Form: **invariant**.

**Required behavior.** Every surface SHALL be navigable by keyboard with
visible focus, SHALL meet WCAG AA contrast for text and epistemic encodings,
SHALL respect reduced-motion preferences, and SHALL carry legends whose text
matches every visual encoding in use.

- **Scope.** all interactive elements, text/encoding color pairs, animated
  behaviors, and legend-declared encodings on the three surfaces.

- **Case (sweep)**: a checker runs keyboard traversal, automated
  contrast measurement over the enumerated color pairs,
  reduced-motion-preference rendering, and a legend-to-encoding
  comparison; each sweep reports its denominator.
- **Observable**: full traversal reaches every interactive element with
  visible focus; measured pairs meet AA; animations are absent under
  reduced motion; every legend entry matches a live encoding and vice
  versa.
- **Oracle**: per-sweep pass over its exhausted population; measured
  ratios and element counts decide.
- **Oracle independence**: contrast is measured from served styles by a
  generic tool; the legend comparison reads served output.
- **Falsifier**: an unreachable interactive element, a failing measured
  pair, an animation surviving reduced-motion preference, or a legend
  entry matching no rendered encoding.

#### Scenario: Keyboard-only reading

- **WHEN** a keyboard-only reader traverses each surface
- **THEN** every interactive element is reachable with visible focus,
  in an order that follows the surface's reading structure

```yaml
warrants:
  primary: VIS-3
  doctrine: [VIS-1, VIS-3]
  contracts: [RFC7-34, RFC8-31, RFC9-48]
  policies: []
  decisions: [POC-DIR-2026-08-30]
  topology: []
  parent_requirements: []
```

### Requirement: POC-REQ-062 — Trajectory derives eligibility from revision-bound dependencies

Group: Trajectory. Form: **state projection/query**.

**Required behavior.** The POC SHALL observe the work items' dependency metadata at the exact Dolt revision of its work-item observation and use that same evaluation to derive Trajectory eligibility. The work-item statement SHALL read from the same committed revision it identifies, including when the selected work-item set is empty. It retains the seven existing observation columns. With no valid observed work-item revision, the POC SHALL skip the dependency statement. One read-only statement SHALL bind `dependencies AS OF` to the captured revision and restrict the dependent `issue_id` to the observed bead prefix. Its dependency data columns SHALL be `issue_id`, `depends_on_issue_id`, `type`, and only null-presence booleans for `depends_on_external` and `depends_on_wisp_id`.

The dependency statement SHALL return exactly one distinguishable revision witness from Dolt resolving the same immutable revision as the table read, including when there are no dependency rows. The reader SHALL verify the witness before accepting the data. A request value echoed by the caller, a missing, extra or invalid witness, a mismatched revision, an unreadable response or an unexpected result shape makes the dependency observation unavailable. A valid witness with no edge rows makes the dependency set observed empty. The work-item observation and its substrate statuses retain their own epistemic states and their one served provenance record under POC-REQ-010.

The dependent is `issue_id` and the target is `depends_on_issue_id`. The closed recognized edge types are `blocks`, `parent-child`, `discovered-from`, `related`, `relates-to` and `tracks`. Count their rows by type. Only `blocks` derives an eligibility fact; `parent-child` rows derive only the parent facts POC-REQ-042's grouped view reads, under the same identifier rules. Count unlisted types in a separate total using a fixed diagnostic reason. Withhold their raw type values. Count external, wisp and out-of-prefix targets without rendering source values. A target may appear as a blocker identifier only when it passes the existing observed prefix check and exactly matches a served work item at that revision. The output shall disclose no additional tracker strings. Unreadable query output, new columns, titles, descriptions, notes, metadata values and external-reference text never enter either channel.

For an observed dependency feed, a known blocker is the served target of a `blocks` edge whose observed tracker status is other than `closed`, where the row has neither the external nor the wisp flag. Deduplicate blocker identifiers. An unlisted edge type, external or wisp blocker, out-of-prefix blocker, or absent blocker status makes the applicable item's eligibility undetermined. Use a fixed reason for each applicable failure class and stable reason ordering if several apply. Count these rows even where their targets or raw types are withheld. A row with an unidentifiable dependent or a malformed input that prevents reliable row accounting makes the feed unavailable. No malformed record can create an observed-empty or ready result.

Apply this table in row order. “Undetermined” is the exact state `eligibility-undetermined`.

| Dependency observation | Observed tracker status | Derived eligibility |
|---|---|---|
| Any | `closed` | Absent |
| Feed unavailable | `open`, `blocked`, `deferred`, `in_progress`, `pinned`, `hooked` | Undetermined with a fixed feed reason, with the observed tracker status still shown |
| Feed observed | `in_progress`, `pinned`, `hooked` | Absent |
| Feed observed with unresolved item-local edge | `open`, `blocked`, `deferred` | Undetermined with the applicable fixed row reasons, with the observed tracker status still shown |
| Feed observed with settled item-local edges | `deferred` | `planned`, with the tracker-deferred reason |
| Feed observed with settled item-local edges | `blocked` | `blocked`, with the cause set below |
| Feed observed with settled item-local edges | `open` | `blocked` if the known blocker set is nonempty, otherwise `ready` |

A derived `blocked` result and an observed tracker `blocked` status each require cause disclosure. The resolved cause set contains `dependency` exactly when the known blocker set is nonempty. A separate unresolved row can leave whole eligibility undetermined while a known blocker and its cause remain observed. The empty set has the explicit cause-Unknown display. The other RFC8-17 causes have no derivation in this slice. Neither a raw tracker status nor an epistemic absence licenses an inferred dependency. No status derives a recommendation or numeric score.

On Trajectory, each card SHALL show the derived eligibility where present, and any fixed reason. A card with a derived blocked result or a tracker `blocked` status SHALL show its cause set or cause-Unknown, and each of its known blocker identifiers SHALL link to its existing work-item card via the paging rules of POC-REQ-042. Links SHALL work without client script from the default and narrowed views on the direct and tailnet paths. Trajectory SHALL declare the served non-closed denominator, each of the four eligibility counts, and the count of records with absent eligibility so those figures reconcile. It SHALL likewise disclose dependency rows observed, each recognized type's count, unlisted type rows, and external, wisp, and out-of-prefix target counts. One dependency row may contribute to more than one target-withholding count. When the feed is unavailable the edge counts SHALL be unavailable with the fixed reason, preserving the observed work-item denominator. The machine answer SHALL carry the same facts and link identities from the one shared model.

- **Scope.** An identified work-item evaluation and its same-revision dependency metadata, every served item's state, and the displayed totals and links over that exact population. No live tracker readiness call, source-body read, changed default selection, or derivation of PR, external-event or decision causes enters this slice.
- **Case (fixture, counterexamples and sweep).** An independent checker supplies fixed work statuses and dependency rows at a captured revision A. A distinct revision B carries different rows. The checker exercises the complete table, witnessed empty, witnessed and unwitnessed refusal cases, unsupported types, missing/foreign targets, a known and a withheld blocker on the same item, and dependency read failure. The checker reads both channels, including a blocker on another page, and sweeps every relevant card and board count.
- **Observable.** Fixed-column queries, source-returned revision witness, classified edge totals, four eligibility counts and absent count, item-local reasons, blocked-cause set, exact blocker card targets, and unchanged epistemic status for the work-item observation.
- **Oracle.** Literal fixture expectations independently classify every included row and every served status, compare the complete wire counts and card outcomes, follow every blocker link, and check query shape, one exact source revision, and no dependency read when that revision cannot be established. A changed-only revision B may not affect results from A. Captured metadata values not admitted by the output alternatives are absent from both wire forms.
- **Oracle independence.** The fixture fixes expected status, reason, count, blocker and link-case literals without importing the derivation or rendering implementation. It separately holds the refused-reader calls, inactive shared-model output shape, and expected fixture identities.
- **Falsifier.** A derived ready result without trustworthy same-revision input, any exported undisclosed raw target or type, wrong membership, an assumed blocked cause, wrong state or card link, drift between channels, or a denominator that does not reconcile.

#### Scenario: Complete revision with a known blocker and a ready item

- **WHEN** captured revision A has one open dependent with an open served blocker, one with only a closed target, and another revision B changes both edges
- **THEN** A's first item is blocked with only the dependency cause and the open target's link, the second is ready, and B's rows do not change the A output

#### Scenario: Observed empty and unavailable dependencies

- **WHEN** no dependency rows return with one source-resolved witness A, and separate otherwise equal work-item evaluations get an empty response with no witness, an empty response witnessed at B, a nonempty response witnessed at B or an unreadable response
- **THEN** only the witnessed empty A has observed zero edges and a ready open item. Each refusal preserves the observed tracker status, gives every non-closed item eligibility-undetermined with a fixed feed reason and withholds edge totals

#### Scenario: Missing work-item revision prevents dependency observation

- **WHEN** the work-item reader cannot establish a valid source revision
- **THEN** no dependency statement runs and neither channel presents observed eligibility

#### Scenario: A blocked card retains a known cause alongside an unsettled edge

- **WHEN** a tracker-blocked item has one unflagged `blocks` edge to a served item with observed open status and a second `blocks` edge with an external or wisp indicator even though its target identifier looks like a served item
- **THEN** both channels show eligibility-undetermined with the closed row reason, disclose the single known blocker's link and `dependency` cause, and count the second edge without disclosing its identifier as a blocker

#### Scenario: Unsettled edge metadata is counted without disclosing input strings

- **WHEN** known items have unlisted edge types or blocking rows whose targets are external, wisps, out of the observed prefix or absent from the work-item observation
- **THEN** the board and machine count the classified rows, show eligibility-undetermined with fixed reasons on the applicable items, and disclose none of those source strings or false blocker links

#### Scenario: Planned, blocked without cause, and statuses outside derived eligibility

- **WHEN** a complete settled feed includes a deferred item, a tracker-blocked item without a known unfinished target, and in-progress, pinned, hooked and closed items
- **THEN** the deferred item is planned with its tracker reason, the blocked item has an empty cause set with visible cause-Unknown, and the in-progress, pinned, hooked and closed items have no derived eligibility

#### Scenario: Blocker reaches its card across pages

- **WHEN** the blocked item and its known blocker are served on different pages and a reader follows the blocker link with scripts disabled
- **THEN** the direct and tailnet forms both reach the exact blocker card outside a collapsed element, and the machine carries the equal blocker identity and target page

```yaml
warrants:
  primary: RFC8-13
  doctrine: [VIS-2, VIS-4, SEC-5]
  contracts: [RFC2-2, RFC4-15, RFC6-18, RFC8-13, RFC8-17]
  policies: []
  decisions: []
  topology: []
  parent_requirements: [POC-REQ-010, POC-REQ-012, POC-REQ-013, POC-REQ-020, POC-REQ-040, POC-REQ-042]
```
