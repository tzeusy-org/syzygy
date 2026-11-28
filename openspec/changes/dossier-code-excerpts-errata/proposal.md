# Dossier code excerpts errata — version 2.56

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over view levels errata 2.55 (design D1).

## Why

- [Observed] The .33 code lane implemented the code excerpts of version 2.54 (PR #1060). Its review (`docs/reviews/syzygy-3efd-33/R33-CODE-REVIEW-RAW.md`) and dispositions (`R33-CODE-REVIEW-DISPOSITIONS.md`) left six points of the text for an erratum. Bead syzygy-3efd.94 lists them:
  - the range condition read as a gloss on the range findings;
  - no place for a `schema` finding at the lists in the finding order;
  - silence on `range-beyond-blob`;
  - a band read as "the topmost element" where the excerpt's text lies above it;
  - no stated line bound;
  - and an absent path, where the range findings are never drawn, so the range alone decides.
- [Observed] The CI repair of PR #1060 (a band misaligned at 390 px under the hosted font) showed the scenario's "the same top and height as the line" is ambiguous between the line box and the glyph box. The engine splits the half-leading unevenly, so a number's glyph box is offset from its line box. The code and test measure the line box (design D5).

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- the v18 schema paragraph states the 10,000,000 bound on a highlight's and a note's lines (design D6);
- the repair findings paragraph reads the range condition on its own and says an absent path is skipped by its range alone (D2); places an excerpt's `schema` findings first in its group and reports them whatever its range, and says which positions hold an excerpt (D3); and says a `range-beyond-blob` finding skips none of the checks (D4);
- the browser scenario measures bands and numbers against their lines' line boxes and reads "topmost" as the topmost element painting a background (D5);
- the malformed-lists scenario gains the absent-path case (D2).

REQ-034 keeps 349 scenarios.

## Non-goals

[Inferred] Left out:
- any brief, draft schema, page byte or code: each statement is what the code already does;
- the R33 code-review findings that the dispositions settled with a code change (the misplaced `kind: "code"` object, test coverage), except where the text was also silent (D3).
