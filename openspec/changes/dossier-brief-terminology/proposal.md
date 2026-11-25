# State terminology IDs in the author brief

## Why

[Observed] A-217 REQ-polaris-generation-034 v2.26 fixes the issued author brief at v19 and draft schema v13. A-303 makes existing glossary identifiers readable as titles and preserves their first-use links. The issued v19 brief tells the author to supply terminology but leaves the spelling implicit.

## Change

[Inferred] Amend REQ-polaris-generation-034 in full. Issue the author brief as v20 with one new paragraph under the understanding record. The paragraph specifies one item per term, reader spelling, one underscore per space, preserved case and hyphens, and the omission of comma-separated entries and the `u-` prefix. Use `append-only_file` and `AOF` as examples. When the transformed reader spelling cannot satisfy the inherited handle grammar, choose a valid ID and keep the exact reader term in the existing `statement`; for example, `io` for “I/O.”

[Inferred] Carry draft schema v13, existing draft ID acceptance, Index and glossary behavior, and provider rendering under their current rules. The new paragraph guides the author. It adds no field, validator rule or access to source or evidence. REQ-polaris-generation-033 v2.27 continues to own the question-file sources and held-out boundary, and the current version of REQ-polaris-generation-035 continues to own review packets.
