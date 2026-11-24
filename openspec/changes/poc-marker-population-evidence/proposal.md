# Three-Surface POC marker population evidence

Candidate for independent review under CC-REV-2 and CC-REV-4.

## Intent

[Observed] P-108 review note 13 identified that a declared rendering-marker
population may be empty or chosen by the implementation. The signed
selection carried that concern to `syzygy-nw3o`. The current
POC-REQ-055 and POC-REQ-060 oracles report marker denominators and decide
by zero violations. Under VIS-2, a rendering claim needs current evidence
before a sweep can support it.
[Review note](../../../docs/reviews/R-M9-POC-VOCABULARY-EPISTEMIC-AMENDMENT-2-RAW.md#finding-13--an-empty-or-implementation-chosen-marker-population-passes-both-rendering-limbs-at-a-reported-zero-note),
[P-108 signed selection](../../../.syzygy/governance/decisions/THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md),
[VIS-2](../../../.syzygy/governance/doctrine/vision.md).

The proposed requirements make an undeclared or empty marker-dependent
sweep report Unknown, with its reason and resolution route. A fixed fixture
checks independently chosen nonempty marker occurrences. Scope is confined
to the two marker-dependent rendering checks and their evidence reports.
The existing `syzygy-dov.9.3` acceptance condition continues to govern its
signed implementation package.
[Current requirement blocks](../three-surface-poc-experience/specs/three-surface-poc-experience/spec.md),
[P-108 implementation direction](../../../.syzygy/governance/decisions/OWNER-DIRECTION-P108-IMPLEMENTATION-2026-10-21.md).

## Deliverables

- [Complete candidate requirements](proposed/three-surface-poc-experience/spec.md)
- [Semantic delta and adoption dependencies](SEMANTIC-DELTA.md)
- [Scope and oracle design](design.md)

Only a separately recorded adoption under VIS-4 can make this candidate
effective. This package is the draft for that later decision.
