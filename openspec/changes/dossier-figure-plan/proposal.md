# Dossier figure plan — version 2.NN

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. The version label 2.NN is a placeholder, chosen at adoption after a fresh check of tags and agent branches (`design.md` D1). It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule; no write to a repository the owner does not own; no network exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.40 (pursuit 2026-11-21 Q12, slice 1): "The author writes a figure plan before the prose: for each page, the one question a picture answers better than text, and the kind it needs. check advises when a figure carries too little information (a chain of three or fewer is a sentence), duplicates another, or mixes levels." Its exclusions: "advice in this slice, no gate; the page-type table is syzygy-3efd.41." Its first acceptance criterion: "A draft's figure plan validates and each planned figure is matched to a figure or a reasoned omission."
- [Observed] REQ-034 version 2.24 asks for diagrams and checks each one's form, home, kind and fit, but nothing asks the author why a figure is there, and nothing tells the author when a figure says what a sentence would, repeats another, or puts a part beside a part of itself.
- [Inferred] Planning the pictures before the prose puts each figure where it answers a question, and three exact, advisory predicates catch the three commonest ways a figure wastes the reader's attention without overruling the author.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v13`: a required top-level `figurePlan`, one entry for the overview, each section and each deep dive:
  - a planned figure, `{"home", "question", "kind", "figure"}`, naming the diagram that answers the question, homed there and of that kind; or
  - `{"home", "omitted"}`, why the place has no planned figure.
- Findings (repair findings, so a draft with one does not proceed to review):
  - `figure-plan` for a missing or non-list plan, a malformed entry, a place planned twice, a place left unplanned, and a planned figure homed elsewhere or of another kind;
  - `unresolved-reference` for a place or figure that names nothing;
  - `field-version` for `figurePlan` in schema v12 and earlier.
- Advice, on check's report alone as `figureAdvice`, gating nothing:
  - `figure-information-floor`: a graph of at most three nodes and at most one edge fewer than its nodes, a swimlane of at most three steps, a sequence of at most two messages, a containment of at most three groups;
  - `figure-duplicate`: a figure every key of which (boxes, arrows, steps and nestings, by normalised label) another figure of its family also draws;
  - `figure-mixed-levels`: a graph or containment figure holding an element X that encloses another, Y, by `unit` or as its model ancestor by `parent`, where no chain of `contains` edges leads from X to Y (graph) or Y is not drawn inside X (containment).
  - Each rule reads a view's expansion, the figure version 2.24 renders; a plan entry names the diagram that carries the view.
- The plan renders nowhere and no rendered byte moves.
- Brief `polaris-dossier-brief-v19`: brief v18 plus one paragraph, issuing schema v13.
- In the predecessor text, the brief-version list and the accepted-schema list are extended. Eleven scenarios are added and the four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] This change leaves out:
- the page-type table and a required view per page type (syzygy-3efd.41);
- any gate on a figure's content: the three rules advise only;
- rendering the plan, or any reader-facing text from it;
- a new figure kind; the containment kind of version 2.23 is planned and advised on like any other (`design.md` D1, D6);
- a new counted reader standard or a new version of `polaris-reader-standards-v1` (`design.md` D5);
- any change to the provider mode or its golden;
- any script in a rendered page.
