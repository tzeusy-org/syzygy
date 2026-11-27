# Dossier rough-edge markers

[Inferred] This amendment succeeds REQ-polaris-generation-034 v2.42 (the test-name recognizers, syzygy-5dhm.45, A-337). It adds recognizer `rough-edge-marker` version 1 (TODO, FIXME, HACK, deprecation markers and issue references, read lexically, each pattern published in the requirement), the render's `roughEdges` member mapped to units by rule `top-level-unit`, the reference page `reference/rough-edges.html` with a per-unit table and a "What is going away" section, and the machine view's `roughEdges` member, all in the operator-agent mode. Specification version 2.43 binds through its agent adoption row and the annotated tag `polaris-dossier-rough-edges-v2.43`.

The full requirement is in [the proposed specification](proposed/polaris-generation/spec.md). [SEMANTIC-DELTA.md](SEMANTIC-DELTA.md) accounts for the change and its reversal. [GOVERNING-DEPENDENCIES.json](GOVERNING-DEPENDENCIES.json) repeats only the requirement's warrant union. The fixtures, mutation runs and before/after record are under `docs/evidence/syzygy-5dhm-46/`.

- [Proposal](proposal.md)
- [Design](design.md)
- [Delivery tasks](tasks.md)
