# Dossier figure walks — version 2.40

[Inferred] Agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It was drafted and reviewed over figure plan 2.33 with the placeholders `2.NN`, `vSS` and `vBB`, and is rebuilt for adoption over import facts 2.39 as version 2.40, schema v16 and brief v24, with one rule added, the base-element step (`design.md` D1, D10); no review has read the repaired bytes or the rebuild. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule; no write to a repository the owner does not own; no network exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.32 asks that a section may declare a walk: ordered steps, each tying a cited paragraph to elements of a figure. The figure shows numbered badges; choosing a step highlights its element by CSS `:target`, with no script; each node label links to the lines it cites; and the walk is also the figure's text alternative. Its exclusions: hover and focus highlighting and edge-label links (syzygy-3efd.34), excerpts and code walks (syzygy-3efd.33).
- [Observed] REQ-034 version 2.33 (and every version since, to 2.39) draws graph figures as inert SVG and lists every component and relationship, with its citation links, in a collapsible list beneath the figure. Nothing ties a paragraph to the box it explains, so a reader moves between prose and picture by matching labels, and the cited lines sit one disclosure and one link away from the box.
- [Inferred] A numbered walk gives the figure a reading order the prose already has, and a link on each box puts the evidence one step from the picture, without a script and without a byte of the drawing changing.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v16`: schema v15 plus an optional `walk` on a section or deep dive, at most one per place, `{"figure", "steps": [{"element", "block"}, ...]}`:
  - the figure is a graph-kind diagram homed in that place, so no figure is walked twice;
  - 2 to 12 steps; each names one element the figure draws (for a view, an element of its expansion; for a view with a `base`, a base element it shows, named by a base end `{"map", "path"}`), each element once;
  - each step's block is one of the place's own paragraphs (or a subsection's), never inside a presentation element or a subsection's answer, and carries a citation, which may be withheld at render;
  - a walk is presentation: no claim, label or citation of its own, and it enters no count, ledger, `machine.json` or fidelity entry.
- Findings (repair findings): `walk` for a malformed walk, a figure homed elsewhere or of a non-graph kind, an element not drawn or named twice, a block that is not the place's paragraph or cites nothing; `unresolved-reference` for a figure that names nothing; `field-version` for `walk` in schema v15 and earlier. A finding about a base-end step names the step by its index, never by the path the draft wrote.
- Render, with no script and only where the figure renders as a drawing that is not 1048 px wide:
  - the drawing, byte for byte, is wrapped with an HTML layer of one box per node at the layout's coordinates;
  - a step's box carries a fragment id and a numbered badge, and the stylesheet outlines the box that is the page's `:target`;
  - a base element's box takes the id, the badge and the highlight and no link, since a base element has no citation;
  - each box whose element is not withheld and has a linked citation carries a link, named "<label>: cited lines", to where its first citation's link lands, the cited lines of the source page; for an element a later view shares with an earlier one (2.24), the link is the first figure's citation link, re-addressed from this page;
  - an ordered list after the drawing links each step to its box and to its paragraph by the `block-<id>` fragment the paragraph already carries: an ordered reading of the figure in words;
  - every id the walk adds is unique on its page, and no paragraph or drawing byte changes.
- Brief `polaris-dossier-brief-v24`: brief v23 plus one paragraph offering the walk, placed after brief v23's computed-map paragraph.
- In the predecessor text, the brief-version list and the accepted-schema list are extended. Thirteen scenarios are added (twelve reviewed, one for the base-element step) and four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] This change leaves out:
- hover and focus highlighting, and links on edge labels (syzygy-3efd.34);
- excerpts beside a step, and walks through code (syzygy-3efd.33);
- a step naming several elements: the bead's "elements of a figure" is narrowed to one element per step, since one box takes one number and one highlight; several steps may name one paragraph instead;
- more than one walk in a place;
- walks over a drawing 1048 px wide, the one width 2.2 lets shrink;
- walks through the overview's figures, or through sequence, swimlane, containment and the other non-graph kinds (`design.md` D3);
- any change to the SVG or to the inertness check: the layer is HTML beside it;
- any script in a rendered page, and any change to the provider mode or its golden;
- a new counted reader standard.
