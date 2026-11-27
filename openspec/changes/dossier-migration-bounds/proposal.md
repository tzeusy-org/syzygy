# Dossier migration bounds — version 2.43

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over test-name recognizers 2.42 (design D1; first built over figure walks 2.40 as 2.41).

## Why

- [Observed] syzygy-3efd.87, found by review R37 F2 of the syzygy-3efd.37 code: the 2.24 parity claim, as 2.38 narrowed it, says check passes the v12 migration of every v10 or v11 draft that check passes.
  - The v12 model holds zero to 200 elements and zero to 400 relationships.
  - The v10 and v11 schemas bound each diagram, not the draft, so a draft check passes may hold more nodes and groups than that.
  - A v11 draft of 222 nodes across six graphs passes check, and its migration draws `$.model.elements: must hold 0 to 200 items; holds 222` (the reviewer's probe).
- [Inferred] The bounds are right for a model the reader is meant to take in whole. So the claim narrows, and the bounds stay.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- The parity sentence covers only a draft whose migrated model fits the v12 bounds.
- A new passage states the arithmetic: the model holds one element per node and group and one relationship per edge, since no identity merges and a nesting becomes a `parent`. So the draft fits where its nodes and groups number at most 200 and its edges at most 400.
- A draft check passes that exceeds either total migrates to a draft check refuses with a `schema` finding at `$.model.elements` or `$.model.relationships`, and no parity is stated for it.
- One scenario is added: "A migrated model past the v12 bounds keeps no parity". The four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] The following are left out:
- raising the v12 model bounds (design D2, option (b));
- any change to the migration's output, a schema, the brief, a finding, a check record or a rendered byte.
