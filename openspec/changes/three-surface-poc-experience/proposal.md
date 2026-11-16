# Proposal — three-surface-poc-experience

The bounded POC serves the configured Butlers repository through three honest
surfaces over one shared fact model:

- **Polaris** — a long-form account of project intent.
- **Trajectory** — a work-item board over the project's Beads Dolt database.
- **Orrery** — a spatial projection of observed code structure.

Every Unknown stays visible. Every positive claim retains resolvable
provenance. This is a non-release proof of concept, never a claim of product
completion or conformance.

## Why

The first POC established the truth-bearing spine but presented three list
panels and exact tables on one page.

- **What already worked:** one shared model, human/machine parity, epistemic
  labels and provenance.
- **What the redesign adds:** distinct surface experiences, code-structure and
  work-item observations, and a client-rendering seam that preserves the same
  truth.
- **Why this specification exists:** those additions decide what each surface
  may claim, which sources it may observe, and how failures remain Unknown.
  Building them from prose direction alone would leave observable behavior
  unspecified.

The owner's 2026-08-30 authoring and redesign directions are the warrant for
this specification. Adoption and implementation authority live in their
recorded acts; this proposal does not restate their lifecycle state.

## Capability

`three-surface-poc-experience` is one coherent capability: a redesigned,
owner-readable POC over the configured Butlers repository, with one acceptance
decision under SDR-37.

- **New observations:** exact-revision code structure and revision-stamped
  work items from Dolt.
- **New presentation:** three surfaces sharing one design language and one
  fact model.
- **Preserved floor:** parity, epistemic honesty and provenance from the
  existing POC spine.
- **Unchanged authority:** Capability 1's adopted behavior is not modified.

## Scope

- **Observe Butlers code structure.** Read metadata, sizes, language
  classifications and digests at one exact Git revision. Never index file
  contents.
- **Observe Butlers work.** Read the registered bead-prefix population from
  the Butlers Beads Dolt database and record the exact Dolt revision.
- **Render one shared model.** Client-enhanced facts remain identical to the
  machine answer and to the script-less exact routes.
- **Present three surfaces.** Polaris explains intent; Trajectory presents
  work and recorded time; Orrery projects code structure deterministically.
- **Apply one accessibility floor.** Keyboard use, text alternatives, contrast,
  reduced motion and truthful legends apply across all three surfaces.

### Non-goals

- Production release or deployment.
- Any project beyond the configured Butlers repository, or a general
  multi-repository product.
- A general 3D engine or repository-wide semantic indexing.
- Inferred mappings, edges or missing intent.
- Writes to the configured Butlers repository.
- Autonomous behavior or multi-user support.
- Any change to Capability 1's adopted behavior.

## Known Unknowns

The work-item/test-evidence/live-runtime relationships stay Unknown until their
existing POC work lands authoritative artifacts. Production reachability of the
configured Butlers repository also remains Unknown. This specification does
not turn missing
evidence into an empty or successful state.

## Amendment — governing intent on every work item

This amendment adds POC-REQ-014: every served work item carries a
governing-intent field, and under this specification its value is always
Unknown with the reason `source-uncaptured-or-unreachable` and that reason's
route. Both channels count those items over the served set. Trajectory shows
that count beside how many of the items its bounded selection (POC-REQ-042)
holds and how many fall outside it, says each is resolved by supplying its
warrant, marks every item it renders with the Unknown encoding, and lets a
reader narrow the board to them, as RFC8-23 requires of work with no
traceable warrant. Nothing served ever takes a governing intent from a title,
so the non-goal above against inferred edges and intent stands unchanged.

The amendment admits no new work-item column or other input, and it defines
no edge to a warrant. Which input, if any, may carry a warrant into the POC is
an open owner question, recorded as P-100 in
`.syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md`; whatever the
answer, the edge itself needs a further amendment. In `CONTRACT-COVERAGE.md`,
RFC8-22, RFC8-23 and RFC8-24 move from Part B2 to Part A, because a
requirement now covers one of their consequences, and each limb no
requirement observes has its own Unknown amendment row. RFC8-21, the chain
those three clauses sit in, moves from Part B2 to Part B1: the POC now renders
the chain's first link, so the clause applies, but no requirement walks the
chain.

## Amendment — one relation vocabulary, one epistemic record shape

The owner's ruling of 2026-09-21 (P-75) directed an amendment against this
specification alone. This amendment carries two of its parts.

- **POC-REQ-055** requires every relationship to carry a name from
  RFC1-25's closed table, in a role pair the table assigns it, or a flag
  saying it is outside that table.
- **POC-REQ-060** is amended in place to carry one epistemic record shape on
  every entity and relationship, and the Inferred label.

Inferred enters as a typed landing zone with no production constructor
(ruling P-75 Q4). This amendment does not make the arm constructible in
production; that needs its own owner act. Until then no Inferred record,
including an inferred edge, is produced, so the non-goal above against
inferred mappings, edges or intent stands unchanged. In
`CONTRACT-COVERAGE.md` the one signed row the ruling names is preserved
unedited beside the amendment rows that supersede it, and RFC2-25 moves from
Part B2 to Part A because a requirement now covers one of its consequences.
A subject identity shared across the surfaces, and a per-claim view of the
desired, execution and observed states, are not specified here.

## Acceptance inputs

- `CONTRACT-COVERAGE.md` carries the clause-consequence review input and its
  unresolved owner judgments. The author mints no N/A decision: every
  uncovered consequence remains Unknown until an effective owner act says
  otherwise.
- `GOVERNING-DEPENDENCIES.md` is generated from every requirement's warrants.
- The behavioral specification contains the falsifiable requirements and
  scenarios. These supporting views do not replace it.


## Amendment — observation-local governing-intent value (P-115)

The machine answer serves POC-REQ-014's identical complete Unknown once per
identified work-item observation and a closed local reference on each item.
This changes the physical wire representation, preserving every logical
claim, item identity, complete served population, count, reason, route,
warrant-remediation statement, rendered selection and human Unknown encoding.
Invalid references refuse the answer explicitly; they never borrow a prior
value or turn absence into zero. The reference is lexical to its enclosing
observation, not an inferred relationship or a new source input.

Out of scope: warrant capture/linking or title interpretation; any new read,
provider, work-item column, input or consent; entity/relationship record
pooling or identity changes; POC-REQ-060 record-shape expansion; new reason,
tier, edge or orphaned-work detection; smaller machine populations; human
layout, copy, controls or filtering changes; response-ceiling/policy changes;
release, deployment and implementation authorization. Earlier open questions
and disclosures remain exactly as their signed predecessors record them.
