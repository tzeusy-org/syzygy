# Polaris edit and repair accounting semantic delta

[Observed] The
[adopted project-understanding requirement](../polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md#requirement-independent-review-and-repair)
governs readiness, independent evidence, review invalidation and
repair. On protected main `ab171ab9b9591c0721a92ef817ee0ec0fd4f63c3`, its
complete REQ-polaris-generation-006 has SHA-256
`6398ff65c50d7bf6a7fe763f4f03f85c8abb63f6ffb8757f512596582b3cbf0b`
and matches the corresponding block in the
[adopted subject](../../../.syzygy/governance/decisions/POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION-ACT.md).
It has five scenarios and no obligation to account for each input block
through an edit or repair stage.

The [proposed complete replacement](proposed/polaris-generation/spec.md)
adds the following clause. The current requirement has no corresponding
clause.

> Every generator edit or repair stage SHALL account for each block in its own
> input draft exactly once with an action and a reason. A retained block is
> kept or rewritten. An input identity that is absent from the output SHALL
> be accounted for as removed or as split into two or more distinct blocks
> present in the output and identified in its account. A repair stage SHALL
> give each finding it received a disposition, including findings it cannot
> repair. An unrepairable finding remains visible and retains its effect on
> readiness under this requirement.

The replacement reproduces the full existing requirement, including its
five scenarios, source, scope and warrants. It inserts the new scenario
“Edit or repair drops a prior block without account” before verification.
The [September candidate](../../../.syzygy/governance/contracts/candidates/polaris-edit-repair-deletion-scenario/proposed/spec.md.patch)
named both split and removed actions. Its scenario required a removal
action for any absent identity. The proposed scenario gives a reasoned
removal and an accounted split distinct outcomes. It names the existing
readiness effect for an unrepairable finding.

[Inferred] The change is semantic. It adds a stage acceptance predicate,
and preserves the existing readiness predicate. Adoption needs one new
complete replacement in the current versioned composition. The counter's
current effective assertion and the product requirement reader must
agree on that replacement. The two historic source files and their
recorded bindings remain prior inputs. The earlier candidate status
patch references its historical scenario census. Updating the current
census belongs with activated composition.
