# Dossier test-name recognizers

[Inferred] This amendment succeeds REQ-polaris-generation-034 v2.40 (the figure walks, syzygy-3efd.32). It adds four lexical test-name recognizers (`pytest-test-name`, `js-test-call`, `go-test-function`, `junit-test-method`, each version 1), the render's `testNames` member mapped to units by rule `top-level-unit`, the reference page `reference/test-names.html` with a per-unit table, and the machine view's `testNames` member, all in the operator-agent mode. Specification version 2.42 binds through its agent adoption row and the annotated tag `polaris-dossier-test-names-v2.42`.

The full requirement is in [the proposed specification](proposed/polaris-generation/spec.md). [SEMANTIC-DELTA.md](SEMANTIC-DELTA.md) accounts for the change and its reversal. [GOVERNING-DEPENDENCIES.json](GOVERNING-DEPENDENCIES.json) repeats only the requirement's warrant union. The fixtures, mutation runs and before/after record are under `docs/evidence/syzygy-5dhm-45/`.

- [Proposal](proposal.md)
- [Design](design.md)
- [Delivery tasks](tasks.md)
