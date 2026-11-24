# Account for edits and repairs in Polaris generation

**Status** Candidate for syzygy-dov.23. The governing requirement remains
the adopted project-understanding amendment.

[Observed] The [P-73 direction](../../../.syzygy/governance/decisions/POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md)
holds generator slice 4 until its deletion-accounting scenario is adopted.
The [September candidate](../../../.syzygy/governance/contracts/candidates/polaris-edit-repair-deletion-scenario/SEMANTIC-DELTA.md)
proposed an explicit account of each edited or removed block. Its companion
status patch was written for the 177-scenario composition.

The [proposed replacement](proposed/polaris-generation/spec.md) preserves
the five current scenarios and adds a sixth. Every input block has an
account. A removed block and an input block replaced by a split can be
distinguished. A repair can return its input unchanged and disclose the
findings it could not repair.

The candidate changes only the generator's edit/repair requirement.
Adoption and current composition are a separate versioned change. Slice
4 is tracked by syzygy-dov.6.3 and follows that adoption.
