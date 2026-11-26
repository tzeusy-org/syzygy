# Account for edits and repairs in Polaris generation

**Status** Version 2.25 was adopted in [agent adoption A-208](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md).
This version replaces REQ-polaris-generation-006 in the effective Polaris
specification. The versioned preamble identifies the adopted subject.
The requirement and its six scenarios keep the reviewed candidate text.

[Observed] The [P-73 direction](../../../.syzygy/governance/decisions/POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md)
holds generator slice 4 until its deletion-accounting scenario is adopted.
The [September candidate](../../../.syzygy/governance/contracts/candidates/polaris-edit-repair-deletion-scenario/SEMANTIC-DELTA.md)
proposed an explicit account of each edited or removed block. Its companion
status patch was written for the 177-scenario composition.

The [proposed replacement](proposed/polaris-generation/spec.md) preserves
the predecessor’s five scenarios and adds a sixth. Every input block has an
account. A removed block and an input block replaced by a split can be
distinguished. A repair can return its input unchanged and disclose the
findings it could not repair.

Version 2.25 changes the generator's edit and repair requirement.
Implementation of slice 4 is tracked by syzygy-dov.6.3.
