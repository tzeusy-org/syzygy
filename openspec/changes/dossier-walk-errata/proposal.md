# Dossier walk errata — version 2.53

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over walk advice 2.51 (design D1).

## Why

- [Observed] The independent code review of the figure walks (syzygy-3efd.88, `docs/reviews/syzygy-3efd-88/R88-CODE-REVIEW-RAW.md`, `REVISE`) recorded two places where the 2.40 text and the shipped code differ. The dispositions left both for a later spec change:
  - note 3: the brief v24 paragraph in the spec writes a backslash before each of its twelve quotation marks, while the brief issues bare quotation marks, as every earlier brief paragraph the spec quotes does. The spec and the brief differ by 12 bytes, and nothing records why;
  - note 10: the spec asks the stylesheet to outline a box under the pointer, so every box takes the pointer, and on a walked figure the drawing's own per-node `<title>` tooltip no longer shows. The walks design disclosed only the hover emphasis.
- [Observed] syzygy-3efd.90 asks for the brief text to be corrected or its reading stated, and for the tooltip loss to be either accepted and stated, or narrowed to the walked boxes with the code following.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- The brief v24 paragraph is quoted with bare quotation marks, byte-equal to `WALK_PARAGRAPH` in `packages/polaris-dossier/src/brief.ts`. One sentence records that 2.40 to 2.51 wrote an escape that no brief issued.
- One sentence after the walk rendering paragraph states the following:
  - every box of a walk's layer takes the pointer, so a walked figure's drawing shows no per-node tooltip under it;
  - why that trade-off is kept;
  - where the tooltip's label and marking stay visible;
  - that a figure with no walk keeps its tooltips.
- No scenario is added: the brief paragraph and the walk style rules are already pinned by literal tests (design D3).

## Non-goals

[Inferred] The following are left out:
- narrowing the pointer to the walked boxes, or to boxes with content (design D2 says why);
- a tooltip of the layer's own, such as a `title` on each box or link;
- any brief, draft schema or page byte;
- the other R88 residuals (the 1048-px scenario, the unreachable link arm, the browser test's scripts), which are test-harness matters and not statements of the spec.
