# M9 identity amendment prerequisites

This decision resolves the deferred M9 questions recorded in `syzygy-vk3f`.
It sets the order and scope for a fresh Three-Surface POC identity amendment.
VIS-4 assigns that decision to agents. The governing selection rules are
RFC6-1, RFC6-3 and RFC6-12, which require a durable identity, equivalent
resolution across surfaces and a surface-independent selection URL.
[VIS-4](../../.syzygy/governance/doctrine/vision.md) ·
[Selection contract](../../.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md)

## D1. Establish source attribution before drafting the identity requirement

[Observed] The parked P-84 review history exposed a missing input for the
identity oracle. The P-108 packet records 13 identity-requirement findings,
seven at revise level. It names two unanswered questions: which source record
a rendered subject belongs to, and what identity that record declares.
[P-108 deferred scope](../../.syzygy/governance/contracts/candidates/three-surface-poc-vocabulary-epistemic-amendment/OWNER-DECISION-PACKET.md#deferred-scope)

[Observed] On main at `2a1ef3e8e5f4ba404184143079af52b226bff94a`, a
`PocEntity` carries an ID and an array of provenance records. The
`region:unmapped-code` seed has one rendered subject ID. Its description
covers the region outside two manually mapped files. The seed supplies an
example where naming the displayed subject still leaves attribution to source
records open. RFC6-1 excludes file paths and surface-local handles from durable
selection identity. [Entity model](../../packages/three-surface-poc-core/src/model.ts) ·
[Seed records](../../packages/three-surface-poc-core/src/poc-seeds.ts) ·
[RFC6-1](../../.syzygy/governance/contracts/rfcs/RFC-0006-cross-surface-selection-query-drawer.md)

[Inferred] Take D1's evidence-first arm. First land the slice 6a evidence
delivery on main under its own implementation adoption. That delivery needs
a declared per-source identifier and reviewed attribution rules for direct,
seeded and many-record subjects. Draft the replacement for POC-REQ-054 over
those landed, reviewed inputs. Their declaration gives the independent test
oracle its expected identities across Polaris, Trajectory and Orrery. Render
Unknown with a reason wherever the truth of an input remains unestablished.
This decision sets the sequence. The evidence delivery needs its own adoption,
and slice 6b awaits the later identity amendment and implementation authority.

The first evidence review should cover the same durable subject across
surfaces, a rename or relocation, and a seeded many-record subject. It should
also exercise a missing mapping, two incompatible mappings and a mapping to
another evaluation. Require the case data to identify the expected selection
or the Unknown reason. A declaration only counts as evidence for its recorded
evaluation and scope. [Evidence and warrant rules](../../.syzygy/governance/doctrine/trust-and-evidence.md)

[Unknown] The admissible source field and the attribution rule for composite
subjects remain inputs for the evidence work. The parked candidate's renderer
markers alone cannot establish them. The gate in `syzygy-aa49` tracks the
evidence, reviewed specification and implementation authority.

## D2. Specify the ribbon over the same identity join

[Inferred] Include the ribbon, selection equivalence and links into Orrery in
the same POC identity amendment. The ribbon fills a slot from a subject
resolved by the declared join. A separate ribbon proposal would have to make
the same attribution choice without the shared selection scenarios. The
candidate should require an Unknown result with a reason whenever it cannot
resolve a subject, and verify the ribbon at the one-capability scale named in
the M9 direction. [P-108 deferred scope](../../.syzygy/governance/contracts/candidates/three-surface-poc-vocabulary-epistemic-amendment/OWNER-DECISION-PACKET.md#deferred-scope) ·
[M9 design](POLARIS-M9-ONE-IDENTITY-FUNNEL.md)

## D3 and D4. Apply the recorded implementation and package boundaries

- [Observed] D3 is settled for P-108 by the 2026-10-21 implementation
  direction. It authorizes slices 4a, 4b and 8 within that signed package.
  The later identity package and its implementation authority gate slices 5,
  6b and 7. [P-108 implementation direction](../../.syzygy/governance/decisions/OWNER-DIRECTION-P108-IMPLEMENTATION-2026-10-21.md)
- [Observed] D4 is recorded by the 2026-10-14 direction to park P-84 and
  redraft a smaller package. P-108 is that redraft for relationship
  vocabulary and epistemic record shape. The current decision sequences a
  fresh identity package for the remaining POC consequences. [P-84 direction](../../.syzygy/governance/decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md)
