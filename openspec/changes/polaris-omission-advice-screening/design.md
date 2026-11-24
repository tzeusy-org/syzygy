# Omission advice report projection

[Inferred] The coverage comparator first computes matches, coverage totals, and the three ordered, distinct omission lists. The report projection then invokes the existing secret detector of the bound screening policy for each identifier that would be emitted in those lists. It adds one to the list's count for each matched identifier and emits every other list member in the order established by the comparator. The paired counter and visible length account for each list. One identifier can contribute to more than one list's counter.

The `compared` report exposes the three counts as `omissions.withheld`, including numeric zeros where appropriate. With `state: "unknown"`, the already-defined reason and note describe the unavailable comparison. The report encoder applies the withholding rule after the existing outcome and inventory comparison are determined. The existing detector applies to an identifier as a string under the bound policy.

[Observed] The governing contract is REQ-polaris-generation-034 in the [effective system model](../dossier-system-model/proposed/polaris-generation/spec.md#requirement-agent-brief-and-mechanically-checked-draft). VIS-4 and SEC-5 govern this semantic tightening. It adds an output restriction using the bound detector.
