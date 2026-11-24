# Rendering marker evidence

## Declared scope and independent expected occurrences

The checker reads rendered output from every served region named in the
checked-in oracle declaration. Each declaration names the regions and their
qualifying marker attributes. A fixed fixture also records expected
multiplicities by region, marker attribute and served identifier, using
literals chosen independently of the renderer and the sweep. That
comparison detects both deleted markers and replacements that leave the
count unchanged. Repeated occurrences of the same record in a region count
with their multiplicity.

POC-REQ-055 examines the declared relationship markers and the reasons on
those marking flagged relationships. Its fixed fixture includes such a
flagged marked occurrence. POC-REQ-060 examines the declared record markers
for the Inferred fixture record and verifies their token encodings. The
scope includes the existing per-row markers where those rows are served.
Each requirement continues to define the machine-side checks separately.
[Current POC requirement blocks](../three-surface-poc-experience/specs/three-surface-poc-experience/spec.md),
[Existing table markers](../../../apps/three-surface-poc/src/exact-tables.ts),
[Signed fixture condition](../../../.syzygy/governance/decisions/OWNER-DIRECTION-P108-IMPLEMENTATION-2026-10-21.md).

## Interpreting a count

An undeclared scope yields `missing-declaration` and a resolution route to
record the applicable scope. A complete observation of a declared scope can
measure zero. That count accompanies the `missing-evidence` rendering
outcome and a route to capture suitable marker evidence. A fixed nonempty
fixture also fails its independent occurrence comparison in that case.
The report carries separate machine-side outcomes and rendering evidence.
[VIS-2](../../../.syzygy/governance/doctrine/vision.md),
[RFC2-24](../../../.syzygy/governance/contracts/rfcs/RFC-0002/rendering-vocabularies.md).

The proposal concerns already declared markers and their evidence. Any
later adoption uses the existing scope and review rules for shared-model
work. Selection of a conformance harness and its implementation belongs to
that later work.
